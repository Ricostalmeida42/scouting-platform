// Mapeamento dos exports Wyscout (115 colunas) → campos internos, + a
// configuração dos radares por posição. Só a parte "com bola" (Defensivo/Ofensivo) é
// medível por dados; Físico e Personalidade ficam para o olho (avaliação).

// Normaliza um cabeçalho/nome (minúsculas, sem acentos, só alfanumérico).
export function norm(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// campo interno → cabeçalho Wyscout normalizado (ver headers reais do export)
export const COLUNAS = {
  // identificação / biográfico
  nome: 'jogador',
  equipa: 'equipa',
  posicaoOriginal: 'posicao',
  idade: 'idade',
  valorMercado: 'valor de mercado',
  contratoTermina: 'contrato termina',
  nacionalidade: 'pais de nacionalidade',
  pe: 'pe',
  altura: 'altura',
  peso: 'peso',
  emprestado: 'emprestado',
  jogos: 'jogos disputados',
  minutos: 'minutos jogados',

  // finalização / produção
  golos90: 'golos 90',
  golosSemPenalti90: 'golos sem ser por penalti 90',
  xG90: 'golos esperados 90',
  golosCabeca90: 'golos de cabeca 90',
  remates90: 'remates 90',
  rematesBalizaPct: 'remates a baliza',
  conversaoPct: 'golos marcados',
  toquesArea90: 'toques na area 90',

  // criação
  assist90: 'assistencias 90',
  xA90: 'assistencias esperadas 90',
  assistRemate90: 'assistencias para remate 90',
  passesChave90: 'passes chave 90',
  passesArea90: 'passes para a area de penalti 90',
  passesAreaPct: 'passes precisos para a area de penalti',
  passesInteligentes90: 'passes inteligentes 90',
  passesProfundidade90: 'passes em profundidade 90',

  // cruzamento
  cruzamentos90: 'cruzamentos 90',
  cruzamentosCertosPct: 'cruzamentos certos',

  // progressão / 1x1
  passesProgr90: 'passes progressivos 90',
  passesProgrPct: 'passes progressivos certos',
  corridasProgr90: 'corridas progressivas 90',
  aceleracoes90: 'aceleracoes 90',
  dribles90: 'dribles 90',
  driblesCertosPct: 'dribles com sucesso',
  duelosOfensivos90: 'duelos ofensivos 90',
  duelosOfensivosGanhosPct: 'duelos ofensivos ganhos',

  // passe / posse
  passes90: 'passes 90',
  passesCertosPct: 'passes certos',
  passesFrentePct: 'passes para a frente certos',
  passesTercoFinal90: 'passes para terco final 90',
  passesTercoFinalPct: 'passes certos para terco final',
  passesLongos90: 'passes longos 90',
  passesLongosCertosPct: 'passes longos certos',

  // defesa
  acoesDefensivas90: 'acoes defensivas com exito 90',
  duelosDef90: 'duelos defensivos 90',
  duelosDefGanhosPct: 'duelos defensivos ganhos',
  duelosAereosGanhosPct: 'duelos aereos ganhos',
  cortes90: 'cortes 90',
  interceptacoes90: 'intersecoes 90',
  interceptacoesAjust: 'intercecoes ajust a posse',
  faltas90: 'faltas 90',

  // guarda-redes
  golosSofridos90: 'golos sofridos 90',
  rematesSofridos90: 'remates sofridos 90',
  jogosSemSofrer: 'jogos sem sofrer golos',
  defesasPct: 'defesas',
  xGSofridos90: 'golos sofridos esperados 90',
  golosEvitados90: 'golos expectaveis defendidos por 90',
  saidas90: 'saidas 90',
};

// Metadados de cada métrica usada nos radares.
//   fmt: 'per90' (por 90), 'pct' (percentagem), 'delta' (diferença, pode ser negativa)
//   invertido: true quando MENOS é melhor
export const METRICAS = {
  golos90: { label: 'Golos/90', fmt: 'per90' },
  golosSemPenalti90: { label: 'Golos s/penálti/90', fmt: 'per90' },
  xG90: { label: 'xG/90', fmt: 'per90' },
  deltaXG: { label: 'ΔxG (finalização)', fmt: 'delta' },
  golosCabeca90: { label: 'Golos de cabeça/90', fmt: 'per90' },
  remates90: { label: 'Remates/90', fmt: 'per90' },
  rematesBalizaPct: { label: 'Remates à baliza %', fmt: 'pct' },
  toquesArea90: { label: 'Toques na área/90', fmt: 'per90' },
  assist90: { label: 'Assistências/90', fmt: 'per90' },
  xA90: { label: 'xA/90', fmt: 'per90' },
  passesChave90: { label: 'Passes-chave/90', fmt: 'per90' },
  passesArea90: { label: 'Passes p/ área/90', fmt: 'per90' },
  passesAreaPct: { label: 'Passes p/ área certos %', fmt: 'pct' },
  passesInteligentes90: { label: 'Passes inteligentes/90', fmt: 'per90' },
  cruzamentosCertosPct: { label: 'Cruzamentos certos %', fmt: 'pct' },
  passesProgr90: { label: 'Passes progressivos/90', fmt: 'per90' },
  passesProgrPct: { label: 'Passes progr. certos %', fmt: 'pct' },
  corridasProgr90: { label: 'Corridas progressivas/90', fmt: 'per90' },
  dribles90: { label: 'Dribles/90', fmt: 'per90' },
  driblesCertosPct: { label: 'Dribles certos %', fmt: 'pct' },
  duelosOfensivosGanhosPct: { label: 'Duelos of. ganhos %', fmt: 'pct' },
  passesCertosPct: { label: 'Passe certo %', fmt: 'pct' },
  passesFrentePct: { label: 'Passe p/ frente %', fmt: 'pct' },
  passesTercoFinal90: { label: 'Passes p/ terço final/90', fmt: 'per90' },
  passesLongosCertosPct: { label: 'Passe longo certo %', fmt: 'pct' },
  acoesDefensivas90: { label: 'Ações defensivas/90', fmt: 'per90' },
  duelosDefGanhosPct: { label: 'Duelos def. ganhos %', fmt: 'pct' },
  duelosAereosGanhosPct: { label: 'Duelos aéreos ganhos %', fmt: 'pct' },
  cortes90: { label: 'Cortes/90', fmt: 'per90' },
  interceptacoesAjust: { label: 'Interceções (aj. posse)', fmt: 'per90' },
  golosEvitados90: { label: 'Golos evitados/90', fmt: 'per90' },
  defesasPct: { label: 'Defesas %', fmt: 'pct' },
  golosSofridos90: { label: 'Golos sofridos/90', fmt: 'per90', invertido: true },
  saidas90: { label: 'Saídas/90', fmt: 'per90' },
  passesLongos90: { label: 'Passes longos/90', fmt: 'per90' },
};

// Radar por grupo de posição (≈8 eixos cada), cruzado com o perfil da posição.
export const RADARES = {
  GR: ['golosEvitados90', 'defesasPct', 'golosSofridos90', 'saidas90', 'passesCertosPct', 'passesLongosCertosPct'],
  DC: ['duelosDefGanhosPct', 'duelosAereosGanhosPct', 'interceptacoesAjust', 'cortes90', 'acoesDefensivas90', 'passesProgr90', 'passesCertosPct', 'passesLongosCertosPct'],
  LATERAL: ['duelosDefGanhosPct', 'acoesDefensivas90', 'interceptacoesAjust', 'cruzamentosCertosPct', 'corridasProgr90', 'passesTercoFinal90', 'xA90', 'passesCertosPct'],
  MDF: ['acoesDefensivas90', 'interceptacoesAjust', 'duelosDefGanhosPct', 'duelosAereosGanhosPct', 'passesProgr90', 'passesCertosPct', 'passesFrentePct', 'passesChave90'],
  MC: ['passesProgr90', 'passesCertosPct', 'passesChave90', 'xA90', 'corridasProgr90', 'driblesCertosPct', 'acoesDefensivas90', 'xG90'],
  MOF: ['xA90', 'passesChave90', 'passesAreaPct', 'passesInteligentes90', 'driblesCertosPct', 'toquesArea90', 'xG90', 'passesProgr90'],
  EXTREMO: ['xG90', 'xA90', 'dribles90', 'corridasProgr90', 'toquesArea90', 'remates90', 'cruzamentosCertosPct', 'passesChave90'],
  PL: ['xG90', 'golosSemPenalti90', 'deltaXG', 'remates90', 'rematesBalizaPct', 'toquesArea90', 'duelosAereosGanhosPct', 'xA90'],
};

export const NOME_GRUPO = {
  GR: 'Guarda-redes',
  DC: 'Defesa central',
  LATERAL: 'Defesa lateral',
  MDF: 'Médio defensivo',
  MC: 'Médio centro',
  MOF: 'Médio ofensivo',
  EXTREMO: 'Extremo',
  PL: 'Ponta de lança',
};

// Posição Wyscout (ex.: "LCMF, RDMF, AMF") → grupo de radar. Usa a 1ª posição.
export function grupoDaPosicao(wy) {
  const t = String(wy || '').split(',')[0].trim().toUpperCase();
  if (!t) return null;
  if (t === 'GK') return 'GR';
  if (/CB$/.test(t)) return 'DC';
  if (/W?B$/.test(t)) return 'LATERAL'; // LB, RB, LWB, RWB
  if (/DMF$/.test(t)) return 'MDF';
  if (/CMF$/.test(t)) return 'MC';
  if (/AMF$/.test(t)) return 'MOF';
  if (/WF?$/.test(t)) return 'EXTREMO'; // LW, RW, LWF, RWF
  if (/CF$/.test(t)) return 'PL';
  return null;
}

// Posição principal da plataforma (GR/DC/DD/DE/MDF/MC/MOF/EE/ED/PL) → grupo.
export function grupoDaPosicaoPlataforma(pos) {
  const m = {
    GR: 'GR', DC: 'DC', DD: 'LATERAL', DE: 'LATERAL',
    MDF: 'MDF', MC: 'MC', MOF: 'MOF', EE: 'EXTREMO', ED: 'EXTREMO', PL: 'PL',
  };
  return m[pos] || null;
}
