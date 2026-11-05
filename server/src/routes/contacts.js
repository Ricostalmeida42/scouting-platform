import { Router } from 'express';
import Contact from '../models/Contact.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(
      await Contact.find()
        .populate('jogadoresRepresentados', 'nomeCompleto posicaoPrincipal')
        .sort({ nome: 1 })
    );
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json(await Contact.create(req.body));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const contacto = await Contact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!contacto) return res.status(404).json({ erro: 'Contacto não encontrado' });
    res.json(contacto);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const contacto = await Contact.findByIdAndDelete(req.params.id);
    if (!contacto) return res.status(404).json({ erro: 'Contacto não encontrado' });
    res.json({ ok: true });
  })
);

export default router;
