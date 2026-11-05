import { Router } from 'express';
import Player from '../models/Player.js';
import Club from '../models/Club.js';
import Contact from '../models/Contact.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escaparRegex } from '../utils/regex.js';

const router = Router();

// GET /api/search?q= — pesquisa global (jogadores, clubes, contactos)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ players: [], clubs: [], contacts: [] });
    const rx = new RegExp(escaparRegex(q), 'i');

    const [players, clubs, contacts] = await Promise.all([
      Player.find({ nomeCompleto: rx }).select('nomeCompleto posicaoPrincipal clubeAtual estado').limit(8).lean(),
      Club.find({ nome: rx }).select('nome pais').limit(5).lean(),
      Contact.find({ $or: [{ nome: rx }, { empresa: rx }] }).select('nome empresa').limit(5).lean(),
    ]);

    res.json({ players, clubs, contacts });
  })
);

export default router;
