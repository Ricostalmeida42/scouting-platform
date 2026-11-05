// Vocabulário e helpers partilhados no frontend (espelha server/src/constants.js).
import { CATALOGO_POSICAO } from './grelhaPosicao.js';

// Clube próprio (configurável pelo .env do cliente: VITE_CLUBE). Usado nos títulos e na
// deteção do clube nas classificações/calendário.
export const CLUBE_PROPRIO = import.meta.env.VITE_CLUBE || 'FC Exemplo';
export const CLUBE_PROPRIO_TOKEN = CLUBE_PROPRIO.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

export const POSICOES = [
  { key: 'GR', label: 'GR — Guarda-redes', curto: 'GR' },
  { key: 'DD', label: 'DD — Defesa direito', curto: 'DD' },
  { key: 'DC', label: 'DC — Defesa central', curto: 'DC' },
  { key: 'DE', label: 'DE — Defesa esquerdo', curto: 'DE' },
  { key: 'MDF', label: 'MDF — Médio defensivo', curto: 'MDF' },
  { key: 'MC', label: 'MC — Médio centro', curto: 'MC' },
  { key: 'MOF', label: 'MOF — Médio ofensivo', curto: 'MOF' },
  { key: 'EE', label: 'EE — Extremo esquerdo', curto: 'EE' },
  { key: 'ED', label: 'ED — Extremo direito', curto: 'ED' },
  { key: 'PL', label: 'PL — Ponta de lança', curto: 'PL' },
];

// Situação no plantel — não confundir com scouting de recrutamento.
export const ESTADOS_PLANTEL = ['Titular', 'Rotação', 'Suplente', 'Lesionado', 'Emprestado'];

export function classeBadgePlantel(e) {
  if (e === 'Titular') return 'badge--prioridade';
  if (e === 'Rotação') return 'badge--shortlist';
  if (e === 'Lesionado') return 'badge--arquivo';
  if (e === 'Emprestado') return 'badge--observacao';
  return 'badge--prospecao';
}

export const PRIORIDADES = ['A', 'B', 'C'];

// Estatutos do PLANEAMENTO do plantel (aba Planeamento). null = sem alteração.
export const PLANO_ESTATUTOS = [
  { key: 'priority', label: 'Prioridade', cor: '#1a73e8' },
  { key: 'potencial', label: 'Potencial', cor: '#16a34a' },
  { key: 'emprestar', label: 'Possível saída', cor: '#dc2626' },
];
export const planoDe = (k) => PLANO_ESTATUTOS.find((e) => e.key === k) || null;
export const planoCor = (k) => planoDe(k)?.cor || null;

// Tiers da estrutura idealizada do plantel (2ª dimensão, ao lado do campo).
// alvoMin/alvoMax = nº-alvo de jogadores por tier. nota = metas de salário/minutos.
export const PLANO_TIERS = [
  { key: 'A', nome: 'Top', faixa: '1–5', alvoMin: 1, alvoMax: 5, cor: '#1f2a44', nota: 'Topo do teto salarial · 80%+ minutos' },
  { key: 'B', nome: 'Core', faixa: '6–11', alvoMin: 6, alvoMax: 11, cor: '#2e6b5e', nota: 'Salário Y–Z · 60%+ minutos' },
  { key: 'C', nome: 'Back-Up', faixa: '12–16', alvoMin: 12, alvoMax: 16, cor: '#8a6d2f', nota: 'Salário X–Y · 35%+ minutos' },
  { key: 'D', nome: 'Jovens', faixa: '17+', alvoMin: 17, alvoMax: null, cor: '#3f6690', nota: 'Até X salário · até 25% minutos' },
];
export const tierDe = (k) => PLANO_TIERS.find((t) => t.key === k) || null;
export const PRIORIDADE_LIGA = ['Alta', 'Média', 'Baixa'];

export const RELACAO_CLUBE = ['Interesse', 'Contacto estabelecido', 'Parceria', 'Neutro'];

// CRM de rede de contactos (scouting local)
export const TIPOS_CONTACTO = ['Treinador', 'Dirigente', 'Coord. formação', 'Scout/olheiro', 'Agente', 'Jornalista', 'Outro'];
export const FAVOR_ESTADOS = ['Em dia', 'Devo-lhe', 'Deve-me'];

export const ESTADO_AGENDAMENTO = ['Planeado', 'Concluído', 'Cancelado'];

export const DIMENSOES_AVALIACAO = [
  { key: 'tecnica', label: 'Técnica', peso: 20 },
  { key: 'tatica', label: 'Tática', peso: 20 },
  { key: 'fisica', label: 'Física', peso: 15 },
  { key: 'mental', label: 'Mental', peso: 20 },
];

// Classificações do cabeçalho do relatório (substituem Potencial/Prontidão).
export const RENDIMENTOS = ['R1', 'R2', 'R3'];
export const POTENCIAIS = ['P1', 'P2', 'P3'];
export const RENDIMENTO_LABEL = { R1: 'Titular', R2: 'Plantel', R3: 'Abaixo do nível' };
export const POTENCIAL_LABEL = { P1: 'Ligas acima do clube', P2: 'Nível do clube', P3: 'Abaixo' };
export const IDADE_MAX_POTENCIAL = 22;
// Perfil do jogador.
export const PERFIS = ['tecnico', 'fisico', 'misto'];
export const PERFIL_LABEL = { tecnico: 'Técnico', fisico: 'Físico', misto: 'Misto' };
// Avaliação por horizonte (imediata / médio prazo / longo prazo) — nível de liga 1-5.
export const AVALIACAO_NIVEIS = [1, 2, 3, 4, 5];
export const AVALIACAO_NIVEL_LABEL = {
  1: 'Distrital',
  2: 'CP nível baixo',
  3: 'Nível do clube',
  4: 'Liga 3',
  5: 'Ligas profissionais',
};
// Veredito de observação — estado principal do jogador (substitui o pipeline).
export const VEREDITOS = ['Contratar', 'A acompanhar', 'Nova observação', 'Não avança'];
export const COR_VEREDITO = {
  'Contratar': 'var(--verde-ok)',
  'A acompanhar': 'var(--azul)',
  'Nova observação': 'var(--amarelo)',
  'Não avança': 'var(--vermelho)',
};
export const corVeredito = (v) => COR_VEREDITO[v] || 'var(--texto-suave)';

// Perfil como número (1 técnico · 2 físico · 3 misto).
export const PERFIL_NUM = { tecnico: 1, fisico: 2, misto: 3 };
export const perfilNum = (p) => PERFIL_NUM[p] ?? null;

// Veredito abreviado para o código.
export const VEREDITO_CODIGO = {
  'Contratar': 'C',
  'A acompanhar': 'A',
  'Nova observação': 'NO',
  'Não avança': 'NA',
};

// Código do jogador — resume todas as classificações numa só string (separada por
// espaços): veredito(C/A/NO/NA) rendimento potencial perfil(nº) imediata médio longo.
// Ex.: "C R1 P1 3 3 4 4". Partes em falta aparecem como "–".
export function codigoJogador(j) {
  if (!j) return '';
  const a = idade(j.dataNascimento);
  const potOk = a === '—' || a <= IDADE_MAX_POTENCIAL; // Potencial só ≤22 anos
  return [
    VEREDITO_CODIGO[j.veredito] || '–',
    j.rendimento || '–',
    potOk ? j.potencialClass || '–' : '–',
    PERFIL_NUM[j.perfil] ?? '–',
    j.avaliacaoImediata ?? '–',
    j.avaliacaoMedioPrazo ?? '–',
    j.avaliacaoLongoPrazo ?? '–',
  ].join(' ');
}

const PESOS = { tecnica: 0.2, tatica: 0.2, fisica: 0.15, mental: 0.2 };

// Nº de dimensões preenchidas (de 4).
export function dimensoesPreenchidas(av = {}) {
  return Object.keys(PESOS).filter((dim) => typeof av[dim] === 'number' && !Number.isNaN(av[dim])).length;
}

// Rating a partir das 4 dimensões — média ponderada com UMA casa decimal (1-5 =
// nível de liga). Normaliza pelos pesos usados. null se nenhuma estiver. Igual ao
// servidor. Sem ajuste pela divisão (o 1-5 já é o contexto).
export function calcularRatingFinal(av = {}) {
  const entradas = Object.entries(PESOS).filter(
    ([dim]) => typeof av[dim] === 'number' && !Number.isNaN(av[dim])
  );
  if (entradas.length === 0) return null;
  const somaPesos = entradas.reduce((s, [, peso]) => s + peso, 0);
  const total = entradas.reduce((s, [dim, peso]) => s + av[dim] * peso, 0);
  return Math.round((total / somaPesos) * 10) / 10; // uma casa decimal
}

const MAPA_POS = Object.fromEntries(POSICOES.map((p) => [p.key, p]));
export const posCurto = (key) => MAPA_POS[key]?.curto || key || '—';
export const posLabel = (key) => MAPA_POS[key]?.label || key || '—';

export function idade(dataNascimento) {
  if (!dataNascimento) return '—';
  const diff = Date.now() - new Date(dataNascimento).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function dataCurta(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// para <input type="date"> (YYYY-MM-DD)
export function dataInput(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

export function euros(v) {
  if (v == null || v === '') return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

// Estado contratual a partir da data de fim de contrato.
// classe: 'contrato--vermelho' (livre / <6m) | 'contrato--amarelo' (<12m) | '' (longo)
export function estadoContrato(fimContrato) {
  if (!fimContrato) return { label: 'n/d', curto: '—', classe: '', ordem: 4 };
  const hoje = new Date();
  const fim = new Date(fimContrato);
  const mais = (m) => new Date(hoje.getFullYear(), hoje.getMonth() + m, hoje.getDate());
  if (fim <= hoje) return { label: 'Livre', curto: 'Livre', classe: 'contrato--vermelho', ordem: 0 };
  if (fim <= mais(6)) return { label: '< 6 meses', curto: '< 6 meses', classe: 'contrato--vermelho', ordem: 1 };
  if (fim <= mais(12)) return { label: '< 12 meses', curto: '< 12 meses', classe: 'contrato--amarelo', ordem: 2 };
  return { label: 'Longo', curto: 'Longo', classe: 'contrato--ok', ordem: 3 };
}

export const OPCOES_CONTRATO = [
  { valor: 'livre', label: 'Livre' },
  { valor: '6m', label: '< 6 meses' },
  { valor: '12m', label: '< 12 meses' },
  { valor: 'longo', label: 'Longo' },
];

// Dias desde a última atividade; e se está "parado" (> limite dias).
export function diasDesde(data) {
  if (!data) return null;
  return Math.floor((Date.now() - new Date(data).getTime()) / (24 * 60 * 60 * 1000));
}

export function estaParado(ultimaAtividade, limite = 30) {
  const d = diasDesde(ultimaAtividade);
  return d != null && d > limite;
}

/* ---------- Consistência (traços recorrentes nas observações) ---------- */

// As 4 categorias em que os pontos fortes / a desenvolver são organizados.
export const CATS_TRACO = [
  { key: 'tecnica', label: 'Técnica' },
  { key: 'tatica', label: 'Tática' },
  { key: 'fisica', label: 'Física' },
  { key: 'mental', label: 'Mental' },
];

// Um traço pode ser uma string (formato antigo) ou { texto, nota } (novo). Estes
// helpers leem qualquer um dos formatos.
// Normaliza um traço para o COMPARAR entre observações: minúsculas, sem acentos,
// espaços colapsados. Assim "Resiliencia" e "Resiliência" contam como o mesmo.
export function normalizarTraco(s) {
  return (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

// Consistência = estabilidade das notas dos ATRIBUTOS da grelha da posição (eixos
// fixos) entre observações. Cada atributo com nota em ≥ 2 obs conta; variacaoMedia
// = média de (maior − menor nota) desses atributos. Índice = 1 − variacaoMedia/6.
export function consistenciaResumo(observacoes = []) {
  const n = observacoes.length;
  const info = new Map(); // "categoria.atributo" -> [notas]
  for (const o of observacoes) {
    for (const [k, v] of Object.entries(o.grelhaPosicao || {})) {
      if (typeof v !== 'number') continue;
      if (!info.has(k)) info.set(k, []);
      info.get(k).push(v);
    }
  }
  const vals = [...info.values()];
  const distintos = vals.length;
  const recorrentes = vals.filter((a) => a.length >= 2).length;
  const avaliados = vals.filter((a) => a.length >= 2);
  const spreads = avaliados.map((a) => Math.max(...a) - Math.min(...a));
  const nAvaliados = avaliados.length;
  const variacaoMedia = nAvaliados
    ? Math.round((spreads.reduce((x, y) => x + y, 0) / nAvaliados) * 10) / 10
    : null;
  const indice = n >= 2 && variacaoMedia != null ? Math.max(0, Math.min(1, 1 - variacaoMedia / 6)) : null;
  const banda =
    variacaoMedia == null ? 'poucos' : variacaoMedia <= 1 ? 'alta' : variacaoMedia <= 2.5 ? 'media' : 'baixa';
  return { n, distintos, recorrentes, nAvaliados, variacaoMedia, indice, banda };
}

// Consistência completa (painel da ficha): resumo + atributos da grelha agrupados
// por dimensão, com as notas por observação e a variação.
export function consistenciaCompleta(observacoes = [], posicao = null) {
  const info = new Map(); // "categoria.atributo" -> [notas]
  for (const o of observacoes) {
    for (const [k, v] of Object.entries(o.grelhaPosicao || {})) {
      if (typeof v !== 'number') continue;
      if (!info.has(k)) info.set(k, []);
      info.get(k).push(v);
    }
  }
  const grid = posicao ? CATALOGO_POSICAO[posicao] : null;
  const meta = (k) => {
    const [cat, attr] = k.split('.');
    const a = grid?.[cat]?.find((x) => x.k === attr);
    return { cat, label: a?.l || attr, peso: a?.p ?? 1 };
  };
  const ordemCat = Object.fromEntries(CATS_TRACO.map((c, i) => [c.key, i]));
  const atributos = [...info.entries()].map(([k, notas]) => {
    const { cat, label, peso } = meta(k);
    const spread = notas.length >= 2 ? Math.max(...notas) - Math.min(...notas) : null;
    const media = Math.round((notas.reduce((s, x) => s + x, 0) / notas.length) * 10) / 10;
    return { key: k, cat, label, peso, notas, spread, media, count: notas.length };
  });
  atributos.sort(
    (a, b) => (ordemCat[a.cat] ?? 9) - (ordemCat[b.cat] ?? 9) || b.peso - a.peso || a.label.localeCompare(b.label)
  );
  return { ...consistenciaResumo(observacoes), atributos };
}

export const CONSIST_BANDA = {
  alta: { label: 'Alta', cor: 'var(--verde-ok)' },
  media: { label: 'Média', cor: 'var(--amarelo)' },
  baixa: { label: 'Baixa', cor: 'var(--vermelho)' },
  poucos: { label: 'Poucos dados', cor: 'var(--texto-suave)' },
};
