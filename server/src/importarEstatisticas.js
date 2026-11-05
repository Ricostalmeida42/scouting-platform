import 'dotenv/config';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { connectDB } from './config/db.js';
import Player from './models/Player.js';
import EstatisticaJogador from './models/EstatisticaJogador.js';
import { norm, COLUNAS, METRICAS, grupoDaPosicao } from './utils/metricasWyscout.js';

// Importa um export Wyscout (xlsx/csv) para a coleção EstatisticaJogador.
//
// Uso:
//   node src/importarEstatisticas.js "<ficheiro.xlsx>" "<competição>" "<época>"
// Ex.:
//   node src/importarEstatisticas.js "C:/.../cp.xlsx" "Campeonato de Portugal" "2026/27"
//
// SUBSTITUI os dados existentes dessa competição+época. Nunca cria jogadores.

function toNum(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function tokens(s) {
  return norm(s).split(' ').filter((t) => t.length > 0);
}

// Tenta associar um nome do CSV a um jogador da plataforma (lista de candidatos).
// Confiante quando: apelido (último token ≥3) bate E (nome próprio bate OU inicial
// bate) E o nome do CSV não tem vários tokens significativos ausentes no jogador.
function associar(nomeCsv, jogadores) {
  const tk = tokens(nomeCsv);
  if (tk.length < 2) return null;
  const apelido = tk[tk.length - 1];
  const primeiro = tk[0];
  const candidatos = jogadores.filter((j) => {
    if (!j._tk.includes(apelido) || apelido.length < 3) return false;
    const bateNome = primeiro.length >= 3 ? j._tk.includes(primeiro) : j._tk.some((t) => t[0] === primeiro[0]);
    if (!bateNome) return false;
    // Evita falsos positivos de nomes compostos (ex.: "H. Ferreira Torres Costa e
    // Silva" a casar com "Hélder Silva" só por inicial + apelido): rejeita se o nome
    // do CSV tiver 2+ tokens significativos (≥3) que NÃO estão no jogador, além do
    // apelido já emparelhado. É um sinal de que é outra pessoa (apelido comum).
    const extra = tk.filter((t) => t.length >= 3 && t !== apelido && !j._tk.includes(t));
    if (extra.length >= 2) return false;
    return true;
  });
  return candidatos.length === 1 ? candidatos[0] : null; // só se não for ambíguo
}

async function run() {
  const [, , ficheiro, competicao, epoca] = process.argv;
  if (!ficheiro || !competicao || !epoca) {
    console.error('\nUso: node src/importarEstatisticas.js "<ficheiro>" "<competição>" "<época>"\n');
    process.exit(1);
  }

  const wb = XLSX.readFile(ficheiro);
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
  if (!linhas.length) {
    console.error('Ficheiro sem linhas.');
    process.exit(1);
  }

  // header original → chave normalizada
  const headerNorm = {};
  for (const h of Object.keys(linhas[0])) headerNorm[h] = norm(h);
  // chave normalizada → header original (primeira ocorrência)
  const porNorm = {};
  for (const [h, n] of Object.entries(headerNorm)) if (!(n in porNorm)) porNorm[n] = h;

  // campo interno → header original
  const campoHeader = {};
  const emFalta = [];
  for (const [campo, colNorm] of Object.entries(COLUNAS)) {
    if (porNorm[colNorm]) campoHeader[campo] = porNorm[colNorm];
    else emFalta.push(`${campo} (${colNorm})`);
  }
  if (emFalta.length) console.warn('[aviso] colunas não encontradas:', emFalta.join(' · '));

  const val = (linha, campo) => (campoHeader[campo] ? linha[campoHeader[campo]] : null);

  // Detetar escala das percentagens (Wyscout dá 0-100; se vier 0-1, multiplicar).
  const amostraPct = linhas.map((l) => toNum(val(l, 'passesCertosPct'))).filter((x) => x != null);
  const maxPct = Math.max(0, ...amostraPct);
  const escalaPct = maxPct > 0 && maxPct <= 1.5 ? 100 : 1;

  await connectDB(process.env.MONGODB_URI);

  // jogadores da plataforma (não-plantel) para associação
  const jogadores = await Player.find({ doPlantel: { $ne: true } })
    .select('nomeCompleto dadosChaves')
    .lean();
  jogadores.forEach((j) => (j._tk = tokens(j.nomeCompleto)));
  // associações MANUAIS (chave "nome|equipa" → jogador) têm prioridade
  const porChave = new Map();
  jogadores.forEach((j) => (j.dadosChaves || []).forEach((c) => porChave.set(c, j)));
  const chaveDe = (nome, equipa) => norm(nome) + '|' + norm(equipa);

  const chavesMetricas = Object.keys(METRICAS).filter((k) => k !== 'deltaXG' && k !== 'deltaXA');

  const docs = [];
  let associados = 0;
  const pares = [];
  for (const l of linhas) {
    const nome = val(l, 'nome');
    if (!nome) continue;
    const grupoPosicao = grupoDaPosicao(val(l, 'posicaoOriginal'));

    const metricas = {};
    for (const k of chavesMetricas) {
      if (!(k in COLUNAS)) continue;
      let n = toNum(val(l, k));
      if (n != null && METRICAS[k]?.fmt === 'pct') n *= escalaPct;
      if (n != null) metricas[k] = n;
    }
    // derivadas
    if (metricas.golos90 != null && metricas.xG90 != null) metricas.deltaXG = +(metricas.golos90 - metricas.xG90).toFixed(3);
    if (metricas.assist90 != null && metricas.xA90 != null) metricas.deltaXA = +(metricas.assist90 - metricas.xA90).toFixed(3);

    const equipa = val(l, 'equipa') || '';
    // 1º a associação manual (chave nome|equipa); senão o fuzzy por nome
    const manual = porChave.get(chaveDe(nome, equipa));
    const jogador = manual || associar(nome, jogadores);
    if (jogador) {
      associados++;
      pares.push(`${nome} → ${jogador.nomeCompleto}${manual ? ' (manual)' : ''}`);
    }

    docs.push({
      jogador: jogador ? jogador._id : null,
      nome: String(nome).trim(),
      equipa,
      chave: chaveDe(nome, equipa),
      competicao,
      epoca,
      posicaoOriginal: val(l, 'posicaoOriginal') || '',
      grupoPosicao,
      minutos: toNum(val(l, 'minutos')) || 0,
      jogos: toNum(val(l, 'jogos')) || 0,
      idade: toNum(val(l, 'idade')),
      valorMercado: toNum(val(l, 'valorMercado')),
      contratoTermina: val(l, 'contratoTermina') || null,
      nacionalidade: val(l, 'nacionalidade') || null,
      pe: val(l, 'pe') || null,
      altura: toNum(val(l, 'altura')),
      peso: toNum(val(l, 'peso')),
      emprestado: val(l, 'emprestado') || null,
      metricas,
    });
  }

  // substituir os dados desta competição+época
  await EstatisticaJogador.deleteMany({ competicao, epoca });
  await EstatisticaJogador.insertMany(docs);

  console.log(`\n[estatísticas] ${competicao} · ${epoca}`);
  console.log(`  Linhas importadas:        ${docs.length}`);
  console.log(`  Escala de % detetada:     ${escalaPct === 100 ? '0-1 → convertido p/ 0-100' : '0-100 (ok)'}`);
  console.log(`  Associados aos teus:      ${associados}`);
  if (pares.length) {
    console.log('  Pares (confirma se batem certo):');
    pares.forEach((p) => console.log('    ·', p));
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[estatísticas] Erro:', err.message);
  process.exit(1);
});
