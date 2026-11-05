import { Router } from 'express';
import Classificacao from '../models/Classificacao.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scraperClassificacao } from '../utils/scraperClassificacao.js';
import { fonteDe } from '../utils/classificacaoFontes.js';

const router = Router();

// GET /api/classificacao?competicao=X&serie=Y — a classificação guardada (ou null).
// Devolve também se há fonte conhecida (pré-configurada ou guardada antes).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { competicao, serie = '' } = req.query;
    if (!competicao) return res.status(400).json({ erro: 'competicao obrigatória' });
    const doc = await Classificacao.findOne({ competicao, serie }).lean();
    const fonte = doc?.fonte || fonteDe(competicao, serie) || null;
    res.json({ classificacao: doc || null, fonte, temFonte: !!fonte });
  })
);

// POST /api/classificacao/importar — { competicao, serie, epoca, url? } → raspa do
// zerozero e guarda. url opcional (senão usa a pré-configurada ou a já guardada).
router.post(
  '/importar',
  asyncHandler(async (req, res) => {
    const { competicao, serie = '', epoca = '', url } = req.body || {};
    if (!competicao) return res.status(400).json({ erro: 'competicao obrigatória' });
    const existente = await Classificacao.findOne({ competicao, serie });
    const fonte = (url && url.trim()) || existente?.fonte || fonteDe(competicao, serie);
    if (!fonte) {
      return res.status(409).json({ erro: 'Sem fonte para esta competição. Cola o link da edição no zerozero.', semFonte: true });
    }
    let linhas;
    try {
      linhas = await scraperClassificacao(fonte);
    } catch (e) {
      return res.status(502).json({ erro: 'Falha a importar do zerozero: ' + e.message });
    }
    const doc = await Classificacao.findOneAndUpdate(
      { competicao, serie },
      { competicao, serie, epoca, fonte, atualizadoEm: new Date(), linhas },
      { new: true, upsert: true }
    );
    res.json({ classificacao: doc, fonte, inseridas: linhas.length });
  })
);

export default router;
