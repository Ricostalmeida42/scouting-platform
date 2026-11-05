import { Router } from 'express';
import Sugestao, { ESTADOS_SUGESTAO } from '../models/Sugestao.js';
import { requireEditor } from '../middleware/auth.js';

// NOTA: este router é montado ANTES de `bloquearEscritaViewer`, por isso o
// clube (viewer) pode escrever aqui. As permissões são tratadas em cada rota:
//  - criar sugestão: viewer e editor
//  - gerir estado/resposta: só editor
//  - apagar: editor (qualquer) ou o autor (só enquanto 'Nova')
const router = Router();

// GET /api/sugestoes — editor vê todas; viewer vê só as suas.
router.get('/', async (req, res, next) => {
  try {
    const filtro = req.user?.papel === 'editor' ? {} : { autorId: req.user?.id };
    const sugestoes = await Sugestao.find(filtro).sort({ createdAt: -1 }).lean();
    res.json(sugestoes);
  } catch (err) {
    next(err);
  }
});

// GET /api/sugestoes/contador — nº de sugestões novas (badge do scouting).
router.get('/contador', async (req, res, next) => {
  try {
    if (req.user?.papel !== 'editor') return res.json({ novas: 0 });
    const novas = await Sugestao.countDocuments({ estado: 'Nova' });
    res.json({ novas });
  } catch (err) {
    next(err);
  }
});

// POST /api/sugestoes — criar (viewer e editor).
router.post('/', async (req, res, next) => {
  try {
    const { nome, clube, posicao, nota, link } = req.body || {};
    if (![nome, clube, posicao].every((v) => v && String(v).trim())) {
      return res.status(400).json({ erro: 'Preenche o nome, o clube e a posição.' });
    }
    const s = await Sugestao.create({
      nome: String(nome).trim(),
      clube,
      posicao,
      nota,
      link,
      autorId: req.user?.id,
      autorNome: req.user?.nome || req.user?.username,
      estado: 'Nova',
    });
    res.status(201).json(s);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/sugestoes/:id — gerir estado / resposta (só editor).
router.patch('/:id', requireEditor, async (req, res, next) => {
  try {
    const dados = {};
    if (req.body?.estado !== undefined) {
      if (!ESTADOS_SUGESTAO.includes(req.body.estado)) {
        return res.status(400).json({ erro: 'Estado inválido' });
      }
      dados.estado = req.body.estado;
    }
    if (req.body?.respostaEditor !== undefined) dados.respostaEditor = req.body.respostaEditor;
    const s = await Sugestao.findByIdAndUpdate(req.params.id, { $set: dados }, { new: true });
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
    res.json(s);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sugestoes/:id — editor apaga qualquer; o autor apaga a sua se ainda 'Nova'.
router.delete('/:id', async (req, res, next) => {
  try {
    const s = await Sugestao.findById(req.params.id);
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
    const ehEditor = req.user?.papel === 'editor';
    const ehAutor = s.autorId && String(s.autorId) === String(req.user?.id);
    if (!ehEditor && !(ehAutor && s.estado === 'Nova')) {
      return res.status(403).json({ erro: 'Sem permissão para remover esta sugestão' });
    }
    await s.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
