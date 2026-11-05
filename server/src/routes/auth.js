import { Router } from 'express';
import User, { PAPEIS } from '../models/User.js';
import { PAGINAS } from '../acessos.js';
import {
  assinarToken,
  opcoesCookie,
  requireAuth,
  requireEditor,
  COOKIE_SESSAO,
} from '../middleware/auth.js';

const router = Router();

// Aceita só overrides de páginas conhecidas com valor booleano.
function limparAcessos(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;
  const chaves = new Set(PAGINAS.map((p) => p.key));
  const out = {};
  for (const [k, v] of Object.entries(bruto)) {
    if (chaves.has(k) && typeof v === 'boolean') out[k] = v;
  }
  return out;
}

// POST /api/auth/login — inicia sessão (público).
router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!username || !password) {
      return res.status(400).json({ erro: 'Indica utilizador e palavra-passe' });
    }

    const utilizador = await User.findOne({ username }).select('+passwordHash');
    if (!utilizador || !utilizador.ativo) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const ok = await utilizador.verificarPassword(password);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

    utilizador.ultimoLogin = new Date();
    await utilizador.save();

    const token = assinarToken(utilizador);
    res.cookie(COOKIE_SESSAO, token, opcoesCookie());
    res.json(utilizador.paraCliente());
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout — termina sessão.
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_SESSAO, { ...opcoesCookie(), maxAge: undefined });
  res.json({ ok: true });
});

// GET /api/auth/me — quem está autenticado.
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.user?.id) {
      // sessão por chave de importação — devolve o perfil técnico
      return res.json({ id: null, username: req.user.username, nome: req.user.nome, papel: req.user.papel, ativo: true });
    }
    const utilizador = await User.findById(req.user.id);
    if (!utilizador || !utilizador.ativo) {
      return res.status(401).json({ erro: 'Sessão inválida' });
    }
    res.json(utilizador.paraCliente());
  } catch (err) {
    next(err);
  }
});

// ------- Gestão de utilizadores (apenas editores) -------

// GET /api/auth/users — lista utilizadores.
router.get('/users', requireAuth, requireEditor, async (req, res, next) => {
  try {
    const lista = await User.find().sort({ username: 1 });
    res.json(lista.map((u) => u.paraCliente()));
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/users — cria utilizador.
router.post('/users', requireAuth, requireEditor, async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const nome = String(req.body?.nome || '').trim();
    const funcao = String(req.body?.funcao || '').trim();
    const papel = PAPEIS.includes(req.body?.papel) ? req.body.papel : 'viewer';

    if (!username || password.length < 6) {
      return res.status(400).json({ erro: 'Utilizador e palavra-passe (mín. 6 caracteres) obrigatórios' });
    }
    if (await User.findOne({ username })) {
      return res.status(409).json({ erro: 'Já existe um utilizador com esse nome' });
    }

    const u = new User({ username, nome, funcao, papel });
    const acessos = limparAcessos(req.body?.acessos);
    if (acessos) u.acessos = acessos;
    await u.definirPassword(password);
    await u.save();
    res.status(201).json(u.paraCliente());
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/users/:id — altera nome, papel, estado ativo e/ou palavra-passe.
router.put('/users/:id', requireAuth, requireEditor, async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ erro: 'Utilizador não encontrado' });

    if (typeof req.body?.nome === 'string') u.nome = req.body.nome.trim();
    if (typeof req.body?.funcao === 'string') u.funcao = req.body.funcao.trim();
    if (PAPEIS.includes(req.body?.papel)) u.papel = req.body.papel;
    if (typeof req.body?.ativo === 'boolean') u.ativo = req.body.ativo;
    if ('acessos' in (req.body || {})) {
      u.acessos = limparAcessos(req.body.acessos) || {};
      u.markModified('acessos');
    }
    if (req.body?.password) {
      if (String(req.body.password).length < 6) {
        return res.status(400).json({ erro: 'Palavra-passe mínima de 6 caracteres' });
      }
      await u.definirPassword(String(req.body.password));
    }

    // Segurança: não permitir ficar sem nenhum editor ativo.
    if ((u.papel !== 'editor' || !u.ativo)) {
      const editoresAtivos = await User.countDocuments({ papel: 'editor', ativo: true, _id: { $ne: u._id } });
      if (editoresAtivos === 0) {
        return res.status(400).json({ erro: 'Tem de existir pelo menos um editor ativo' });
      }
    }

    await u.save();
    res.json(u.paraCliente());
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/users/:id — remove utilizador.
router.delete('/users/:id', requireAuth, requireEditor, async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    if (String(u._id) === String(req.user.id)) {
      return res.status(400).json({ erro: 'Não podes remover a tua própria conta' });
    }
    if (u.papel === 'editor' && u.ativo) {
      const editoresAtivos = await User.countDocuments({ papel: 'editor', ativo: true, _id: { $ne: u._id } });
      if (editoresAtivos === 0) {
        return res.status(400).json({ erro: 'Tem de existir pelo menos um editor ativo' });
      }
    }
    await u.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
