import { Router } from 'express';
import Player from '../models/Player.js';
import Observation from '../models/Observation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { construirFiltroJogadores } from '../utils/filtroJogadores.js';
import {
  dadosBackup,
  restaurar,
  marcarBackupManual,
  ultimoBackupDisco,
  ultimoBackupManual,
} from '../utils/backup.js';

const router = Router();

// "Shortlist" agora = candidatos ativos pelo veredito (A acompanhar + Contratar).
const VEREDITOS_ATIVOS = ['A acompanhar', 'Contratar'];

// ---------- Helpers CSV ----------
// Separador ';' e BOM UTF-8 para o Excel PT abrir com acentos e colunas corretas.
function celula(v) {
  if (v == null) return '';
  const s = String(v);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function paraCSV(linhas, colunas) {
  const cabecalho = colunas.map((c) => celula(c.label)).join(';');
  const corpo = linhas.map((r) =>
    colunas.map((c) => celula(c.valor(r))).join(';')
  );
  return '﻿' + [cabecalho, ...corpo].join('\r\n');
}

const dataPT = (d) => (d ? new Date(d).toLocaleDateString('pt-PT') : '');
const idade = (d) =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : '';

const COLUNAS_JOGADOR = [
  { label: 'Nome', valor: (j) => j.nomeCompleto },
  { label: 'Posição', valor: (j) => j.posicaoPrincipal },
  { label: 'Pos. secundárias', valor: (j) => (j.posicoesSecundarias || []).join(', ') },
  { label: 'Idade', valor: (j) => idade(j.dataNascimento) },
  { label: 'Nascimento', valor: (j) => dataPT(j.dataNascimento) },
  { label: 'Clube', valor: (j) => j.clubeAtual },
  { label: 'Liga', valor: (j) => j.liga },
  { label: 'Fim contrato', valor: (j) => dataPT(j.fimContrato) },
  { label: 'Agente', valor: (j) => j.agente },
  { label: 'Rating final', valor: (j) => j.ratingFinal ?? '' },
  { label: 'Veredito', valor: (j) => j.veredito ?? '' },
  { label: 'Rendimento', valor: (j) => j.rendimento ?? '' },
  { label: 'Potencial', valor: (j) => j.potencialClass ?? '' },
  { label: 'Perfil', valor: (j) => j.perfil ?? '' },
  { label: 'Aval. imediata', valor: (j) => j.avaliacaoImediata ?? '' },
  { label: 'Aval. médio prazo', valor: (j) => j.avaliacaoMedioPrazo ?? '' },
  { label: 'Aval. longo prazo', valor: (j) => j.avaliacaoLongoPrazo ?? '' },
  { label: 'Notas', valor: (j) => j.notas },
];

function enviarCSV(res, nome, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
  res.send(csv);
}

// GET /api/export/players.csv — respeita os mesmos filtros da lista
router.get(
  '/players.csv',
  asyncHandler(async (req, res) => {
    const filtro = construirFiltroJogadores(req.query);
    if (req.query.comObservacao === 'true') {
      filtro._id = { $in: await Observation.distinct('jogador') };
    }
    const jogadores = await Player.find(filtro).select('-foto').sort({ nomeCompleto: 1 }).lean();
    enviarCSV(res, 'jogadores.csv', paraCSV(jogadores, COLUNAS_JOGADOR));
  })
);

// GET /api/export/shortlist.csv
router.get(
  '/shortlist.csv',
  asyncHandler(async (req, res) => {
    const jogadores = await Player.find({ veredito: { $in: VEREDITOS_ATIVOS } })
      .select('-foto')
      .sort({ veredito: 1, nomeCompleto: 1 })
      .lean();
    enviarCSV(res, 'shortlist.csv', paraCSV(jogadores, COLUNAS_JOGADOR));
  })
);

// GET /api/export/backup.json — cópia de segurança completa da base
router.get(
  '/backup.json',
  asyncHandler(async (req, res) => {
    const backup = await dadosBackup();
    marcarBackupManual(); // regista que se fez uma cópia manual (para o aviso)
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="backup-scouting.json"');
    res.send(JSON.stringify(backup, null, 2));
  })
);

// GET /api/export/backup-info — quando foi a última cópia (auto e manual)
router.get(
  '/backup-info',
  asyncHandler(async (req, res) => {
    const manual = ultimoBackupManual();
    const auto = ultimoBackupDisco();
    const dias = manual ? Math.floor((Date.now() - manual.getTime()) / 86400000) : null;
    res.json({ ultimaManual: manual, ultimaAuto: auto, diasDesdeManual: dias });
  })
);

// POST /api/export/import — RESTAURO: substitui a base pelo backup enviado.
// Guarda o estado atual em disco antes de substituir (rollback possível).
router.post(
  '/import',
  asyncHandler(async (req, res) => {
    const contagem = await restaurar(req.body);
    res.json({ ok: true, restaurado: contagem });
  })
);

export default router;
