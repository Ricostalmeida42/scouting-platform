// Segurança de dados: os dados são manuais e insubstituíveis, por isso além do
// download manual há cópia automática no arranque e um caminho de RESTAURO.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Player from '../models/Player.js';
import Observation from '../models/Observation.js';
import League from '../models/League.js';
import Contact from '../models/Contact.js';
import Club from '../models/Club.js';
import Agendamento from '../models/Agendamento.js';
import CalendarioJogo from '../models/CalendarioJogo.js';
import ObservacaoJogo from '../models/ObservacaoJogo.js';
import Relatorio from '../models/Relatorio.js';

// Coleção no backup ↔ Model. A ordem importa no restauro (jogadores primeiro).
const COLECOES = {
  players: Player,
  observations: Observation,
  leagues: League,
  contacts: Contact,
  clubs: Club,
  agendamentos: Agendamento,
  calendarioJogos: CalendarioJogo,
  observacoesJogo: ObservacaoJogo,
  relatorios: Relatorio,
};

const PASTA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backups');
const MANTER = 12; // nº de cópias automáticas a guardar
const MARCA_MANUAL = path.join(PASTA, 'ultimo-manual.txt');

export async function dadosBackup() {
  const partes = await Promise.all(Object.values(COLECOES).map((M) => M.find().lean()));
  const backup = { geradoEm: new Date().toISOString(), versao: 2 };
  Object.keys(COLECOES).forEach((nome, i) => {
    backup[nome] = partes[i];
  });
  return backup;
}

// Escreve uma cópia em disco e mantém apenas as MANTER mais recentes.
export async function escreverBackupDisco(etiqueta = 'auto') {
  try {
    fs.mkdirSync(PASTA, { recursive: true });
    const backup = await dadosBackup();
    const carimbo = backup.geradoEm.replace(/[:.]/g, '-');
    const ficheiro = path.join(PASTA, `backup-${etiqueta}-${carimbo}.json`);
    fs.writeFileSync(ficheiro, JSON.stringify(backup, null, 2), 'utf8');

    const antigos = fs
      .readdirSync(PASTA)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
      .sort();
    while (antigos.length > MANTER) fs.unlinkSync(path.join(PASTA, antigos.shift()));
    return ficheiro;
  } catch (e) {
    console.error('[backup] Não foi possível escrever a cópia automática:', e.message);
    return null;
  }
}

// Data da cópia mais recente em disco (para avisar "sem backup há N dias").
export function ultimoBackupDisco() {
  try {
    const ficheiros = fs
      .readdirSync(PASTA)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
      .sort();
    if (!ficheiros.length) return null;
    const ultimo = ficheiros[ficheiros.length - 1];
    return fs.statSync(path.join(PASTA, ultimo)).mtime;
  } catch {
    return null;
  }
}

export function marcarBackupManual() {
  try {
    fs.mkdirSync(PASTA, { recursive: true });
    fs.writeFileSync(MARCA_MANUAL, new Date().toISOString(), 'utf8');
  } catch {
    /* ignore */
  }
}

export function ultimoBackupManual() {
  try {
    return new Date(fs.readFileSync(MARCA_MANUAL, 'utf8').trim());
  } catch {
    return null;
  }
}

// Restaura a partir de um objeto de backup. Antes de substituir, guarda uma
// cópia de segurança do estado atual em disco (rede de segurança / rollback).
export async function restaurar(backup) {
  if (!backup || typeof backup !== 'object' || !Array.isArray(backup.players)) {
    throw new Error('Ficheiro de backup inválido (sem "players").');
  }
  await escreverBackupDisco('pre-restauro');

  const contagem = {};
  for (const [nome, Model] of Object.entries(COLECOES)) {
    const docs = Array.isArray(backup[nome]) ? backup[nome] : [];
    await Model.deleteMany({});
    if (docs.length) await Model.insertMany(docs, { ordered: false });
    contagem[nome] = docs.length;
  }
  return contagem;
}
