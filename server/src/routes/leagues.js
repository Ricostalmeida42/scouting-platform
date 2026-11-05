import { Router } from 'express';
import League from '../models/League.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await League.find().sort({ prioridade: 1, nome: 1 }));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json(await League.create(req.body));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const liga = await League.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!liga) return res.status(404).json({ erro: 'Liga não encontrada' });
    res.json(liga);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const liga = await League.findByIdAndDelete(req.params.id);
    if (!liga) return res.status(404).json({ erro: 'Liga não encontrada' });
    res.json({ ok: true });
  })
);

export default router;
