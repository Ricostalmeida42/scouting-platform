// CATÁLOGO de atributos por posição: todas as características relevantes de
// cada posição. É o MENU: o editor escolhe, no Controlo → Grelha, quais aparecem
// na grelha de observação de cada posição (guardado no servidor).
//
// Os 4 pilares de observação (Processo Defensivo, Processo Ofensivo, Capacidades
// Físicas, Personalidade) mapeiam nas 4 dimensões da plataforma:
//   Técnica ← ações com/sobre a bola   Tática ← leitura/posicionamento/movimento
//   Física  ← Capacidades Físicas       Mental ← Personalidade
// (a "estatura" fica de fora da Física — é bio/altura, não uma capacidade a avaliar.)
//
// Cada item: { k: chave estável, l: rótulo, d?: 1 = ligado por omissão, p?: peso
// 1-3 por omissão }. A seleção/pesos efetivos vêm da config (ver grelhaConfig.js);
// quando não há config, usa-se o que está marcado com `d` (GRELHA_PADRAO).
// Modelo de jogo do clube (3-4-3 de posse e construção) guiou os defaults.

export const ESCALA_PRESSAO = [
  { min: 5, max: 5, txt: 'Ligas profissionais' },
  { min: 4, max: 4, txt: 'Liga 3' },
  { min: 3, max: 3, txt: 'Nível do clube' },
  { min: 2, max: 2, txt: 'CP nível baixo' },
  { min: 1, max: 1, txt: 'Distrital' },
];

// Personalidade comum (traços transversais a todas as posições). Cada posição parte daqui
// e acrescenta os seus próprios (ex.: GR Coragem, PL Instinto matador).
const MENTAL_BASE = [
  { k: 'concentracao', l: 'Concentração', d: 1, p: 2 },
  { k: 'atitude', l: 'Agressividade / competitividade', d: 1, p: 2 },
  { k: 'inteligencia', l: 'Inteligência de jogo', d: 1, p: 2 },
  { k: 'controlo_emocional', l: 'Controlo emocional', d: 1, p: 1 },
  { k: 'lideranca', l: 'Liderança', p: 1 },
  { k: 'comunicacao', l: 'Comunicação', p: 1 },
  { k: 'trabalho_equipa', l: 'Trabalho de equipa', p: 1 },
  { k: 'margem', l: 'Margem de evolução', p: 1 },
];
const mental = (extra = []) => [...MENTAL_BASE, ...extra];

export const CATALOGO_POSICAO = {
  // Guarda-redes
  GR: {
    tecnica: [
      { k: 'jogo_pes', l: 'Jogo de pés (construção)', d: 1, p: 3 },
      { k: 'defesas', l: 'Técnica base de baliza / defesas', d: 1, p: 3 },
      { k: 'tecnica_maos', l: 'Técnica de mãos', p: 2 },
      { k: 'saidas', l: 'Saídas a cruzamento', d: 1, p: 2 },
      { k: 'distribuicao', l: 'Distribuição de jogo', d: 1, p: 2 },
      { k: 'reposicao', l: 'Reposição com a mão', p: 1 },
      { k: 'controlo_bola', l: 'Controlo de bola', d: 1, p: 1 },
    ],
    tatica: [
      { k: 'posicionamento', l: 'Posicionamento', d: 1, p: 3 },
      { k: 'profundidade', l: 'Controlo da profundidade', d: 1, p: 2 },
      { k: 'um_x_um', l: '1x1 (último defesa)', p: 2 },
      { k: 'entre_postes', l: 'Entre os postes', p: 1 },
      { k: 'decisao', l: 'Capacidade de decisão', d: 1, p: 2 },
    ],
    fisica: [
      { k: 'agilidade', l: 'Agilidade', d: 1, p: 3 },
      { k: 'reacao', l: 'Velocidade de reação (reflexos)', d: 1, p: 2 },
      { k: 'impulsao', l: 'Impulsão', d: 1, p: 2 },
      { k: 'coordenacao', l: 'Coordenação', d: 1, p: 2 },
      { k: 'vel_deslocamento', l: 'Velocidade de deslocamento', p: 1 },
    ],
    mental: mental([{ k: 'coragem', l: 'Coragem', d: 1, p: 1 }]),
  },
  // Defesas laterais (DD/DE partilham o catálogo)
  DD: {
    tecnica: [
      { k: 'passe', l: 'Índice técnico (passe / receção)', d: 1, p: 3 },
      { k: 'cruzamento', l: 'Cruzamento', d: 1, p: 2 },
      { k: 'conducao', l: 'Condução / transporte', d: 1, p: 2 },
      { k: 'drible', l: 'Drible / 1x1 ofensivo', d: 1, p: 2 },
      { k: 'desarme', l: 'Desarme', d: 1, p: 2 },
      { k: 'primeiro_toque', l: '1º toque', d: 1, p: 1 },
      { k: 'seguranca', l: 'Segurança em posse e circulação', p: 2 },
      { k: 'jogo_interior', l: 'Jogo interior', p: 1 },
      { k: 'intercecao', l: 'Interceção', d: 1, p: 1 },
      { k: 'jogo_aereo_def', l: 'Jogo aéreo defensivo', p: 1 },
    ],
    tatica: [
      { k: 'apoio_subida', l: 'Apoio ofensivo / subida', d: 1, p: 3 },
      { k: 'posicionamento', l: 'Posicionamento', d: 1, p: 2 },
      { k: 'corrida_sem_bola', l: 'Corrida sem bola', d: 1, p: 2 },
      { k: 'momento_cruzamento', l: 'Momento do cruzamento', d: 1, p: 1 },
      { k: 'marcacao', l: 'Marcação', p: 2 },
      { k: 'duelos', l: 'Duelos individuais', p: 2 },
      { k: 'encurtar', l: 'Encurtamento de espaços', p: 1 },
      { k: 'espaco_interior', l: 'Controlo do espaço interior', p: 1 },
      { k: 'antecipacao', l: 'Antecipação', p: 1 },
      { k: 'recuperacao', l: 'Recuperação defensiva', d: 1, p: 1 },
      { k: 'decisao_terco', l: 'Decisão no último terço', p: 1 },
    ],
    fisica: [
      { k: 'velocidade', l: 'Velocidade', d: 1, p: 3 },
      { k: 'resistencia', l: 'Resistência', d: 1, p: 3 },
      { k: 'agilidade', l: 'Agilidade', d: 1, p: 2 },
      { k: 'aceleracao', l: 'Aceleração', p: 2 },
      { k: 'forca', l: 'Força', d: 1, p: 1 },
      { k: 'coordenacao', l: 'Coordenação', p: 1 },
    ],
    mental: mental([{ k: 'polivalencia', l: 'Polivalência', d: 1, p: 1 }]),
  },
  // Defesas centrais — peça-chave da construção desde trás
  DC: {
    tecnica: [
      { k: 'construcao', l: 'Fase de construção (segurança)', d: 1, p: 3 },
      { k: 'passe', l: 'Índice técnico (passe / receção)', d: 1, p: 3 },
      { k: 'passe_interior', l: 'Passe interior', d: 1, p: 2 },
      { k: 'passe_longo', l: 'Passe longo / variação de jogo', d: 1, p: 2 },
      { k: 'primeiro_toque', l: '1º toque', d: 1, p: 2 },
      { k: 'desarme', l: 'Desarme', d: 1, p: 2 },
      { k: 'cabeceamento', l: 'Jogo aéreo defensivo', d: 1, p: 2 },
      { k: 'conducao', l: 'Condução / transporte', d: 1, p: 1 },
      { k: 'jogo_aereo_of', l: 'Jogo aéreo ofensivo', p: 1 },
      { k: 'seguranca', l: 'Jogo sob pressão', p: 1 },
      { k: 'intercecao', l: 'Interceção', d: 1, p: 1 },
    ],
    tatica: [
      { k: 'posicionamento', l: 'Posicionamento', d: 1, p: 3 },
      { k: 'antecipacao', l: 'Antecipação', d: 1, p: 2 },
      { k: 'marcacao', l: 'Marcação', d: 1, p: 2 },
      { k: 'duelos', l: 'Duelos individuais', d: 1, p: 1 },
      { k: 'encurtar', l: 'Encurtamento de espaços', d: 1, p: 1 },
      { k: 'profundidade', l: 'Cobertura da profundidade', d: 1, p: 1 },
    ],
    fisica: [
      { k: 'forca', l: 'Força / robustez', d: 1, p: 3 },
      { k: 'velocidade', l: 'Velocidade', d: 1, p: 2 },
      { k: 'resistencia', l: 'Resistência', d: 1, p: 2 },
      { k: 'aceleracao', l: 'Aceleração', p: 1 },
      { k: 'agilidade', l: 'Agilidade', d: 1, p: 1 },
      { k: 'coordenacao', l: 'Coordenação', p: 1 },
    ],
    mental: mental(),
  },
  // Médio defensivo — pivô que circula e protege a construção
  MDF: {
    tecnica: [
      { k: 'passe', l: 'Índice técnico (passe / receção)', d: 1, p: 3 },
      { k: 'primeiro_toque', l: '1º toque', d: 1, p: 2 },
      { k: 'seguranca', l: 'Segurança em posse', d: 1, p: 2 },
      { k: 'conducao', l: 'Condução / transporte', d: 1, p: 2 },
      { k: 'desarme', l: 'Desarme', d: 1, p: 2 },
      { k: 'passe_longo', l: 'Passe / variação de jogo', d: 1, p: 1 },
      { k: 'drible', l: 'Drible / 1x1 ofensivo', p: 1 },
      { k: 'jogo_aereo_of', l: 'Jogo aéreo ofensivo', p: 1 },
      { k: 'visao', l: 'Visão de jogo', d: 1, p: 2 },
      { k: 'intercecao', l: 'Interceção', d: 1, p: 1 },
      { k: 'jogo_aereo_def', l: 'Jogo aéreo defensivo', p: 1 },
    ],
    tatica: [
      { k: 'posicionamento', l: 'Posicionamento', d: 1, p: 3 },
      { k: 'reacao_perda', l: 'Reação à perda de bola', d: 1, p: 2 },
      { k: 'pressao', l: 'Capacidade de pressão', d: 1, p: 2 },
      { k: 'encurtar', l: 'Encurtamento de espaços', d: 1, p: 1 },
      { k: 'antecipacao', l: 'Antecipação', d: 1, p: 1 },
      { k: 'duelos', l: 'Duelos individuais', p: 1 },
    ],
    fisica: [
      { k: 'resistencia', l: 'Resistência', d: 1, p: 3 },
      { k: 'agilidade', l: 'Agilidade', d: 1, p: 2 },
      { k: 'velocidade', l: 'Velocidade', d: 1, p: 2 },
      { k: 'intensidade', l: 'Intensidade', p: 2 },
      { k: 'forca', l: 'Força / robustez', d: 1, p: 1 },
      { k: 'aceleracao', l: 'Aceleração', p: 1 },
      { k: 'coordenacao', l: 'Coordenação', p: 1 },
    ],
    mental: mental([{ k: 'assumir', l: 'Capacidade para assumir o jogo', d: 1, p: 1 }]),
  },
  // Médio centro — box-to-box
  MC: {
    tecnica: [
      { k: 'passe', l: 'Índice técnico (passe curto / receção)', d: 1, p: 3 },
      { k: 'primeiro_toque', l: '1º toque', d: 1, p: 2 },
      { k: 'conducao', l: 'Condução / transporte', d: 1, p: 2 },
      { k: 'drible', l: 'Drible / 1x1 ofensivo', d: 1, p: 2 },
      { k: 'passe_longo', l: 'Passe longo / variação de jogo', d: 1, p: 1 },
      { k: 'remate', l: 'Remate', d: 1, p: 1 },
      { k: 'finalizacao', l: 'Finalização / golos', p: 1 },
      { k: 'desarme', l: 'Desarme', d: 1, p: 1 },
      { k: 'jogo_aereo_def', l: 'Jogo aéreo defensivo', p: 1 },
    ],
    tatica: [
      { k: 'visao', l: 'Visão de jogo', d: 1, p: 3 },
      { k: 'posicionamento', l: 'Posicionamento', d: 1, p: 2 },
      { k: 'ritmo', l: 'Variação dos ritmos de jogo', d: 1, p: 2 },
      { k: 'dinamica', l: 'Dinâmica', d: 1, p: 1 },
      { k: 'reacao_perda', l: 'Reação à perda de bola', d: 1, p: 1 },
      { k: 'pressao', l: 'Capacidade de pressão', p: 1 },
      { k: 'encurtar', l: 'Encurtamento de espaços', p: 1 },
      { k: 'duelos', l: 'Duelos individuais', p: 1 },
    ],
    fisica: [
      { k: 'resistencia', l: 'Resistência', d: 1, p: 3 },
      { k: 'agilidade', l: 'Agilidade', d: 1, p: 2 },
      { k: 'velocidade', l: 'Velocidade', d: 1, p: 2 },
      { k: 'intensidade', l: 'Intensidade', p: 1 },
      { k: 'forca', l: 'Força / robustez', d: 1, p: 1 },
      { k: 'aceleracao', l: 'Aceleração', p: 1 },
      { k: 'coordenacao', l: 'Coordenação', p: 1 },
    ],
    mental: mental([{ k: 'assumir', l: 'Capacidade para assumir o jogo', d: 1, p: 1 }]),
  },
  // Médio ofensivo (10) — entre linhas, criatividade e último passe
  MOF: {
    tecnica: [
      { k: 'drible', l: 'Drible em espaços curtos / 1x1', d: 1, p: 3 },
      { k: 'passe', l: 'Passe', d: 1, p: 3 },
      { k: 'ultimo_passe', l: 'Último passe', d: 1, p: 2 },
      { k: 'primeiro_toque', l: '1º toque / receção orientada', d: 1, p: 2 },
      { k: 'remate', l: 'Remate / meia distância', d: 1, p: 2 },
      { k: 'conducao', l: 'Condução / transporte', d: 1, p: 1 },
      { k: 'finalizacao', l: 'Golo', p: 1 },
    ],
    tatica: [
      { k: 'jogo_entrelinhas', l: 'Jogo entre linhas', d: 1, p: 3 },
      { k: 'leitura_espaco', l: 'Encontrar espaços', d: 1, p: 2 },
      { k: 'rutura', l: 'Movimento de rutura', d: 1, p: 2 },
      { k: 'visao', l: 'Visão de jogo', d: 1, p: 2 },
      { k: 'associativo', l: 'Jogo associativo', d: 1, p: 1 },
      { k: 'chegada_area', l: 'Chegada à área', d: 1, p: 1 },
    ],
    fisica: [
      { k: 'agilidade', l: 'Agilidade', d: 1, p: 3 },
      { k: 'velocidade', l: 'Velocidade', d: 1, p: 2 },
      { k: 'aceleracao', l: 'Aceleração curta', d: 1, p: 2 },
      { k: 'resistencia', l: 'Resistência', d: 1, p: 2 },
      { k: 'coordenacao', l: 'Coordenação', p: 1 },
    ],
    mental: mental([{ k: 'criatividade', l: 'Criatividade', d: 1, p: 2 }]),
  },
  // Extremos (EE/ED partilham o catálogo)
  EE: {
    tecnica: [
      { k: 'drible', l: 'Drible / 1x1 ofensivo', d: 1, p: 3 },
      { k: 'conducao', l: 'Condução / transporte de bola', d: 1, p: 2 },
      { k: 'cruzamento', l: 'Cruzamento', d: 1, p: 2 },
      { k: 'remate', l: 'Remate', d: 1, p: 2 },
      { k: 'ultimo_passe', l: 'Último passe', d: 1, p: 2 },
      { k: 'primeiro_toque', l: '1º toque', d: 1, p: 1 },
      { k: 'passe', l: 'Passe / relação com a bola', d: 1, p: 1 },
      { k: 'finalizacao', l: 'Golos', p: 1 },
    ],
    tatica: [
      { k: 'rutura', l: 'Aceleração de jogo / rutura', d: 1, p: 2 },
      { k: 'desmarcacao', l: 'Desmarcação', d: 1, p: 2 },
      { k: 'jogo_entrelinhas', l: 'Jogo entre linhas', d: 1, p: 2 },
      { k: 'chegada_area', l: 'Chegada a zonas de finalização', d: 1, p: 2 },
      { k: 'criatividade', l: 'Criatividade', d: 1, p: 1 },
      { k: 'visao', l: 'Visão de jogo', p: 1 },
      { k: 'apoio_defensivo', l: 'Apoio / cobertura defensiva', d: 1, p: 1 },
      { k: 'pressao', l: 'Capacidade de pressão', p: 1 },
      { k: 'reacao_perda', l: 'Reação à perda de bola', p: 1 },
    ],
    fisica: [
      { k: 'velocidade', l: 'Velocidade', d: 1, p: 3 },
      { k: 'aceleracao', l: 'Aceleração / explosão', d: 1, p: 2 },
      { k: 'agilidade', l: 'Agilidade', d: 1, p: 2 },
      { k: 'resistencia', l: 'Resistência', d: 1, p: 1 },
      { k: 'potencia', l: 'Potência', p: 1 },
      { k: 'vel_execucao', l: 'Velocidade de execução', p: 1 },
      { k: 'intensidade', l: 'Intensidade de jogo', p: 1 },
    ],
    mental: mental(),
  },
  // Avançados (ponta de lança)
  PL: {
    tecnica: [
      { k: 'remate', l: 'Remate', d: 1, p: 3 },
      { k: 'finalizacao', l: 'Finalização / golos', d: 1, p: 2 },
      { k: 'primeiro_toque', l: '1º toque / relação com a bola', d: 1, p: 2 },
      { k: 'drible', l: 'Drible / 1x1 ofensivo', d: 1, p: 2 },
      { k: 'cabeceamento', l: 'Cabeceamento / duelos aéreos', d: 1, p: 2 },
      { k: 'ultimo_passe', l: 'Último passe', d: 1, p: 1 },
      { k: 'conducao', l: 'Condução / transporte', p: 1 },
      { k: 'espontaneidade', l: 'Espontaneidade de finalização', p: 1 },
      { k: 'criatividade', l: 'Criatividade', p: 1 },
    ],
    tatica: [
      { k: 'movimentacao', l: 'Movimentação na área', d: 1, p: 3 },
      { k: 'desmarcacao', l: 'Dinâmica apoio / rutura', d: 1, p: 2 },
      { k: 'leitura_espaco', l: 'Leitura de espaço / profundidade', d: 1, p: 2 },
      { k: 'jogo_entrelinhas', l: 'Jogo entre linhas', d: 1, p: 1 },
      { k: 'visao', l: 'Visão de jogo', p: 1 },
      { k: 'apoio_defensivo', l: 'Apoio defensivo', d: 1, p: 1 },
      { k: 'pressao', l: 'Capacidade de pressão', p: 1 },
    ],
    fisica: [
      { k: 'agilidade', l: 'Agilidade', d: 1, p: 2 },
      { k: 'velocidade', l: 'Velocidade', d: 1, p: 2 },
      { k: 'forca', l: 'Força / robustez', d: 1, p: 2 },
      { k: 'aceleracao', l: 'Aceleração', d: 1, p: 1 },
      { k: 'resistencia', l: 'Resistência', p: 1 },
      { k: 'potencia', l: 'Potência', p: 1 },
      { k: 'vel_execucao', l: 'Velocidade de execução', p: 1 },
    ],
    mental: mental([
      { k: 'instinto', l: 'Instinto "matador"', d: 1, p: 2 },
      { k: 'persistencia', l: 'Persistência', d: 1, p: 1 },
      { k: 'resiliencia', l: 'Resiliência', p: 1 },
    ]),
  },
};

// DE e ED espelham DD e EE (mesmo catálogo).
CATALOGO_POSICAO.DE = CATALOGO_POSICAO.DD;
CATALOGO_POSICAO.ED = CATALOGO_POSICAO.EE;

export const CATS_GRELHA = [
  { key: 'tecnica', label: 'Técnica' },
  { key: 'tatica', label: 'Tática' },
  { key: 'fisica', label: 'Física' },
  { key: 'mental', label: 'Mental' },
];

// Seleção POR OMISSÃO (itens marcados com `d`), já no formato da grelha {k,l,p}.
// Usada quando não há config guardada no servidor.
export const GRELHA_PADRAO = (() => {
  const g = {};
  for (const [pos, dims] of Object.entries(CATALOGO_POSICAO)) {
    g[pos] = {};
    for (const [cat, arr] of Object.entries(dims)) {
      g[pos][cat] = arr.filter((a) => a.d).map((a) => ({ k: a.k, l: a.l, p: a.p || 2 }));
    }
  }
  return g;
})();

// Mapa "categoria.chave" -> rótulo, de TODO o catálogo (para mostrar uma grelha
// já gravada pelos seus próprios atributos, mesmo os não selecionados/antigos).
export const LABEL_ATRIBUTO = (() => {
  const m = {};
  for (const pos of Object.values(CATALOGO_POSICAO)) {
    for (const [cat, arr] of Object.entries(pos)) {
      for (const a of arr) m[cat + '.' + a.k] = a.l;
    }
  }
  return m;
})();
