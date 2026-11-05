import { Router } from 'express';
import CalendarioJogo from '../models/CalendarioJogo.js';
import Player from '../models/Player.js';
import Club from '../models/Club.js';
import Agendamento from '../models/Agendamento.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// POST /api/calendario/importar — insere os jogos de uma competição, substituindo
// os que já existirem dessa competição+época. Body: { competicao, epoca, jogos:[{serie,jornada,data,casa,fora}] }
router.post(
  '/importar',
  asyncHandler(async (req, res) => {
    const { competicao, epoca, jogos } = req.body || {};
    if (!competicao || !Array.isArray(jogos) || !jogos.length) {
      return res.status(400).json({ erro: 'competicao e jogos (array não vazio) são obrigatórios' });
    }
    await CalendarioJogo.deleteMany({ competicao, epoca });
    const docs = jogos
      .filter((j) => j.casa && j.fora)
      .map((j) => {
        // Hora "HH:MM": explícita (j.hora) ou extraída de um datetime em j.data.
        let hora = (j.hora || '').trim();
        if (!hora && /\d{2}:\d{2}/.test(String(j.data || ''))) {
          hora = String(j.data).match(/(\d{2}:\d{2})/)[1];
        }
        return {
          competicao,
          epoca,
          serie: j.serie || '',
          jornada: j.jornada,
          data: j.data ? new Date(String(j.data).slice(0, 10) + 'T12:00:00Z') : undefined,
          hora,
          casa: j.casa,
          fora: j.fora,
        };
      });
    await CalendarioJogo.insertMany(docs);
    res.json({ ok: true, inseridos: docs.length });
  })
);

// PATCH /api/calendario/:id — editar campos de um jogo (hora, data, casa, fora).
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const permitido = {};
    for (const k of ['hora', 'casa', 'fora', 'serie', 'jornada']) {
      if (req.body[k] !== undefined) permitido[k] = req.body[k];
    }
    if (req.body.data) permitido.data = new Date(String(req.body.data).slice(0, 10) + 'T12:00:00Z');
    const jg = await CalendarioJogo.findByIdAndUpdate(req.params.id, permitido, { new: true });
    if (!jg) return res.status(404).json({ erro: 'Jogo não encontrado' });
    res.json(jg);
  })
);

const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // acentos
    .replace(/[."'`]/g, '') // aspas e pontos (ex.: "S. C." -> "S C")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// POST /api/calendario/atualizar-horas — atualiza só a hora de jogos existentes,
// casando por competição + equipas (casa/fora normalizadas) [+ jornada].
// Body: { competicao, epoca?, jogos:[{ jornada?, casa, fora, hora }] }. Não apaga nada.
router.post(
  '/atualizar-horas',
  asyncHandler(async (req, res) => {
    const { competicao, epoca, jogos } = req.body || {};
    if (!competicao || !Array.isArray(jogos)) {
      return res.status(400).json({ erro: 'competicao e jogos são obrigatórios' });
    }
    const filtro = { competicao };
    if (epoca) filtro.epoca = epoca;
    const existentes = await CalendarioJogo.find(filtro).lean();
    const chave = (casa, fora, jornada) => `${norm(casa)}|${norm(fora)}|${jornada ?? ''}`;
    const mapa = {};
    existentes.forEach((j) => {
      mapa[chave(j.casa, j.fora, j.jornada)] = j._id;
      mapa[chave(j.casa, j.fora, undefined)] = mapa[chave(j.casa, j.fora, undefined)] || j._id;
    });
    let atualizados = 0;
    const semMatch = [];
    for (const j of jogos) {
      if (!j.hora) continue;
      const id = mapa[chave(j.casa, j.fora, j.jornada)] || mapa[chave(j.casa, j.fora, undefined)];
      if (!id) {
        semMatch.push(`${j.casa} x ${j.fora}`);
        continue;
      }
      await CalendarioJogo.findByIdAndUpdate(id, { hora: String(j.hora).trim() });
      atualizados++;
    }
    res.json({ ok: true, atualizados, semMatch });
  })
);

// POST /api/calendario/sufixar-equipas — acrescenta um sufixo ao nome das equipas
// (casa/fora) de todos os jogos de uma competição. Ex.: distinguir escalões
// (Sub-19/Sub-23) que partilham nome com as equipas seniores. Idempotente.
// Body: { competicao, sufixo }  (sufixo já com o espaço, ex.: " Sub-19")
router.post(
  '/sufixar-equipas',
  asyncHandler(async (req, res) => {
    const { competicao, sufixo } = req.body || {};
    if (!competicao || !sufixo) return res.status(400).json({ erro: 'competicao e sufixo obrigatórios' });
    const jogos = await CalendarioJogo.find({ competicao });
    let atualizados = 0;
    for (const jg of jogos) {
      let mud = false;
      if (jg.casa && !jg.casa.endsWith(sufixo)) { jg.casa += sufixo; mud = true; }
      if (jg.fora && !jg.fora.endsWith(sufixo)) { jg.fora += sufixo; mud = true; }
      if (mud) { await jg.save(); atualizados++; }
    }
    res.json({ ok: true, atualizados });
  })
);

// GET /api/calendario — jogos com filtros (competicao, epoca, serie, jornada, clube, futuros)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { competicao, epoca, serie, jornada, clube, futuros } = req.query;
    const filtro = {};
    if (competicao) filtro.competicao = competicao;
    if (epoca) filtro.epoca = epoca;
    if (serie) filtro.serie = serie;
    if (jornada) filtro.jornada = Number(jornada);
    if (clube) filtro.$or = [{ casa: clube }, { fora: clube }];
    if (futuros === 'true') filtro.data = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
    const jogos = await CalendarioJogo.find(filtro).sort({ data: 1, hora: 1, serie: 1, jornada: 1 }).lean();
    res.json(jogos);
  })
);

// GET /api/calendario/meta — valores distintos para os filtros da página
router.get(
  '/meta',
  asyncHandler(async (req, res) => {
    const [competicoes, epocas, series] = await Promise.all([
      CalendarioJogo.distinct('competicao'),
      CalendarioJogo.distinct('epoca'),
      CalendarioJogo.distinct('serie'),
    ]);
    res.json({ competicoes: competicoes.sort(), epocas: epocas.sort(), series: series.filter(Boolean).sort() });
  })
);

// GET /api/calendario/dos-jogadores — próximos jogos com os jogadores em scouting
// de AMBAS as equipas. Resolve o nome da equipa → clube (por referência Player.clube,
// com fallback ao nome), soma casa+fora e devolve nObservaveis por jogo. É o que a
// Agenda mostra automaticamente.
router.get(
  '/dos-jogadores',
  asyncHandler(async (req, res) => {
    // Equipa técnica/treinador não vê quantos jogadores da base de dados há em
    // cada jogo/equipa (nem os nomes no detalhe do jogo).
    if (req.user?.papel === 'tecnico') return res.json([]);
    const jogadores = await Player.find({ doPlantel: { $ne: true }, estado: { $ne: 'Arquivo' } })
      .select('nomeCompleto clubeAtual clube clubeSecundario clubeSecundarioNome posicaoPrincipal estado prioridade')
      .lean();

    // Mapa clube(_id) → jogadores (fonte de verdade: a referência Player.clube).
    const porClubeId = {};
    // Fallback por nome, só para jogadores ainda NÃO ligados a um clube.
    const porNome = {};
    const indexar = (j, ref, nome) => {
      if (ref) {
        const k = String(ref);
        (porClubeId[k] = porClubeId[k] || []).push(j);
      } else if (nome) {
        const k = norm(nome);
        if (k) (porNome[k] = porNome[k] || []).push(j);
      }
    };
    jogadores.forEach((j) => {
      indexar(j, j.clube, j.clubeAtual);
      // 2.ª equipa: o jogador também é alvo nos jogos dessa equipa.
      if (j.clubeSecundario || j.clubeSecundarioNome) indexar(j, j.clubeSecundario, j.clubeSecundarioNome);
    });
    if (!Object.keys(porClubeId).length && !Object.keys(porNome).length) return res.json([]);

    // Resolver nome de equipa → clube: por nome canónico e por apelidos.
    const clubes = await Club.find().select('nome apelidos').lean();
    const nomeParaClube = {};
    clubes.forEach((c) => {
      nomeParaClube[norm(c.nome)] = String(c._id);
      (c.apelidos || []).forEach((a) => {
        const k = norm(a);
        if (k) nomeParaClube[k] = String(c._id);
      });
    });

    const leve = (p) => ({
      _id: p._id,
      nome: p.nomeCompleto,
      posicao: p.posicaoPrincipal,
      estado: p.estado,
      prioridade: p.prioridade || null,
    });
    // Jogadores em scouting de uma equipa (por nome do calendário): junta os que
    // estão ligados ao clube resolvido + os que batem por nome (não ligados), sem repetir.
    const daEquipa = (nomeEquipa) => {
      const chave = norm(nomeEquipa);
      const clubeId = nomeParaClube[chave];
      const lista = [];
      const vistos = new Set();
      const juntar = (arr) => {
        (arr || []).forEach((p) => {
          const id = String(p._id);
          if (!vistos.has(id)) {
            vistos.add(id);
            lista.push(leve(p));
          }
        });
      };
      if (clubeId) juntar(porClubeId[clubeId]);
      juntar(porNome[chave]);
      return lista;
    };

    // Jogos futuros (sugestões) + os que já estão na Agenda (agendamentos), seja
    // qual for a data — senão os jogos vistos em DIFERIDO (já jogados) ficavam sem
    // alvos ligados na Agenda; só apareciam os futuros (ex.: Taça).
    const hoje = new Date(new Date().setHours(0, 0, 0, 0));
    const agendados = await Agendamento.find({ calendarioJogo: { $ne: null } }).distinct('calendarioJogo');
    const jogos = await CalendarioJogo.find({
      $or: [{ data: { $gte: hoje } }, { _id: { $in: agendados } }],
    })
      .sort({ data: 1, hora: 1 })
      .lean();
    const resultado = [];
    for (const jg of jogos) {
      const casaJogadores = daEquipa(jg.casa);
      const foraJogadores = daEquipa(jg.fora);
      const nObservaveis = casaJogadores.length + foraJogadores.length;
      if (!nObservaveis) continue;
      resultado.push({
        ...jg,
        nObservaveis,
        casaJogadores,
        foraJogadores,
        // Lista combinada (compat + uso direto no cliente).
        jogadores: [...casaJogadores, ...foraJogadores],
      });
    }
    res.json(resultado);
  })
);

// GET /api/calendario/:id/observaveis — jogadores em scouting das DUAS equipas de
// UM jogo específico (qualquer data, mesmo passado), + o clube resolvido de cada
// equipa (para adicionar logo um jogador novo ligado). Base do picker "Observar jogador".
router.get(
  '/:id/observaveis',
  asyncHandler(async (req, res) => {
    const jogo = await CalendarioJogo.findById(req.params.id).lean();
    if (!jogo) return res.status(404).json({ erro: 'Jogo não encontrado' });

    const jogadores = await Player.find({ doPlantel: { $ne: true }, estado: { $ne: 'Arquivo' } })
      .select('nomeCompleto clubeAtual clube clubeSecundario clubeSecundarioNome posicaoPrincipal estado prioridade')
      .lean();
    const porClubeId = {};
    const porNome = {};
    const indexar = (j, ref, nome) => {
      if (ref) {
        const k = String(ref);
        (porClubeId[k] = porClubeId[k] || []).push(j);
      } else if (nome) {
        const k = norm(nome);
        if (k) (porNome[k] = porNome[k] || []).push(j);
      }
    };
    jogadores.forEach((j) => {
      indexar(j, j.clube, j.clubeAtual);
      if (j.clubeSecundario || j.clubeSecundarioNome) indexar(j, j.clubeSecundario, j.clubeSecundarioNome);
    });

    const clubes = await Club.find().select('nome apelidos liga').populate('liga', 'nome mercado').lean();
    const nomeParaClube = {};
    clubes.forEach((c) => {
      nomeParaClube[norm(c.nome)] = c;
      (c.apelidos || []).forEach((a) => {
        const k = norm(a);
        if (k) nomeParaClube[k] = c;
      });
    });

    const leve = (p) => ({
      _id: p._id,
      nome: p.nomeCompleto,
      posicao: p.posicaoPrincipal,
      estado: p.estado,
      prioridade: p.prioridade || null,
    });
    const daEquipa = (nomeEquipa) => {
      const chave = norm(nomeEquipa);
      const clube = nomeParaClube[chave];
      const lista = [];
      const vistos = new Set();
      const juntar = (arr) =>
        (arr || []).forEach((p) => {
          const id = String(p._id);
          if (!vistos.has(id)) {
            vistos.add(id);
            lista.push(leve(p));
          }
        });
      if (clube) juntar(porClubeId[String(clube._id)]);
      juntar(porNome[chave]);
      return { clube, jogadores: lista };
    };

    const c = daEquipa(jogo.casa);
    const f = daEquipa(jogo.fora);
    const infoClube = (nome, r) => ({
      nome,
      clubeId: r.clube ? String(r.clube._id) : null,
      liga: r.clube?.liga?.nome || null,
    });
    res.json({
      jogo: { _id: jogo._id, casa: jogo.casa, fora: jogo.fora, data: jogo.data, hora: jogo.hora, competicao: jogo.competicao, serie: jogo.serie },
      casa: infoClube(jogo.casa, c),
      fora: infoClube(jogo.fora, f),
      casaJogadores: c.jogadores,
      foraJogadores: f.jogadores,
    });
  })
);

export default router;
