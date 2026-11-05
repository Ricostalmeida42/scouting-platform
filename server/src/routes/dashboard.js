import { Router } from 'express';
import Player from '../models/Player.js';
import Observation from '../models/Observation.js';
import League from '../models/League.js';
import Agendamento from '../models/Agendamento.js';
import ObservacaoJogo from '../models/ObservacaoJogo.js';
import CalendarioJogo from '../models/CalendarioJogo.js';
import Classificacao from '../models/Classificacao.js';
import { POSICOES, METAS, DIAS_SEM_ATUALIZACAO, CLUBE_PROPRIO_TOKEN } from '../constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escudoDataUrl } from '../utils/relatorioRca.js';
import { sumarioSemanalHtml } from '../utils/sumarioSemanalHtml.js';

const router = Router();

// As métricas de scouting ignoram os jogadores do plantel do clube.
const SEM_PLANTEL = { doPlantel: { $ne: true } };

// O funil passou a ser o VEREDITO (substitui o antigo pipeline de estados).
const VER_ARQUIVO = 'Não avança';
const VER_ENTRADA = ['Nova observação']; // entrada do funil
const VER_ACOMPANHAR = ['A acompanhar'];
const VER_CONTRATAR = ['Contratar'];
const VER_AVANCADOS = ['A acompanhar', 'Contratar']; // candidatos ativos (~ shortlist+)

// GET /api/dashboard/acoes — "Próximas ações": cruza os dados e diz o que fazer.
router.get(
  '/acoes',
  asyncHandler(async (req, res) => {
    const agora = new Date();
    const limiteParado = new Date(agora.getTime() - DIAS_SEM_ATUALIZACAO * 24 * 60 * 60 * 1000);
    const limite6m = new Date(agora.getFullYear(), agora.getMonth() + 6, agora.getDate());
    const inicioHoje = new Date(new Date().setHours(0, 0, 0, 0));
    const daqui7 = new Date(inicioHoje.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [players, contagens, jogosSemana] = await Promise.all([
      Player.find({ ...SEM_PLANTEL, veredito: { $ne: VER_ARQUIVO } })
        .select('nomeCompleto posicaoPrincipal veredito fimContrato ultimaAtividade rendimento potencialClass')
        .lean(),
      Observation.aggregate([{ $group: { _id: '$jogador', n: { $sum: 1 } } }]),
      Agendamento.find({ estado: 'Planeado', dataJogo: { $gte: inicioHoje, $lt: daqui7 } })
        .populate('jogador', 'nomeCompleto')
        .sort({ dataJogo: 1 })
        .lean(),
    ]);
    const obsPorJogador = Object.fromEntries(contagens.map((c) => [String(c._id), c.n]));
    const nObs = (p) => obsPorJogador[String(p._id)] || 0;
    const min = (p) => ({
      _id: p._id,
      nomeCompleto: p.nomeCompleto,
      posicaoPrincipal: p.posicaoPrincipal,
      veredito: p.veredito,
    });

    // Já observado 1x mas ainda sem a 2.ª (não nos interessam os que têm 0 obs —
    // são prospeção em massa, não alvos ativos). Exclui quem já tem veredito avançado.
    const precisaObservacao = players
      .filter((p) => nObs(p) === 1 && (!p.veredito || VER_ENTRADA.includes(p.veredito)))
      .map((p) => ({ ...min(p), observacoes: nObs(p) }));

    // Qualquer alvo (não só shortlist) com contrato a terminar em <= 6 meses.
    // Um jogador ainda em observação ou prospeção com contrato a acabar é a
    // transferência livre de melhor relação custo/valor — tem de ser sinalizado
    // cedo, não só depois de chegar à shortlist. `players` já exclui arquivados.
    const contratoAExpirar = players
      .filter((p) => p.fimContrato && new Date(p.fimContrato) <= limite6m)
      .map((p) => ({ ...min(p), fimContrato: p.fimContrato }));

    // Sem atualização há > 30 dias
    const parados = players
      .filter((p) => p.ultimaAtividade && new Date(p.ultimaAtividade) < limiteParado)
      .map(min);

    // Chegou à 3.ª observação mas ainda falta o veredito ou o R (rendimento) —
    // aviso para completar a classificação do jogador.
    const precisaAvaliacao = players
      .filter((p) => nObs(p) >= 3 && (!p.veredito || !p.rendimento))
      .map((p) => ({
        ...min(p),
        observacoes: nObs(p),
        falta: [!p.veredito && 'Veredito', !p.rendimento && 'R'].filter(Boolean),
      }));

    // Posições sem candidato ativo (0 em "A acompanhar" + "Contratar")
    const posicoesDefice = POSICOES.filter((pos) => {
      const avancados = players.filter(
        (p) => p.posicaoPrincipal === pos.key && VER_AVANCADOS.includes(p.veredito)
      ).length;
      return avancados === 0;
    }).map((pos) => ({ posicao: pos.key, label: pos.label }));

    const jogosAgendados = jogosSemana.map((a) => ({
      _id: a._id,
      dataJogo: a.dataJogo,
      competicao: a.competicao,
      adversario: a.adversario,
      jogador: a.jogador ? a.jogador.nomeCompleto : null,
    }));

    res.json({ precisaObservacao, precisaAvaliacao, contratoAExpirar, parados, posicoesDefice, jogosAgendados });
  })
);

// GET /api/dashboard/home-extra — dados extra para a página inicial (Home):
// alvos (veredito Contratar/A acompanhar), observações recentes, próximos jogos,
// jogos vistos (contagens), total de observados e posição do clube por competição.
router.get(
  '/home-extra',
  asyncHandler(async (req, res) => {
    const agora = new Date();
    const inicioHoje = new Date(new Date().setHours(0, 0, 0, 0));
    const daqui14 = new Date(inicioHoje.getTime() + 14 * 24 * 60 * 60 * 1000);
    const anoEpoca = agora.getMonth() >= 7 ? agora.getFullYear() : agora.getFullYear() - 1;
    const inicioEpoca = new Date(anoEpoca, 7, 1);

    const [alvos, obsRecentes, proximos, vistosEpoca, vistosTotal, idsComObs, classifs, comShadow] = await Promise.all([
      Player.find({ ...SEM_PLANTEL, veredito: { $in: VER_AVANCADOS } })
        .select(
          'nomeCompleto posicaoPrincipal clubeAtual dataNascimento veredito rendimento potencialClass perfil avaliacaoImediata avaliacaoMedioPrazo avaliacaoLongoPrazo ratingFinal foto fimContrato'
        )
        .lean(),
      Observation.find()
        .populate('jogador', 'nomeCompleto posicaoPrincipal doPlantel')
        .sort({ dataObservacao: -1, dataJogo: -1 })
        .limit(10)
        .lean(),
      Agendamento.find({ estado: 'Planeado', dataJogo: { $gte: inicioHoje, $lt: daqui14 } })
        .populate('jogador', 'nomeCompleto')
        .sort({ dataJogo: 1 })
        .limit(8)
        .lean(),
      ObservacaoJogo.countDocuments({ data: { $gte: inicioEpoca } }),
      ObservacaoJogo.countDocuments(),
      Observation.distinct('jogador'),
      Classificacao.find().lean(),
      Player.find({ shadowPos: { $exists: true, $nin: [null, []] } }).select('shadowPos').lean(),
    ]);

    // Resumo do 11-sombra: nº de jogadores atribuídos por posição (slot GR/DCE/…).
    const shadow = {};
    comShadow.forEach((p) => {
      const poss = Array.isArray(p.shadowPos) ? p.shadowPos : p.shadowPos ? [p.shadowPos] : [];
      poss.forEach((pos) => {
        if (pos) shadow[pos] = (shadow[pos] || 0) + 1;
      });
    });

    const idadeDe = (d) =>
      d ? Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
    const mapAlvo = (p) => ({
      _id: p._id,
      nome: p.nomeCompleto,
      pos: p.posicaoPrincipal,
      clube: p.clubeAtual || '',
      idade: idadeDe(p.dataNascimento),
      veredito: p.veredito,
      rendimento: p.rendimento || '',
      potencialClass: p.potencialClass || '',
      perfil: p.perfil || '',
      avaliacaoImediata: p.avaliacaoImediata ?? null,
      avaliacaoMedioPrazo: p.avaliacaoMedioPrazo ?? null,
      avaliacaoLongoPrazo: p.avaliacaoLongoPrazo ?? null,
      rating: p.ratingFinal ?? null,
      fimContrato: p.fimContrato || null,
      foto: p.foto && /^https?:\/\//i.test(p.foto) ? p.foto : null,
    });
    const contratar = alvos.filter((p) => p.veredito === 'Contratar').map(mapAlvo);
    const acompanhar = alvos.filter((p) => p.veredito === 'A acompanhar').map(mapAlvo);

    const observacoesRecentes = obsRecentes
      .filter((o) => o.jogador && !o.jogador.doPlantel)
      .slice(0, 6)
      .map((o) => ({
        jogadorId: o.jogador._id,
        jogador: o.jogador.nomeCompleto,
        pos: o.jogador.posicaoPrincipal,
        data: o.dataObservacao || o.dataJogo,
        competicao: o.competicao || '',
        adversario: o.adversario || '',
        rating: o.rating ?? null,
        veredito: o.veredito || null,
      }));

    const proximosJogos = proximos.map((a) => ({
      _id: a._id,
      dataJogo: a.dataJogo,
      hora: a.hora || '',
      competicao: a.competicao || '',
      adversario: a.adversario || '',
      jogador: a.jogador ? a.jogador.nomeCompleto : null,
    }));

    // Posição do clube em cada classificação guardada.
    const normNome = (s) =>
      (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
    const ehProprio = (nome) => normNome(nome).includes(CLUBE_PROPRIO_TOKEN);
    const competicoes = classifs
      .map((c) => {
        const linha = (c.linhas || []).find((l) => ehProprio(l.equipa));
        if (!linha) return null;
        return {
          competicao: c.competicao,
          serie: c.serie || '',
          posicao: linha.posicao ?? null,
          pontos: linha.pontos ?? null,
          jogos: linha.jogos ?? null,
          nEquipas: (c.linhas || []).length,
          atualizadoEm: c.atualizadoEm || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.posicao ?? 99) - (b.posicao ?? 99));

    res.json({
      contratar,
      acompanhar,
      observacoesRecentes,
      proximosJogos,
      jogosVistosEpoca: vistosEpoca,
      jogosVistosTotal: vistosTotal,
      totalObservados: idsComObs.length,
      competicoes,
      shadow,
      shadowTotal: comShadow.length,
    });
  })
);

// Calcula o sumário semanal (rotina de segunda do Modelo Operacional): o que
// foi feito e o que está planeado. Partilhado pela versão JSON e pela PDF.
async function calcularSumarioSemanal() {
  const agora = new Date();
    const ha7 = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inicioHoje = new Date(new Date().setHours(0, 0, 0, 0));
    const daqui7 = new Date(inicioHoje.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [observacoes, novos, jogosProximos] = await Promise.all([
      Observation.find({ dataObservacao: { $gte: ha7 } })
        .populate('jogador', 'nomeCompleto posicaoPrincipal doPlantel')
        .sort({ dataObservacao: -1, dataJogo: -1 })
        .lean(),
      Player.find({ ...SEM_PLANTEL, createdAt: { $gte: ha7 } })
        .select('nomeCompleto posicaoPrincipal veredito')
        .sort({ createdAt: -1 })
        .lean(),
      Agendamento.find({ estado: 'Planeado', dataJogo: { $gte: inicioHoje, $lt: daqui7 } })
        .populate('jogador', 'nomeCompleto')
        .sort({ dataJogo: 1 })
        .lean(),
    ]);

    // Jogos observados esta semana (exclui o plantel do clube)
    const observados = observacoes
      .filter((o) => o.jogador && !o.jogador.doPlantel)
      .map((o) => ({
        jogador: o.jogador.nomeCompleto,
        posicao: o.jogador.posicaoPrincipal,
        adversario: o.adversario || null,
        competicao: o.competicao || null,
        dataJogo: o.dataJogo,
        rating: o.rating ?? null,
        veredito: o.veredito || null,
      }));

    const jogos = jogosProximos.map((a) => ({
      jogador: a.jogador ? a.jogador.nomeCompleto : null,
      adversario: a.adversario || null,
      competicao: a.competicao || null,
      dataJogo: a.dataJogo,
    }));

    return {
      periodo: { de: ha7, a: agora },
      totais: {
        jogadoresObservados: new Set(observados.map((o) => o.jogador)).size,
        observacoes: observados.length,
        novosAlvos: novos.length,
        jogosProximos: jogos.length,
      },
      observados,
      novosAlvos: novos.map((p) => ({ jogador: p.nomeCompleto, posicao: p.posicaoPrincipal, veredito: p.veredito })),
      jogos,
    };
}

// GET /api/dashboard/sumario-semanal — versão JSON (para o modal de copiar).
router.get(
  '/sumario-semanal',
  asyncHandler(async (req, res) => {
    res.json(await calcularSumarioSemanal());
  })
);

// GET /api/dashboard/sumario-semanal.pdf — página imprimível (Guardar PDF).
router.get(
  '/sumario-semanal.pdf',
  asyncHandler(async (req, res) => {
    const dados = await calcularSumarioSemanal();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(sumarioSemanalHtml(dados, escudoDataUrl()));
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
    const ha7dias = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const limiteParado = new Date(agora.getTime() - DIAS_SEM_ATUALIZACAO * 24 * 60 * 60 * 1000);

    const [
      totalJogadores,
      emShortlist,
      emNegociacao,
      totalShortlistMais,
      observacoesMes,
      observacoesSemana,
      adicionadosSemana,
      ligasAtivas,
      jogadoresParados,
      jogadores,
      totalObservacoes,
    ] = await Promise.all([
      Player.countDocuments({ ...SEM_PLANTEL, veredito: { $ne: VER_ARQUIVO } }),
      Player.countDocuments({ ...SEM_PLANTEL, veredito: { $in: VER_ACOMPANHAR } }),
      Player.countDocuments({ ...SEM_PLANTEL, veredito: { $in: VER_CONTRATAR } }),
      Player.countDocuments({ ...SEM_PLANTEL, veredito: { $in: VER_AVANCADOS } }),
      Observation.find({ dataObservacao: { $gte: inicioMes, $lt: fimMes } }).select('jogador'),
      Observation.find({ dataObservacao: { $gte: ha7dias } }).select('jogador'),
      Player.countDocuments({ ...SEM_PLANTEL, createdAt: { $gte: ha7dias } }),
      League.countDocuments(),
      Player.countDocuments({ ...SEM_PLANTEL, veredito: { $ne: VER_ARQUIVO }, ultimaAtividade: { $lt: limiteParado } }),
      Player.find({ ...SEM_PLANTEL, veredito: { $ne: VER_ARQUIVO } }).select('posicaoPrincipal veredito'),
      Observation.countDocuments(), // total de observações (todas)
    ]);

    const jogadoresObservadosMes = new Set(observacoesMes.map((o) => String(o.jogador))).size;
    const jogadoresObservadosSemana = new Set(observacoesSemana.map((o) => String(o.jogador))).size;

    // Taxa de conversão: Contratar / candidatos ativos (A acompanhar + Contratar)
    const taxaConversao =
      totalShortlistMais > 0 ? Math.round((emNegociacao / totalShortlistMais) * 100) : null;

    // Funil do veredito (contagem por fase)
    const contaVer = (vs) => jogadores.filter((j) => vs.includes(j.veredito)).length;
    const funil = [
      { fase: 'Nova observação', n: contaVer(VER_ENTRADA) },
      { fase: 'A acompanhar', n: contaVer(VER_ACOMPANHAR) },
      { fase: 'Contratar', n: contaVer(VER_CONTRATAR) },
    ];

    // Cobertura por posição. Mantém as chaves (observacao/shortlist/prioridadeA)
    // mapeadas aos veredictos para o cliente.
    const cobertura = POSICOES.map((pos) => {
      const daPosicao = jogadores.filter((j) => j.posicaoPrincipal === pos.key);
      const observacao = daPosicao.filter((j) => VER_ENTRADA.includes(j.veredito)).length;
      const shortlist = daPosicao.filter((j) => VER_ACOMPANHAR.includes(j.veredito)).length;
      const prioridadeA = daPosicao.filter((j) => VER_CONTRATAR.includes(j.veredito)).length;
      const avancados = shortlist + prioridadeA; // candidatos ativos
      const adequada = avancados > 0;
      return { posicao: pos.key, label: pos.label, observacao, shortlist, prioridadeA, adequada };
    });

    res.json({
      totalJogadores,
      emShortlist,
      jogadoresObservadosMes,
      jogadoresObservadosSemana,
      totalObservacoes,
      adicionadosSemana,
      ligasAtivas,
      emNegociacao,
      taxaConversao,
      jogadoresParados,
      metas: METAS,
      diasSemAtualizacao: DIAS_SEM_ATUALIZACAO,
      funil,
      cobertura,
    });
  })
);

// GET /api/dashboard/controlo — controlo do trabalho: tudo o que mede o output
// do scout (jogos vistos, observações de jogador, jogadores processados,
// agendamentos e atividade recente).
router.get(
  '/controlo',
  asyncHandler(async (req, res) => {
    const agora = new Date();
    const inicioHoje = new Date(new Date().setHours(0, 0, 0, 0));
    const ha7 = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ha30 = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    // Época: começa a 1 de agosto (mês 7). De ago a dez conta o ano atual; de jan a jul conta o ano anterior.
    const anoEpoca = agora.getMonth() >= 7 ? agora.getFullYear() : agora.getFullYear() - 1;
    const inicioEpoca = new Date(anoEpoca, 7, 1);

    const [vistos, observacoes, players, agPlaneados, agConcluidos, agCancelados] = await Promise.all([
      ObservacaoJogo.find().sort({ data: -1 }).lean(),
      Observation.find().populate('jogador', 'nomeCompleto posicaoPrincipal doPlantel').sort({ dataObservacao: -1, dataJogo: -1 }).lean(),
      Player.find(SEM_PLANTEL).select('nomeCompleto veredito createdAt').lean(),
      Agendamento.countDocuments({ estado: 'Planeado', dataJogo: { $gte: inicioHoje } }),
      Agendamento.countDocuments({ estado: 'Concluído' }),
      Agendamento.countDocuments({ estado: 'Cancelado' }),
    ]);

    // Utilitário: conta ocorrências por chave e devolve [{ chave, n }] ordenado desc.
    const contaPor = (arr, keyFn, campo = 'chave') => {
      const m = {};
      arr.forEach((x) => {
        const k = keyFn(x);
        if (k == null || k === '') return;
        m[k] = (m[k] || 0) + 1;
      });
      return Object.entries(m)
        .map(([k, n]) => ({ [campo]: k, n }))
        .sort((a, b) => b.n - a.n);
    };
    const ymd = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    };

    // JOGOS VISTOS
    const dtV = (v) => new Date(v.data);
    const jogosVistos = {
      total: vistos.length,
      semana: vistos.filter((v) => dtV(v) >= ha7).length,
      mes: vistos.filter((v) => dtV(v) >= inicioMes).length,
      epoca: vistos.filter((v) => dtV(v) >= inicioEpoca).length,
      porCompeticao: contaPor(vistos, (v) => v.competicao, 'competicao'),
      porMes: contaPor(vistos, (v) => ymd(v.data), 'mes').sort((a, b) => a.mes.localeCompare(b.mes)),
      ultimos: vistos.slice(0, 8).map((v) => ({
        _id: v._id,
        data: v.data,
        hora: v.hora || '',
        competicao: v.competicao,
        serie: v.serie || '',
        casa: v.casa,
        fora: v.fora,
      })),
    };

    // OBSERVAÇÕES DE JOGADOR (exclui plantel do clube)
    const obs = observacoes.filter((o) => o.jogador && !o.jogador.doPlantel);
    const dataObs = (o) => o.dataObservacao || o.dataJogo;
    const observacoesJogador = {
      total: obs.length,
      semana: obs.filter((o) => new Date(dataObs(o)) >= ha7).length,
      mes: obs.filter((o) => new Date(dataObs(o)) >= inicioMes).length,
      porVeredito: contaPor(obs, (o) => o.veredito, 'veredito'),
      porMes: contaPor(obs, (o) => ymd(dataObs(o)), 'mes').sort((a, b) => a.mes.localeCompare(b.mes)),
      ultimas: obs.slice(0, 8).map((o) => ({
        jogadorId: o.jogador._id,
        jogador: o.jogador.nomeCompleto,
        posicao: o.jogador.posicaoPrincipal,
        data: dataObs(o),
        competicao: o.competicao || '',
        adversario: o.adversario || '',
        rating: o.rating ?? null,
        veredito: o.veredito || null,
      })),
    };

    // JOGADORES processados (ativos = veredito != "Não avança")
    const ativos = players.filter((p) => p.veredito !== 'Não avança');
    const jogadores = {
      totalScouting: ativos.length,
      adicionadosSemana: players.filter((p) => new Date(p.createdAt) >= ha7).length,
      adicionadosMes: players.filter((p) => new Date(p.createdAt) >= inicioMes).length,
      porVeredito: contaPor(players, (p) => p.veredito, 'veredito'),
      adicionadosPorMes: contaPor(players, (p) => ymd(p.createdAt), 'mes').sort((a, b) => a.mes.localeCompare(b.mes)),
    };

    // ATIVIDADE recente (feed unificado)
    const atividade = [
      ...vistos.map((v) => ({
        tipo: 'jogo-visto',
        quando: v.createdAt || v.data,
        texto: `Vi ${v.casa} × ${v.fora}`,
        sub: [v.competicao, v.serie].filter(Boolean).join(' · '),
      })),
      ...obs.map((o) => ({
        tipo: 'observacao',
        quando: o.createdAt || o.dataJogo,
        texto: `Observação: ${o.jogador.nomeCompleto}`,
        sub: [o.competicao, o.veredito || null].filter(Boolean).join(' · '),
      })),
      ...players
        .filter((p) => new Date(p.createdAt) >= ha30)
        .map((p) => ({
          tipo: 'jogador',
          quando: p.createdAt,
          texto: `Novo alvo: ${p.nomeCompleto}`,
          sub: p.veredito || '',
        })),
    ]
      .sort((a, b) => new Date(b.quando) - new Date(a.quando))
      .slice(0, 300); // paginado no cliente (15/página)

    res.json({
      jogosVistos,
      observacoesJogador,
      jogadores,
      agendamentos: { planeados: agPlaneados, concluidos: agConcluidos, cancelados: agCancelados },
      atividade,
    });
  })
);

// GET /api/dashboard/cobertura — matriz de cobertura por equipa, ao estilo do Excel:
// as EQUIPAS-alvo de cada competição (universo vindo do calendário) e os jogos VÊM
// DA AGENDA (agendamentos). Marcar um agendamento como "Concluído" (o check) conta
// +1 para AS DUAS equipas do jogo. O universo de equipas vem do calendário só para
// listar quem falta; os vistos vêm 100% da agenda (que o utilizador pode alterar).
const COBERTURA_ALVOS = [
  // Competições cobertas pelo scout. Ajusta os nomes/séries para casarem com os
  // dados importados (calendário e classificações). `objetivo` = nº de jogos a ver
  // por secção; `sinaliza` realça clubes com jogadores-alvo; `contador` = só conta
  // jogos vistos, sem objetivo fixo.
  { comp: 'Liga Principal', serie: 'Série A', label: 'Liga · Série A', objetivo: 3 },
  { comp: 'Liga Regional — 1ª Divisão', serie: '', label: 'Regional', objetivo: 3 },
  { comp: 'Liga Sub-23', serie: '', label: 'Sub-23', objetivo: 1, sinaliza: true },
  { comp: 'Liga Sub-19', serie: 'Série A', label: 'Sub-19 · Série A', objetivo: 1, sinaliza: true },
  { comp: 'Liga Principal', serie: 'Série B', label: 'Liga · Série B', contador: true, sinaliza: true },
  { comp: 'Liga Principal', serie: 'Série C', label: 'Liga · Série C', contador: true, sinaliza: true },
  { comp: 'Liga Sub-19', serie: 'Série B', label: 'Sub-19 · Série B', contador: true, sinaliza: true },
];
// Normaliza nomes de clube para casar jogador↔equipa (acentos, aspas, pontos).
const normClube = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/["'`.]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
router.get(
  '/cobertura',
  asyncHandler(async (req, res) => {
    // Nº de jogadores (não-plantel) por clube — para sinalizar os clubes que têm
    // alvos (ex.: jogadores da zona nas outras séries do CP).
    const jogadoresClube = await Player.find({ doPlantel: { $ne: true } }).select('clubeAtual').lean();
    const alvosPorClube = {};
    for (const p of jogadoresClube) {
      const k = normClube(p.clubeAtual);
      if (k) alvosPorClube[k] = (alvosPorClube[k] || 0) + 1;
    }
    // Universo de equipas por secção (nomes canónicos do calendário).
    const secoes = [];
    for (const a of COBERTURA_ALVOS) {
      const filtro = { competicao: a.comp };
      if (a.serie) filtro.serie = a.serie;
      const jc = await CalendarioJogo.find(filtro).select('casa fora').lean();
      const equipas = [...new Set(jc.flatMap((j) => [j.casa, j.fora]).filter(Boolean))].sort((x, y) =>
        x.localeCompare(y, 'pt')
      );
      const alvos = {};
      for (const e of equipas) alvos[e] = alvosPorClube[normClube(e)] || 0;
      secoes.push({
        comp: a.comp,
        serie: a.serie,
        label: a.label,
        objetivo: a.objetivo ?? null,
        contador: !!a.contador,
        sinaliza: !!a.sinaliza,
        equipas,
        alvos,
      });
    }
    // Jogos da AGENDA (não cancelados): fonte de verdade dos vistos + a lista de check.
    // casa/fora canónicos vêm do jogo ligado (calendarioJogo); nos manuais parte-se o
    // "adversario" ("Casa x Fora"), como o PlanoSemana faz.
    const ags = await Agendamento.find({ estado: { $ne: 'Cancelado' } })
      .populate('calendarioJogo', 'casa fora competicao serie data hora')
      .sort({ visionamento: 1, dataJogo: 1 })
      .lean();
    const parte = (adv) => {
      const p = (adv || '').split(/\s+x\s+/i);
      return p.length === 2 ? { casa: p[0].trim(), fora: p[1].trim() } : { casa: '', fora: '' };
    };
    const jogos = ags.map((a) => {
      const cj = a.calendarioJogo;
      const pr = parte(a.adversario);
      const casa = cj?.casa || pr.casa;
      const fora = cj?.fora || pr.fora;
      return {
        _id: a._id,
        calendarioJogo: cj?._id || null,
        estado: a.estado,
        data: cj?.data || a.dataJogo,
        hora: a.hora || cj?.hora || '',
        visionamento: a.visionamento || null,
        // Preferir competição/série canónicas do jogo do calendário (competição
        // "limpa" + série separada) — casa com as secções e com os jogos vistos.
        competicao: cj?.competicao || a.competicao || '',
        serie: cj?.serie || a.serie || '',
        modo: a.modo || 'diferido',
        casa,
        fora,
        adversario: a.adversario || `${casa} x ${fora}`,
        origem: a.origem || null,
      };
    });

    // FONTE ÚNICA de "jogos vistos" = ObservacaoJogo (a mesma do Controlo → Resumo
    // e da aba "Jogos vistos"). Casa/fora/competição/série canónicas vêm do jogo do
    // calendário ligado, para casar com as secções e as equipas da matriz.
    const vistosRaw = await ObservacaoJogo.find()
      .populate('calendarioJogo', 'casa fora competicao serie data')
      .lean();
    const vistos = vistosRaw.map((v) => {
      const cj = v.calendarioJogo;
      return {
        _id: v._id,
        calendarioJogo: cj?._id || null,
        data: cj?.data || v.data,
        casa: cj?.casa || v.casa || '',
        fora: cj?.fora || v.fora || '',
        competicao: cj?.competicao || v.competicao || '',
        serie: cj?.serie || v.serie || '',
      };
    });

    res.json({ secoes, jogos, vistos });
  })
);

export default router;
