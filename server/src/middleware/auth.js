import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { podeAceder } from '../acessos.js';

export const COOKIE_SESSAO = 'scouting_sessao';

const METODOS_LEITURA = new Set(['GET', 'HEAD', 'OPTIONS']);

function segredo() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET não definido no .env');
  return s;
}

// Assina um token de sessão com os dados essenciais do utilizador.
export function assinarToken(utilizador) {
  return jwt.sign(
    {
      id: String(utilizador._id),
      username: utilizador.username,
      nome: utilizador.nome || utilizador.username,
      papel: utilizador.papel,
    },
    segredo(),
    { expiresIn: process.env.JWT_EXPIRA || '7d' }
  );
}

// Opções do cookie httpOnly que guarda a sessão.
export function opcoesCookie() {
  const producao = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: producao, // em produção (HTTPS) o cookie só viaja encriptado
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  };
}

// Exige sessão iniciada. Aceita também a chave de importação (x-scouting-key)
// usada pelos importadores externos (zerozero/FPF), que correm noutra página
// e não têm cookie de sessão — nesse caso agem como 'editor'.
export function requireAuth(req, res, next) {
  const chave = req.get('x-scouting-key');
  if (chave && process.env.IMPORT_API_KEY && chave === process.env.IMPORT_API_KEY) {
    req.user = { id: null, username: 'importador', nome: 'Importador', papel: 'editor' };
    return next();
  }

  const token = req.cookies?.[COOKIE_SESSAO];
  if (!token) return res.status(401).json({ erro: 'Sessão necessária' });

  try {
    req.user = jwt.verify(token, segredo());
    return next();
  } catch {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada' });
  }
}

// Bloqueia qualquer alteração (POST/PUT/PATCH/DELETE) a quem não é 'editor'.
// O clube ('viewer') só pode consultar.
export function bloquearEscritaViewer(req, res, next) {
  if (METODOS_LEITURA.has(req.method)) return next();
  if (req.user?.papel === 'editor') return next();
  return res.status(403).json({ erro: 'Sem permissão para alterar dados' });
}

// Exige papel de editor (para rotas de gestão de utilizadores).
export function requireEditor(req, res, next) {
  if (req.user?.papel === 'editor') return next();
  return res.status(403).json({ erro: 'Apenas editores' });
}

// Exige que a conta tenha acesso a uma página (ver acessos.js). O editor (e o
// importador, que age como editor) tem sempre acesso; as restantes contas são
// validadas pelos overrides guardados + omissão do papel/função. Consulta a BD
// porque o token de sessão não traz a função nem os overrides.
export function exigirPagina(pagina) {
  return async (req, res, next) => {
    try {
      if (req.user?.papel === 'editor') return next();
      if (!req.user?.id) return res.status(403).json({ erro: 'Sem acesso a esta área' });
      const u = await User.findById(req.user.id);
      if (!u || !u.ativo) return res.status(401).json({ erro: 'Sessão inválida' });
      if (podeAceder(u, pagina)) return next();
      return res.status(403).json({ erro: 'Sem acesso a esta área' });
    } catch (err) {
      next(err);
    }
  };
}
