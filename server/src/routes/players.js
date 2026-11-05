import { Router } from 'express';
import Player from '../models/Player.js';
import Observation from '../models/Observation.js';
import Contact from '../models/Contact.js';
import Agendamento from '../models/Agendamento.js';
import Club from '../models/Club.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { construirFiltroJogadores } from '../utils/filtroJogadores.js';
import { gerarRelatorioRca } from '../utils/relatorioRca.js';
import { perfilDeDados } from '../utils/perfilDados.js';
import { gerarFolhaObservacao } from '../utils/folhaObservacao.js';
import { normalizarNome } from '../utils/regex.js';

const router = Router();

// POST /api/players/sincronizar-zerozero — atualiza as estatísticas da época dos
// jogadores que JÁ existem na lista, casando pelo zerozeroId (ou pelo nome, e nesse
// caso guarda o id para as próximas ficarem por id). NÃO cria jogadores novos.
// Chamado pela atualização semanal da integração externa.
// Body: { epoca, jogadores: [{ zerozeroId, nome, competicao, jogos, minutos, titular, golos, alturaCm, url }] }
router.post(
  '/sincronizar-zerozero',
  asyncHandler(async (req, res) => {
    const { epoca, jogadores } = req.body || {};
    if (!Array.isArray(jogadores)) return res.status(400).json({ erro: 'jogadores (array) obrigatório' });

    const porId = new Map();
    const porNome = new Map();
    for (const r of jogadores) {
      if (r.zerozeroId != null) porId.set(String(r.zerozeroId), r);
      const k = normalizarNome(r.nome || '');
      if (!k) continue;
      let arr = porNome.get(k);
      if (!arr) porNome.set(k, (arr = []));
      arr.push(r);
    }

    const alturaTexto = (cm) => (cm ? `${(cm / 100).toFixed(2).replace('.', ',')} m` : null);
    // Pé do zerozero ("Direito" / "Esquerdo" / "Direito/Esquerdo") -> enum do modelo.
    const pePref = (v) => {
      if (!v) return null;
      const s = String(v).toLowerCase();
      if (s.includes('/') || s.includes('ambi')) return 'Ambidestro';
      if (s.startsWith('direito')) return 'Direito';
      if (s.startsWith('esquerdo')) return 'Esquerdo';
      return null;
    };

    const players = await Player.find().select('nomeCompleto zerozeroId altura pePreferencial clubeAtual');
    let atualizados = 0;
    let backfilled = 0;
    for (const p of players) {
      let r = p.zerozeroId ? porId.get(String(p.zerozeroId)) : null;
      let casouPorNome = false;
      if (!r) {
        const cand = porNome.get(normalizarNome(p.nomeCompleto)) || [];
        if (cand.length === 1) {
          r = cand[0];
          casouPorNome = true;
        } else if (cand.length > 1 && p.clubeAtual) {
          // Nome comum (vários no zerozero) → desambigua pelo clube.
          const doClube = cand.filter((x) => normalizarNome(x.equipa || '') === normalizarNome(p.clubeAtual));
          if (doClube.length === 1) {
            r = doClube[0];
            casouPorNome = true;
          }
        }
      }
      if (!r) continue;

      const set = {
        statsZerozero: {
          epoca: epoca || null,
          competicao: r.competicao || null,
          jogos: r.jogos ?? null,
          minutos: r.minutos ?? null,
          titular: r.titular ?? null,
          golos: r.golos ?? null,
          atualizadoEm: new Date(),
        },
      };
      if (casouPorNome && r.zerozeroId != null) {
        set.zerozeroId = String(r.zerozeroId);
        backfilled++;
      }
      if (r.url) set.zerozeroUrl = r.url;
      const alt = alturaTexto(r.alturaCm);
      if (alt && (!p.altura || !p.altura.trim())) set.altura = alt;
      const pe = pePref(r.pePreferido);
      if (pe && (!p.pePreferencial || !p.pePreferencial.trim())) set.pePreferencial = pe;

      // updateOne (sem pre-save): não marca "atividade" nem recalcula o rating.
      await Player.updateOne({ _id: p._id }, { $set: set });
      atualizados++;
    }
    res.json({ ok: true, epoca: epoca || null, recebidos: jogadores.length, atualizados, backfilled });
  })
);

// GET /api/players — lista com filtros e pesquisa
// query: posicao, estado, prioridade, liga, passaporte, fimContratoAntes, contrato, mercado, q, incluirArquivo
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filtro = construirFiltroJogadores(req.query);
    // Equipa técnica: na Base de dados só vê jogadores com veredito "Contratar"
    // (o Plantel — plantel=true — fica à parte: vê-o na mesma).
    if (req.user?.papel === 'tecnico' && req.query.plantel !== 'true') filtro.veredito = 'Contratar';
    // Base de dados: só jogadores com pelo menos uma observação.
    let idsComObs = null;
    if (req.query.comObservacao === 'true') {
      idsComObs = await Observation.distinct('jogador');
      filtro._id = { $in: idsComObs };
    }
    // Miniatura na lista: enviamos a foto quando é um URL leve (ex.: zerozero).
    // Fotos em data-URL (upload manual, base64 pesado) ficam só para a ficha
    // individual, para não pesar a listagem.
    // Ordem base estável = ordem de adição, mais recentes primeiro (createdAt desc).
    // A página reordena no cliente com cabeçalhos clicáveis; isto garante que a
    // base e o CSV não saltam por causa de edições.
    const players = await Player.find(filtro).sort({ createdAt: -1 });
    // Nº e data da última observação por jogador (uma agregação só).
    const contagens = await Observation.aggregate([
      { $group: { _id: '$jogador', n: { $sum: 1 }, ultima: { $max: '$dataJogo' } } },
    ]);
    const nObsPorJogador = Object.fromEntries(contagens.map((c) => [String(c._id), c.n]));
    const ultimaPorJogador = Object.fromEntries(contagens.map((c) => [String(c._id), c.ultima]));
    // `seq` = ordem de adição (mais antigo = 1), independente do filtro/ordem de
    // visualização — é o nº da coluna "#". No modo Base de dados (comObservacao)
    // é CONTÍGUO só entre os jogadores com observação (1..N); senão é global.
    const filtroSeq = { doPlantel: { $ne: true } };
    if (idsComObs) filtroSeq._id = { $in: idsComObs };
    const ordemGlobal = await Player.find(filtroSeq).select('_id').sort({ createdAt: 1 }).lean();
    const seqPorJogador = Object.fromEntries(ordemGlobal.map((p, i) => [String(p._id), i + 1]));
    const saida = players.map((p) => {
      const o = p.toJSON();
      if (o.foto && !/^https?:\/\//i.test(o.foto)) delete o.foto;
      o.nObservacoes = nObsPorJogador[String(p._id)] || 0;
      o.ultimaObservacao = ultimaPorJogador[String(p._id)] || null;
      o.seq = seqPorJogador[String(p._id)] || null;
      return o;
    });
    res.json(saida);
  })
);

// GET /api/players/contadores — nº de jogadores de scouting por veredito (painel
// de referência da Base de dados). Só contagens — acessível a todos os papéis.
// Registada ANTES de /:id para não ser apanhada por ela.
router.get(
  '/contadores',
  asyncHandler(async (req, res) => {
    const agg = await Player.aggregate([
      { $match: { doPlantel: { $ne: true } } },
      { $group: { _id: '$veredito', n: { $sum: 1 } } },
    ]);
    const porVeredito = {};
    let total = 0;
    for (const r of agg) {
      total += r.n;
      if (r._id) porVeredito[r._id] = r.n;
    }
    res.json({ porVeredito, total });
  })
);

// GET /api/players/:id — ficha + histórico de observações
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });
    // Equipa técnica: só os jogadores "Contratar" (ou do plantel) e SEM as
    // observações em bruto.
    const ehTecnico = req.user?.papel === 'tecnico';
    if (ehTecnico && !player.doPlantel && player.veredito !== 'Contratar') {
      return res.status(404).json({ erro: 'Jogador não encontrado' });
    }
    const observacoes = ehTecnico
      ? []
      : await Observation.find({ jogador: player._id }).sort({ dataObservacao: -1, dataJogo: -1 });
    res.json({ ...player.toJSON(), observacoes });
  })
);

// GET /api/players/:id/relatorio — relatório no template RCA, já preenchido
router.get(
  '/:id/relatorio',
  asyncHandler(async (req, res) => {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });
    if (req.user?.papel === 'tecnico' && !player.doPlantel && player.veredito !== 'Contratar') {
      return res.status(404).json({ erro: 'Jogador não encontrado' });
    }
    const observacoes = await Observation.find({ jogador: player._id }).sort({ dataJogo: -1 });
    const perfisDados = await perfilDeDados(player._id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(gerarRelatorioRca({ ...player.toJSON(), observacoes, perfisDados }));
  })
);

// GET /api/players/:id/folha-observacao — folha imprimível para preencher à mão
// no jogo (cabeçalho pré-preenchido). Use id "branco" para o bloco em branco.
router.get(
  '/:id/folha-observacao',
  asyncHandler(async (req, res) => {
    let player = null;
    if (req.params.id !== 'branco') {
      player = await Player.findById(req.params.id);
      if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });
    }
    // Contexto do jogo, opcional (via query, vindo da Agenda): data, competicao, jogo, adversario, hora.
    const { data, competicao, jogo, adversario, hora } = req.query;
    const ctxJogo = data || competicao || jogo || adversario ? { data, competicao, jogo, adversario, hora } : null;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(gerarFolhaObservacao(player ? player.toJSON() : null, ctxJogo));
  })
);

// POST /api/players — criar. Guarda contra duplicados: se já existir um jogador
// com o mesmo nome (ignorando acentos/maiúsculas/espaços), devolve 409 com os
// candidatos, a menos que se force com ?forcar=true.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    // Um dia (YYYY-MM-DD) a partir de Date/string, ou null se não houver.
    const diaNasc = (v) => {
      if (!v) return null;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    };
    const nomeNovo = normalizarNome(req.body?.nomeCompleto || '');
    const nascNovo = diaNasc(req.body?.dataNascimento);
    if (nomeNovo && req.query.forcar !== 'true') {
      const existentes = await Player.find()
        .select('nomeCompleto posicaoPrincipal clubeAtual estado doPlantel dataNascimento')
        .lean();
      // Só é duplicado se o nome bater E (havendo datas) a data de nascimento
      // também. Homónimos com datas diferentes entram sem aviso; se faltar a data
      // a algum dos lados, mantém-se o aviso por precaução.
      const duplicados = existentes.filter((p) => {
        if (normalizarNome(p.nomeCompleto) !== nomeNovo) return false;
        const nascP = diaNasc(p.dataNascimento);
        if (nascNovo && nascP) return nascNovo === nascP;
        return true;
      });
      if (duplicados.length) {
        return res.status(409).json({
          erro: 'Já existe um jogador com este nome e data de nascimento.',
          duplicados,
        });
      }
    }
    const player = await Player.create(req.body);
    res.status(201).json(player);
  })
);

// PUT /api/players/:id — editar
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });
    Object.assign(player, req.body);
    await player.save(); // dispara recálculo do ratingFinal
    res.json(player);
  })
);

// PATCH /api/players/:id/shadow — define/limpa as posições do jogador na Shadow
// Team (independentes da posição de perfil). Body: { shadowPos: ['<chave>', …] }.
// Aceita também uma string única ou null (compat.); normaliza, remove duplicados
// e limita a 3 posições. [] = fora da Shadow Team.
router.patch(
  '/:id/shadow',
  asyncHandler(async (req, res) => {
    const bruto = req.body.shadowPos;
    const lista = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];
    const posicoes = [...new Set(lista.filter(Boolean))].slice(0, 3);
    const player = await Player.findByIdAndUpdate(req.params.id, { shadowPos: posicoes }, { new: true });
    if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });
    res.json(player);
  })
);

// PATCH /api/players/:id/plano — define o planeamento do plantel. Body pode ter
// { planoEstatuto: 'priority'|'potencial'|'emprestar'|null } e/ou
// { planoTier: 'A'|'B'|'C'|'D'|null }. Atualiza só os campos enviados.
router.patch(
  '/:id/plano',
  asyncHandler(async (req, res) => {
    // Época: 'momento' escreve nos campos de topo; 'proxima' no sub-objeto planoProx.
    const pref = req.body.epoca === 'proxima' ? 'planoProx.' : '';
    const set = {};
    if ('planoEstatuto' in req.body) {
      const v = req.body.planoEstatuto;
      set[pref + 'planoEstatuto'] = ['priority', 'potencial', 'emprestar'].includes(v) ? v : null;
    }
    if ('planoTier' in req.body) {
      const v = req.body.planoTier;
      set[pref + 'planoTier'] = ['A', 'B', 'C', 'D'].includes(v) ? v : null;
    }
    if ('planoPos' in req.body) {
      const v = req.body.planoPos;
      const SLOTS = ['GR', 'DCE', 'DCC', 'DCD', 'DE', 'MDF', 'MC', 'DD', 'EE', 'PL', 'ED'];
      set[pref + 'planoPos'] = SLOTS.includes(v) ? v : null;
    }
    if ('planoOrdem' in req.body) {
      const n = Number(req.body.planoOrdem);
      set[pref + 'planoOrdem'] = Number.isFinite(n) ? n : 0;
    }
    const player = await Player.findByIdAndUpdate(req.params.id, set, { new: true });
    if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });
    res.json(player);
  })
);


// PATCH /api/players/:id/classificacao — editor rápido do sistema de classificação
// (Base de dados / ficha): rendimento, potencial, perfil, 3 avaliações, veredito.
router.patch(
  '/:id/classificacao',
  asyncHandler(async (req, res) => {
    const campos = {};
    for (const k of ['rendimento', 'potencialClass', 'perfil', 'veredito']) {
      if (req.body[k] !== undefined) campos[k] = req.body[k];
    }
    for (const k of ['avaliacaoImediata', 'avaliacaoMedioPrazo', 'avaliacaoLongoPrazo']) {
      if (req.body[k] !== undefined) campos[k] = req.body[k] === '' || req.body[k] == null ? null : Number(req.body[k]);
    }
    const player = await Player.findByIdAndUpdate(req.params.id, campos, { new: true, runValidators: true });
    if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });
    res.json(player);
  })
);

// DELETE /api/players/:id — arquivar (soft) ou eliminar definitivo (?hard=true)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.query.hard === 'true') {
      const id = req.params.id;
      await Observation.deleteMany({ jogador: id });
      // Limpar referências ao jogador para não deixar IDs pendurados que
      // rebentam a página Contactos (populate → null → .map) e a Agenda.
      await Contact.updateMany(
        { jogadoresRepresentados: id },
        { $pull: { jogadoresRepresentados: id } }
      );
      await Agendamento.updateMany({ jogador: id }, { $set: { jogador: null } });
      await Player.findByIdAndDelete(id);
      return res.json({ ok: true, eliminado: true });
    }
    // Arquivar (soft) = veredito "Não avança" (substitui o antigo estado Arquivo).
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { veredito: 'Não avança' },
      { new: true }
    );
    if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });
    res.json(player);
  })
);

// GET /api/players/:id/jogos-por-reportar — jogos que o utilizador marcou como VISTOS
// (agendamentos 'Concluído') em que o clube DESTE jogador entrou (casa ou fora).
// Serve para sugerir o jogo ao escrever a observação: um clique preenche
// data/competição/adversário. `jaReportado` = já há uma observação deste jogador nesse dia.
const _norm = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[."'`]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
router.get(
  '/:id/jogos-por-reportar',
  asyncHandler(async (req, res) => {
    const player = await Player.findById(req.params.id)
      .select('clube clubeAtual clubeSecundario clubeSecundarioNome')
      .lean();
    if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });

    const clubeIds = new Set([player.clube, player.clubeSecundario].filter(Boolean).map(String));
    const nomesJog = new Set([player.clubeAtual, player.clubeSecundarioNome].filter(Boolean).map(_norm));

    // nome de equipa (do calendário) -> clube, por nome canónico + apelidos.
    const clubes = await Club.find().select('nome apelidos').lean();
    const nomeParaClube = {};
    for (const c of clubes) {
      nomeParaClube[_norm(c.nome)] = String(c._id);
      for (const a of c.apelidos || []) {
        const k = _norm(a);
        if (k) nomeParaClube[k] = String(c._id);
      }
    }
    const pertence = (equipa) => {
      const k = _norm(equipa);
      const cid = nomeParaClube[k];
      return (cid && clubeIds.has(cid)) || nomesJog.has(k);
    };

    const ags = await Agendamento.find({ estado: 'Concluído', calendarioJogo: { $ne: null } })
      .populate('calendarioJogo', 'casa fora data hora competicao serie')
      .sort({ visionamento: -1, dataJogo: -1 })
      .lean();
    const obs = await Observation.find({ jogador: req.params.id }).select('dataJogo').lean();
    const diasObs = new Set(obs.map((o) => new Date(o.dataJogo).toISOString().slice(0, 10)));

    const vistos = new Set();
    const out = [];
    for (const a of ags) {
      const g = a.calendarioJogo;
      if (!g || vistos.has(String(g._id))) continue;
      const ehCasa = pertence(g.casa);
      const ehFora = pertence(g.fora);
      if (!ehCasa && !ehFora) continue;
      vistos.add(String(g._id));
      const dia = g.data ? new Date(g.data).toISOString().slice(0, 10) : null;
      out.push({
        calendarioJogo: String(g._id),
        data: g.data,
        hora: g.hora || '',
        competicao: g.competicao || a.competicao || '',
        serie: g.serie || '',
        casa: g.casa,
        fora: g.fora,
        adversario: ehCasa ? g.fora : g.casa,
        jaReportado: dia ? diasObs.has(dia) : false,
      });
    }
    res.json(out);
  })
);

export default router;
