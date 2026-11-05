// Vocabulário partilhado da plataforma. Mantém coerência entre modelos, rotas e frontend.

// Clube próprio (o clube do scout). Configurável por ambiente para reutilizar a plataforma.
export const CLUBE_PROPRIO = process.env.CLUBE_PROPRIO || 'FC Exemplo';
// Token normalizado (só a-z) do clube próprio — deteta o clube nos nomes vindos de fontes externas.
export const CLUBE_PROPRIO_TOKEN = CLUBE_PROPRIO.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

// Posições acompanhadas pelo scouting (chaves estáveis; label para apresentação).
// Os dois centrais estão unificados numa única posição DC.
export const POSICOES = [
  { key: 'GR', label: 'GR — Guarda-redes' },
  { key: 'DD', label: 'DD — Defesa direito' },
  { key: 'DC', label: 'DC — Defesa central' },
  { key: 'DE', label: 'DE — Defesa esquerdo' },
  { key: 'MDF', label: 'MDF — Médio defensivo' },
  { key: 'MC', label: 'MC — Médio centro' },
  { key: 'MOF', label: 'MOF — Médio ofensivo' },
  { key: 'EE', label: 'EE — Extremo esquerdo' },
  { key: 'ED', label: 'ED — Extremo direito' },
  { key: 'PL', label: 'PL — Ponta de lança' },
];

export const POSICAO_KEYS = POSICOES.map((p) => p.key);

// Situação dos jogadores do plantel — nada a ver com scouting de recrutamento.
export const ESTADOS_PLANTEL = ['Titular', 'Rotação', 'Suplente', 'Lesionado', 'Emprestado'];

export const PRIORIDADE_LIGA = ['Alta', 'Média', 'Baixa'];

// Relação com clubes (módulo Clubes)
export const RELACAO_CLUBE = ['Interesse', 'Contacto estabelecido', 'Parceria', 'Neutro'];

// Estados de um jogo agendado para observação (Agenda)
export const ESTADO_AGENDAMENTO = ['Planeado', 'Concluído', 'Cancelado'];

// Metas do departamento (Modelo Operacional, secção 7.1 KPIs)
export const METAS = {
  observadosSemana: 20, // jogadores observados por semana
  adicionadosSemana: 10, // jogadores adicionados à base por semana
  shortlistPorPosicao: 5, // 5-10 por posição
  ligasAtivas: 5, // ligas em acompanhamento
  relatoriosMes: 4, // relatórios completos por mês
};

// Nº de dias sem atualização a partir do qual um jogador é sinalizado (secção 9.2)
export const DIAS_SEM_ATUALIZACAO = 30;

// Pesos do rating final ponderado. Só 4 dimensões (Técnica, Tática, Física,
// Mental) — Potencial e Prontidão saíram do sistema de dimensões e passaram
// às classificações de Rendimento (R1-3) e Potencial (P1-3) no cabeçalho.
// A nota normaliza pela soma dos pesos, por isso não precisam de somar 1.
export const PESOS_AVALIACAO = {
  tecnica: 0.2,
  tatica: 0.2,
  fisica: 0.15,
  mental: 0.2,
};

// ---------- Sistema de classificação dos jogadores (Base de dados) ----------
// Rendimento = nível atual no clube onde joga.
export const RENDIMENTOS = ['R1', 'R2', 'R3'];
export const RENDIMENTO_LABEL = { R1: 'Titular', R2: 'Plantel', R3: 'Abaixo do nível' };
// Potencial = teto projetado face à liga do clube. Só para jogadores até 22 anos.
export const POTENCIAIS = ['P1', 'P2', 'P3'];
export const POTENCIAL_LABEL = { P1: 'Ligas acima do clube', P2: 'Nível do clube', P3: 'Abaixo' };
export const IDADE_MAX_POTENCIAL = 22;
// Perfil do jogador.
export const PERFIS = ['tecnico', 'fisico', 'misto'];
export const PERFIL_LABEL = { tecnico: 'Técnico', fisico: 'Físico', misto: 'Misto' };
// Avaliação por horizonte (imediata / médio prazo / longo prazo) — nível de liga
// projetado, 1-5.
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

// Nº de dimensões preenchidas (de 4).
export function dimensoesPreenchidas(av = {}) {
  return Object.keys(PESOS_AVALIACAO).filter(
    (dim) => typeof av[dim] === 'number' && !Number.isNaN(av[dim])
  ).length;
}

// Rating a partir das 4 dimensões — média PONDERADA com UMA casa decimal, na
// escala 1-5 (= nível de liga: 1 Distrital … 5 Ligas profissionais). Normaliza
// pelos pesos usados (se só algumas dimensões estiverem preenchidas). null se
// nenhuma estiver. Sem ajuste pela divisão: o 1-5 já é o contexto.
export function calcularRatingFinal(av = {}) {
  const entradas = Object.entries(PESOS_AVALIACAO).filter(
    ([dim]) => typeof av[dim] === 'number' && !Number.isNaN(av[dim])
  );
  if (entradas.length === 0) return null;
  const somaPesos = entradas.reduce((s, [, peso]) => s + peso, 0);
  const total = entradas.reduce((soma, [dim, peso]) => soma + av[dim] * peso, 0);
  return Math.round((total / somaPesos) * 10) / 10; // uma casa decimal
}
