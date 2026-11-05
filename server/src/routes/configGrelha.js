import { Router } from 'express';
import ConfigGrelha from '../models/ConfigGrelha.js';

const router = Router();

// GET /api/config-grelha — devolve a seleção guardada (ou null se nunca foi definida).
router.get('/', async (req, res, next) => {
  try {
    const c = await ConfigGrelha.findOne({ chave: 'grelha' }).lean();
    res.json(c?.grelha ?? null);
  } catch (err) {
    next(err);
  }
});

// PUT /api/config-grelha — guarda a seleção (só editor; o bloqueio global trata disso).
router.put('/', async (req, res, next) => {
  try {
    const grelha = req.body?.grelha ?? req.body ?? {};
    const c = await ConfigGrelha.findOneAndUpdate(
      { chave: 'grelha' },
      { $set: { grelha } },
      { new: true, upsert: true }
    );
    res.json(c.grelha);
  } catch (err) {
    next(err);
  }
});

export default router;
