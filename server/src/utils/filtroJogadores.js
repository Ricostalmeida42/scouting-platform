import { escaparRegex } from './regex.js';

// Constrói o filtro Mongo para a lista de jogadores a partir dos query params.
// Partilhado entre a rota /players e a exportação (para exportar a mesma vista filtrada).
export function construirFiltroJogadores(query = {}) {
  const {
    posicao,
    liga,
    clube,
    fimContratoAntes,
    contrato,
    q,
    incluirArquivo,
    plantel,
    incluirPlantel,
    // Sistema de classificação (Base de dados)
    rendimento,
    potencial,
    perfil,
    veredito,
    avImediata,
    avMedio,
    avLongo,
  } = query;
  const filtro = {};

  if (rendimento) filtro.rendimento = rendimento;
  if (potencial) filtro.potencialClass = potencial;
  if (perfil) filtro.perfil = perfil;
  if (veredito) filtro.veredito = veredito;
  if (avImediata) filtro.avaliacaoImediata = Number(avImediata);
  if (avMedio) filtro.avaliacaoMedioPrazo = Number(avMedio);
  if (avLongo) filtro.avaliacaoLongoPrazo = Number(avLongo);

  // Por omissão as vistas de scouting não mostram jogadores do plantel do clube.
  //   plantel=true        → só o plantel
  //   incluirPlantel=true → ambos (ex: comparar, escolher jogador para observar)
  if (plantel === 'true') filtro.doPlantel = true;
  else if (incluirPlantel !== 'true') filtro.doPlantel = { $ne: true };

  if (posicao) filtro.posicaoPrincipal = posicao;
  if (liga) filtro.liga = new RegExp(escaparRegex(liga), 'i');
  if (clube) filtro.clube = clube; // por _id de Club
  if (fimContratoAntes) filtro.fimContrato = { $lte: new Date(fimContratoAntes) };

  // Estado contratual (livre / <6m / <12m / longo)
  if (contrato) {
    const hoje = new Date();
    const mais = (meses) => new Date(hoje.getFullYear(), hoje.getMonth() + meses, hoje.getDate());
    if (contrato === 'livre') filtro.fimContrato = { $lte: hoje };
    else if (contrato === '6m') filtro.fimContrato = { $gt: hoje, $lte: mais(6) };
    else if (contrato === '12m') filtro.fimContrato = { $gt: mais(6), $lte: mais(12) };
    else if (contrato === 'longo') filtro.fimContrato = { $gt: mais(12) };
  }

  if (q) filtro.nomeCompleto = new RegExp(escaparRegex(q), 'i');
  // Por omissão esconde os arquivados (veredito "Não avança"), exceto se se pedir
  // incluirArquivo ou se se filtrar explicitamente por esse veredito.
  if (incluirArquivo !== 'true' && veredito !== 'Não avança') {
    filtro.veredito = filtro.veredito || { $ne: 'Não avança' };
  }

  return filtro;
}
