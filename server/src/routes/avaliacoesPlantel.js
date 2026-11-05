import { Router } from 'express';
import AvaliacaoPlantel from '../models/AvaliacaoPlantel.js';
import Player from '../models/Player.js';
import User from '../models/User.js';
import { calcularRatingFinal } from '../constants.js';

// Função a mostrar na avaliação quando a conta não tem uma definida.
function funcaoPorOmissao(papel) {
  if (papel === 'editor') return 'Scout';
  if (papel === 'tecnico') return 'Equipa técnica';
  return 'Direção desportiva'; // viewer (diretor desportivo)
}

// Montado ANTES de `bloquearEscritaViewer` — qualquer conta (editor E viewer)
// pode CRIAR uma avaliação do plantel (equipa técnica / direção). As permissões
// de apagar são tratadas aqui.
const router = Router();

// Sincroniza Player.avaliacao/ratingFinal com a avaliação MAIS RECENTE (ou limpa).
async function sincronizar(jogadorId) {
  const ultima = await AvaliacaoPlantel.findOne({ jogador: jogadorId }).sort({ createdAt: -1 }).lean();
  await Player.updateOne(
    { _id: jogadorId },
    { $set: { avaliacao: ultima?.avaliacao || {}, ratingFinal: ultima?.rating ?? null } }
  );
}

// GET /api/avaliacoes-plantel/:jogadorId — histórico (mais recente primeiro).
router.get('/:jogadorId', async (req, res, next) => {
  try {
    const l = await AvaliacaoPlantel.find({ jogador: req.params.jogadorId }).sort({ createdAt: -1 }).lean();
    res.json(l);
  } catch (e) {
    next(e);
  }
});

// POST /api/avaliacoes-plantel — criar (editor E viewer).
router.post('/', async (req, res, next) => {
  try {
    // A FUNÇÃO e o NOME vêm da conta que avalia (não são escritos no formulário).
    const autor = req.user?.id ? await User.findById(req.user.id).select('nome funcao papel').lean() : null;
    const papel = autor?.papel || req.user?.papel;
    const funcao = autor?.funcao || '';
    // A equipa técnica não avalia o plantel — EXCETO o treinador principal.
    if (papel === 'tecnico' && funcao !== 'Treinador principal') {
      return res.status(403).json({ erro: 'Sem permissão para avaliar o plantel' });
    }
    const { jogador, avaliacao, grelha, posicao } = req.body || {};
    if (!jogador) return res.status(400).json({ erro: 'Jogador necessário' });
    const player = await Player.findById(jogador).select('_id doPlantel').lean();
    if (!player) return res.status(404).json({ erro: 'Jogador não encontrado' });
    const av = {};
    for (const k of ['tecnica', 'tatica', 'fisica', 'mental']) {
      const v = Number(avaliacao?.[k]);
      if (v >= 1 && v <= 5) av[k] = v;
    }
    if (Object.keys(av).length === 0) return res.status(400).json({ erro: 'Avalia pelo menos uma dimensão.' });
    const doc = await AvaliacaoPlantel.create({
      jogador,
      avaliacao: av,
      grelha: grelha && typeof grelha === 'object' ? grelha : undefined,
      posicao,
      rating: calcularRatingFinal(av),
      funcao: funcao || funcaoPorOmissao(papel),
      autorId: req.user?.id,
      autorNome: autor?.nome || req.user?.nome || req.user?.username,
      autorPapel: papel,
    });
    await sincronizar(jogador);
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/avaliacoes-plantel/:id — editor apaga qualquer; o autor apaga a sua.
router.delete('/:id', async (req, res, next) => {
  try {
    const a = await AvaliacaoPlantel.findById(req.params.id);
    if (!a) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    const ehEditor = req.user?.papel === 'editor';
    const ehAutor = a.autorId && String(a.autorId) === String(req.user?.id);
    if (!ehEditor && !ehAutor) return res.status(403).json({ erro: 'Sem permissão para remover' });
    const jogadorId = a.jogador;
    await a.deleteOne();
    await sincronizar(jogadorId);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
