// Migração: o Potencial só se aplica a jogadores até IDADE_MAX_POTENCIAL anos.
//
// A regra passou a ser imposta automaticamente ao gravar (pre-save / findOneAndUpdate
// no modelo Player e nas rotas de observação). Esta migração limpa os valores que
// já estavam gravados em jogadores — e nas suas observações — que hoje têm 23+ anos,
// para a base ficar coerente de imediato (filtros, código do jogador, etc.).
//
// Faz backup antes de mexer. Correr:  node src/migracoes/005-potencial-idade.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { escreverBackupDisco } from '../utils/backup.js';
import { IDADE_MAX_POTENCIAL } from '../constants.js';

const anosDe = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return Math.floor((Date.now() - dt.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
};

await connectDB(process.env.MONGODB_URI);

const ficheiro = await escreverBackupDisco('pre-potencial-idade');
console.log(`[migração] backup: ${ficheiro || '(falhou — a abortar)'}`);
if (!ficheiro) {
  await mongoose.disconnect();
  process.exit(1);
}

const players = mongoose.connection.collection('players');
const observations = mongoose.connection.collection('observations');

// Jogadores com 23+ anos (idade > IDADE_MAX_POTENCIAL).
const todos = await players
  .find({ dataNascimento: { $ne: null, $exists: true } })
  .project({ _id: 1, dataNascimento: 1, potencialClass: 1 })
  .toArray();
const velhos = todos.filter((p) => {
  const a = anosDe(p.dataNascimento);
  return a != null && a > IDADE_MAX_POTENCIAL;
});
const idsVelhos = velhos.map((p) => p._id);

// 1) Limpar o potencial dos jogadores 23+ que ainda o tinham preenchido.
const comPot = velhos.filter((p) => p.potencialClass).map((p) => p._id);
const r1 = comPot.length
  ? await players.updateMany({ _id: { $in: comPot } }, { $set: { potencialClass: '' } })
  : { modifiedCount: 0 };
console.log(`[migração] potencial limpo em ${r1.modifiedCount} jogador(es) com 23+ anos.`);

// 2) Limpar o potencial nas observações desses jogadores.
const r2 = idsVelhos.length
  ? await observations.updateMany(
      { jogador: { $in: idsVelhos }, potencialClass: { $nin: [null, ''] } },
      { $set: { potencialClass: '' } }
    )
  : { modifiedCount: 0 };
console.log(`[migração] potencial limpo em ${r2.modifiedCount} observação(ões) de jogadores 23+.`);

await mongoose.disconnect();
console.log('[migração] concluída.');
