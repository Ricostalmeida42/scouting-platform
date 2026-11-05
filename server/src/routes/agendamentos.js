import { Router } from 'express';
import Agendamento from '../models/Agendamento.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/agendamentos — query: estado, futuros=true
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filtro = {};
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.futuros === 'true') filtro.dataJogo = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
    const lista = await Agendamento.find(filtro)
      .populate('jogador', 'nomeCompleto posicaoPrincipal clubeAtual')
      .sort({ dataJogo: 1 });
    res.json(lista);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const ag = await Agendamento.create(req.body);
    res.status(201).json(ag);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const ag = await Agendamento.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });
    res.json(ag);
  })
);

// PATCH /api/agendamentos/:id/estado — marcar Concluído / Cancelado
router.patch(
  '/:id/estado',
  asyncHandler(async (req, res) => {
    const ag = await Agendamento.findByIdAndUpdate(
      req.params.id,
      { estado: req.body.estado },
      { new: true }
    );
    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });
    res.json(ag);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const ag = await Agendamento.findByIdAndDelete(req.params.id);
    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });
    res.json({ ok: true });
  })
);

export default router;
