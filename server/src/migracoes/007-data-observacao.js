// Migração: preenche `dataObservacao` (data em que o jogo foi VISTO) nas observações
// antigas, que só tinham `dataJogo` (data em que o jogo foi disputado).
//
// A partir de agora a "data da observação" em toda a plataforma é a data vista. Para
// as observações existentes usa-se o `createdAt` (quando foram registadas, ≈ quando
// foram vistas); se faltar, cai no `dataJogo`.
//
// Faz backup antes. Correr:  node src/migracoes/007-data-observacao.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { escreverBackupDisco } from '../utils/backup.js';

await connectDB(process.env.MONGODB_URI);

const ficheiro = await escreverBackupDisco('pre-data-observacao');
console.log(`[migração] backup: ${ficheiro || '(falhou — a abortar)'}`);
if (!ficheiro) {
  await mongoose.disconnect();
  process.exit(1);
}

const col = mongoose.connection.collection('observations');
const semData = await col
  .find({ $or: [{ dataObservacao: { $exists: false } }, { dataObservacao: null }] })
  .project({ createdAt: 1, dataJogo: 1 })
  .toArray();

let n = 0;
for (const o of semData) {
  const data = o.createdAt || o.dataJogo;
  if (!data) continue;
  await col.updateOne({ _id: o._id }, { $set: { dataObservacao: data } });
  n++;
}

console.log(`[migração] dataObservacao preenchida em ${n} observação(ões) (de ${semData.length} sem data).`);
await mongoose.disconnect();
console.log('[migração] concluída.');
