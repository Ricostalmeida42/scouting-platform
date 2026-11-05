import { Router } from 'express';
import ObservacaoJogo from '../models/ObservacaoJogo.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/observacoes-jogo — lista dos jogos vistos (mais recentes primeiro).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const lista = await ObservacaoJogo.find().sort({ data: -1, createdAt: -1 }).lean();
    res.json(lista);
  })
);

// POST /api/observacoes-jogo — regista um jogo como visto.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    // Evita duplicar o registo do mesmo jogo do calendário.
    if (req.body.calendarioJogo) {
      const existe = await ObservacaoJogo.findOne({ calendarioJogo: req.body.calendarioJogo });
      if (existe) return res.status(200).json(existe);
    }
    const obs = await ObservacaoJogo.create(req.body);
    res.status(201).json(obs);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const obs = await ObservacaoJogo.findByIdAndDelete(req.params.id);
    if (!obs) return res.status(404).json({ erro: 'Observação de jogo não encontrada' });
    res.json({ ok: true });
  })
);

export default router;
