import { Router } from 'express';
import PlanoAlvo from '../models/PlanoAlvo.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const epocaDe = (v) => (v === 'proxima' ? 'proxima' : 'momento');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await PlanoAlvo.find({ epoca: epocaDe(req.query.epoca) }).sort({ planoOrdem: 1, createdAt: 1 }));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const alvo = await PlanoAlvo.create({
      planoPos: req.body.planoPos,
      nota: req.body.nota || '',
      epoca: epocaDe(req.body.epoca),
    });
    res.status(201).json(alvo);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const set = {};
    for (const k of ['nota', 'planoPos', 'planoOrdem']) if (k in req.body) set[k] = req.body[k];
    if ('planoEstatuto' in req.body) {
      const v = req.body.planoEstatuto;
      set.planoEstatuto = ['priority', 'potencial', 'emprestar'].includes(v) ? v : null;
    }
    if ('planoTier' in req.body) {
      const v = req.body.planoTier;
      set.planoTier = ['A', 'B', 'C', 'D'].includes(v) ? v : null;
    }
    const alvo = await PlanoAlvo.findByIdAndUpdate(req.params.id, set, { new: true });
    if (!alvo) return res.status(404).json({ erro: 'Alvo não encontrado' });
    res.json(alvo);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await PlanoAlvo.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  })
);

export default router;
