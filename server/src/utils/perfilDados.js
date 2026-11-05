import EstatisticaJogador from '../models/EstatisticaJogador.js';
import { METRICAS, RADARES, NOME_GRUPO } from './metricasWyscout.js';

export const MIN_MINUTOS = 450; // gate p/ entrar no cálculo de percentis
export const MIN_AMOSTRA = 8; // nº mínimo de pares para o percentil ser fiável

function percentil(valor, valores, invertido) {
  if (valor == null || !valores.length) return null;
  const n = valores.length;
  const abaixo = valores.filter((v) => (invertido ? v >= valor : v <= valor)).length;
  return Math.round((abaixo / n) * 100);
}

// Perfis de dados de um jogador (um por competição/época), com radar + percentis
// calculados vs os pares da mesma posição. Partilhado pela rota e pelo relatório.
export async function perfilDeDados(jogadorId) {
  const doMeu = await EstatisticaJogador.find({ jogador: jogadorId }).lean();
  if (!doMeu.length) return [];

  doMeu.sort((a, b) => (b.minutos || 0) - (a.minutos || 0));
  const vistos = new Set();
  const perfis = [];

  for (const linha of doMeu) {
    const chaveCE = linha.competicao + '|' + linha.epoca;
    if (vistos.has(chaveCE)) continue;
    vistos.add(chaveCE);

    const grupo = linha.grupoPosicao;
    const eixosKeys = RADARES[grupo];
    if (!grupo || !eixosKeys) continue;

    const pares = await EstatisticaJogador.find({
      competicao: linha.competicao,
      epoca: linha.epoca,
      grupoPosicao: grupo,
      minutos: { $gte: MIN_MINUTOS },
    })
      .select('metricas')
      .lean();

    const eixos = eixosKeys.map((k) => {
      const meta = METRICAS[k] || {};
      const valor = linha.metricas?.[k] ?? null;
      const valores = pares.map((p) => p.metricas?.[k]).filter((v) => typeof v === 'number');
      const media = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
      return {
        key: k,
        label: meta.label || k,
        fmt: meta.fmt || 'per90',
        invertido: !!meta.invertido,
        valor,
        percentil: percentil(valor, valores, meta.invertido),
        media,
        mediaPercentil: percentil(media, valores, meta.invertido),
      };
    });

    perfis.push({
      competicao: linha.competicao,
      epoca: linha.epoca,
      grupo,
      nomeGrupo: NOME_GRUPO[grupo] || grupo,
      posicaoOriginal: linha.posicaoOriginal,
      minutos: linha.minutos,
      jogos: linha.jogos,
      amostra: pares.length,
      amostraFraca: pares.length < MIN_AMOSTRA,
      minutosFracos: (linha.minutos || 0) < MIN_MINUTOS,
      bio: {
        idade: linha.idade,
        valorMercado: linha.valorMercado,
        contratoTermina: linha.contratoTermina,
        pe: linha.pe,
        altura: linha.altura,
      },
      eixos,
    });
  }

  return perfis;
}
