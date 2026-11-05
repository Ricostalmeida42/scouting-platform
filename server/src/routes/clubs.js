import { Router } from 'express';
import Club from '../models/Club.js';
import Player from '../models/Player.js';
import League from '../models/League.js';
import CalendarioJogo from '../models/CalendarioJogo.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[."'`]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Contagem de jogadores em scouting (não-plantel, não-arquivo) por clube.
async function contagemPorClube() {
  const linhas = await Player.aggregate([
    { $match: { clube: { $ne: null }, doPlantel: { $ne: true }, estado: { $ne: 'Arquivo' } } },
    { $group: { _id: '$clube', n: { $sum: 1 } } },
  ]);
  const mapa = {};
  linhas.forEach((l) => {
    mapa[String(l._id)] = l.n;
  });
  return mapa;
}

// GET /api/clubs — lista de clubes. Query: liga=<id> filtra por liga.
// Cada clube vem com a liga populada (nome) e jogadoresCount (alvos de scouting).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filtro = {};
    if (req.query.liga) filtro.liga = req.query.liga;
    const [clubes, contagem] = await Promise.all([
      Club.find(filtro).populate('liga', 'nome mercado prioridade').sort({ nome: 1 }).lean(),
      contagemPorClube(),
    ]);
    res.json(clubes.map((c) => ({ ...c, jogadoresCount: contagem[String(c._id)] || 0 })));
  })
);

// POST /api/clubs/sincronizar-calendario — cria um clube por cada equipa distinta
// do calendário (casa/fora), ligado à liga que corresponde à sua competição+série.
// Re-executável: não duplica clubes existentes; preenche a liga em falta.
router.post(
  '/sincronizar-calendario',
  asyncHandler(async (req, res) => {
    const jogos = await CalendarioJogo.find().select('competicao serie casa fora').lean();
    const ligas = await League.find().lean();

    // Encontrar a liga para uma (competição, série) do calendário. Liga apenas
    // por CORRESPONDÊNCIA DA COMPETIÇÃO definida na liga (campo competicao) — sem
    // heurísticas por nome, que davam falsos positivos (ex.: I vs II Divisão Sub-19).
    const acharLiga = (competicao, serie) => {
      const nc = norm(competicao);
      const ns = norm(serie);
      // 1) mesma competição + série presente no nome da liga (caso CP: 4 séries)
      let L = ligas.find((l) => l.competicao && norm(l.competicao) === nc && ns && norm(l.nome).includes(ns));
      // 2) mesma competição (liga única para a competição)
      if (!L) L = ligas.find((l) => l.competicao && norm(l.competicao) === nc);
      return L || null;
    };

    // Equipas distintas do calendário, com a sua (competição, série). Ignora os
    // placeholders da Taça ("Vencedor Jogo X x Y") — não são equipas reais.
    const equipas = new Map(); // norm(nome) → { nome, competicao, serie }
    for (const jg of jogos) {
      for (const nome of [jg.casa, jg.fora]) {
        const k = norm(nome);
        if (k && !equipas.has(k) && !/vencedor jogo/i.test(nome)) {
          equipas.set(k, { nome, competicao: jg.competicao, serie: jg.serie });
        }
      }
    }

    const existentes = await Club.find().select('nome apelidos liga').lean();
    const jaExiste = new Set();
    const clubePorChave = {};
    existentes.forEach((c) => {
      const k = norm(c.nome);
      jaExiste.add(k);
      clubePorChave[k] = c;
      (c.apelidos || []).forEach((a) => jaExiste.add(norm(a)));
    });

    let criados = 0;
    let ligados = 0;
    const semLiga = [];
    for (const { nome, competicao, serie } of equipas.values()) {
      const k = norm(nome);
      const liga = acharLiga(competicao, serie);
      if (jaExiste.has(k)) {
        // Já existe: preenche a liga se estiver em falta.
        const c = clubePorChave[k];
        if (c && !c.liga && liga) {
          await Club.findByIdAndUpdate(c._id, { liga: liga._id });
          ligados++;
        }
        continue;
      }
      await Club.create({ nome, pais: 'Portugal', liga: liga ? liga._id : null });
      criados++;
      if (liga) ligados++;
      else semLiga.push(nome);
    }

    res.json({ ok: true, equipas: equipas.size, criados, ligados, semLiga });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json(await Club.create(req.body));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const clube = await Club.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!clube) return res.status(404).json({ erro: 'Clube não encontrado' });
    res.json(clube);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const clube = await Club.findByIdAndDelete(req.params.id);
    if (!clube) return res.status(404).json({ erro: 'Clube não encontrado' });
    // Desliga os jogadores que apontavam para este clube (evita refs penduradas).
    await Player.updateMany({ clube: req.params.id }, { $set: { clube: null } });
    res.json({ ok: true });
  })
);

export default router;
