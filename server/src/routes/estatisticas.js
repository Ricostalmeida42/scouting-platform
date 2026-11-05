import { Router } from 'express';
import EstatisticaJogador from '../models/EstatisticaJogador.js';
import Player from '../models/Player.js';
import { perfilDeDados } from '../utils/perfilDados.js';
import { norm, NOME_GRUPO } from '../utils/metricasWyscout.js';

const router = Router();

const chaveDe = (nome, equipa) => norm(nome) + '|' + norm(equipa);

// Re-sincroniza as linhas de estatística de um jogador com as suas dadosChaves:
// liga as que batem certo, desliga as restantes (torna a associação autoritária).
async function sincronizar(playerId) {
  const player = await Player.findById(playerId).select('dadosChaves').lean();
  const chaves = player?.dadosChaves || [];
  await EstatisticaJogador.updateMany({ jogador: playerId }, { $set: { jogador: null } });
  if (chaves.length) {
    await EstatisticaJogador.updateMany({ chave: { $in: chaves } }, { $set: { jogador: playerId } });
  }
}

// GET /api/estatisticas/jogadores — lista de jogadores (teus) com dados,
// agrupáveis por posição, para os seletores do Comparar.
router.get('/jogadores', async (req, res, next) => {
  try {
    const linhas = await EstatisticaJogador.find({ jogador: { $ne: null } })
      .populate('jogador', 'nomeCompleto')
      .select('jogador grupoPosicao competicao minutos')
      .lean();
    const porJogador = new Map();
    for (const l of linhas) {
      if (!l.jogador) continue;
      const id = String(l.jogador._id);
      const atual = porJogador.get(id);
      if (!atual || (l.minutos || 0) > atual._min) {
        porJogador.set(id, {
          id,
          nome: l.jogador.nomeCompleto,
          grupo: l.grupoPosicao,
          _min: l.minutos || 0,
        });
      }
    }
    const lista = [...porJogador.values()]
      .map(({ _min, ...r }) => r)
      .filter((r) => r.grupo)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    res.json(lista);
  } catch (err) {
    next(err);
  }
});

// GET /api/estatisticas/jogador/:id — perfis de dados do jogador (um por
// competição/época), com radar + percentis calculados vs os pares da posição.
router.get('/jogador/:id', async (req, res, next) => {
  try {
    const perfis = await perfilDeDados(req.params.id);
    res.json({ perfis });
  } catch (err) {
    next(err);
  }
});

// GET /api/estatisticas/procurar?q= — candidatos nos dados Wyscout para ligar à
// mão (agrupados por chave nome|equipa). Mostra competições, posição, minutos.
router.get('/procurar', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const linhas = await EstatisticaJogador.find({ $or: [{ nome: re }, { equipa: re }] })
      .select('nome equipa chave competicao grupoPosicao minutos jogador')
      .limit(200)
      .lean();
    const porChave = new Map();
    for (const l of linhas) {
      const a = porChave.get(l.chave) || {
        chave: l.chave,
        nome: l.nome,
        equipa: l.equipa,
        grupo: NOME_GRUPO[l.grupoPosicao] || l.grupoPosicao || '—',
        competicoes: [],
        minutos: 0,
        jaLigado: false,
      };
      a.competicoes.push(l.competicao);
      a.minutos += l.minutos || 0;
      if (l.jogador) a.jaLigado = true;
      porChave.set(l.chave, a);
    }
    const lista = [...porChave.values()].sort((a, b) => b.minutos - a.minutos).slice(0, 25);
    res.json(lista);
  } catch (err) {
    next(err);
  }
});

// POST /api/estatisticas/ligar { playerId, nome, equipa } | { playerId, chave }
router.post('/ligar', async (req, res, next) => {
  try {
    const { playerId } = req.body || {};
    const chave = req.body?.chave || chaveDe(req.body?.nome || '', req.body?.equipa || '');
    if (!playerId || !chave || chave === '|') return res.status(400).json({ erro: 'playerId e chave necessários' });
    await Player.updateOne({ _id: playerId }, { $addToSet: { dadosChaves: chave } });
    await sincronizar(playerId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/estatisticas/desligar { playerId, chave? } — remove uma chave (ou todas).
router.post('/desligar', async (req, res, next) => {
  try {
    const { playerId, chave } = req.body || {};
    if (!playerId) return res.status(400).json({ erro: 'playerId necessário' });
    if (chave) await Player.updateOne({ _id: playerId }, { $pull: { dadosChaves: chave } });
    else await Player.updateOne({ _id: playerId }, { $set: { dadosChaves: [] } });
    await sincronizar(playerId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
