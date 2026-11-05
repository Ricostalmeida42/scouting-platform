import { Router } from 'express';
import Player from '../models/Player.js';
import Observation from '../models/Observation.js';
import Relatorio from '../models/Relatorio.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { gerarRelatorioRca } from '../utils/relatorioRca.js';
import { gerarRelatorioMercado } from '../utils/relatorioMercado.js';
import { perfilDeDados } from '../utils/perfilDados.js';

const router = Router();

// GET /api/relatorios/mercado — relatório de mercado (pré-janela): os alvos de
// recrutamento organizados por posição, imprimível (PDF). Lê só o que já existe.
// IMPORTANTE: tem de vir ANTES de `GET /:id` (senão "mercado" é tratado como id).
router.get(
  '/mercado',
  asyncHandler(async (req, res) => {
    const VERED = ['Contratar', 'A acompanhar', 'Nova observação'];
    const jogadores = await Player.find({ doPlantel: { $ne: true }, veredito: { $in: VERED } }).lean();
    // nº de observações + data da última, por jogador (estado da informação).
    const ag = await Observation.aggregate([
      { $group: { _id: '$jogador', n: { $sum: 1 }, ultima: { $max: '$dataJogo' } } },
    ]);
    const obsPorJogador = {};
    for (const r of ag) obsPorJogador[String(r._id)] = { n: r.n, ultima: r.ultima };
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(gerarRelatorioMercado({ jogadores, obsPorJogador, geradoEm: new Date() }));
  })
);

// GET /api/relatorios/jogador/:id — lista de relatórios do jogador (metadados).
router.get(
  '/jogador/:id',
  asyncHandler(async (req, res) => {
    const lista = await Relatorio.find({ jogador: req.params.id })
      .select('titulo createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json(lista);
  })
);

// POST /api/relatorios/jogador/:id — cria um relatório = snapshot do jogador +
// observações AGORA (congelado). Body opcional: { titulo }.
router.post(
  '/jogador/:id',
  asyncHandler(async (req, res) => {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });
    const observacoes = await Observation.find({ jogador: player._id }).sort({ dataJogo: -1 }).lean();
    const perfisDados = await perfilDeDados(player._id);
    const dados = { ...player.toJSON(), observacoes, perfisDados };
    const rel = await Relatorio.create({
      jogador: player._id,
      titulo: (req.body?.titulo || '').trim() || null,
      dados,
    });
    res.status(201).json({ _id: rel._id, titulo: rel.titulo, createdAt: rel.createdAt });
  })
);

// GET /api/relatorios/:id — abre o relatório guardado (HTML imprimível → PDF).
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const rel = await Relatorio.findById(req.params.id).lean();
    if (!rel) return res.status(404).send('Relatório não encontrado');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(gerarRelatorioRca(rel.dados || {}));
  })
);

// DELETE /api/relatorios/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await Relatorio.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  })
);

export default router;
