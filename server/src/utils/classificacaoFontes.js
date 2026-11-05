// Fontes (edições externas) da classificação, por competição+série. Vazio por
// omissão — cada utilizador configura as suas; o link é pedido na primeira vez e
// guardado depois em Classificacao.fonte.
export const FONTES_CLASSIFICACAO = {};

export const fonteDe = (competicao, serie) =>
  FONTES_CLASSIFICACAO[`${competicao}|${serie || ''}`] || null;
