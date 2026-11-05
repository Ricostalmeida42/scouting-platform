// Migração: remove das observações antigas os atributos de grelha que já saíram
// do modelo — `comunicacao` (Tática) e `altura` (Física). Ficavam gravados em
// `grelhaPosicao` (chaves "tatica.comunicacao" / "fisica.altura", valores 0-10
// antigos) e apareciam no detalhe da observação com o nome em bruto.
//
// Não recalcula nada: o rating/avaliacao das observações já está congelado.
// Faz backup antes. Correr:  node src/migracoes/009-limpar-atributos-grelha.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { escreverBackupDisco } from '../utils/backup.js';

await connectDB(process.env.MONGODB_URI);

const ficheiro = await escreverBackupDisco('pre-limpar-atributos-grelha');
console.log(`[migração] backup: ${ficheiro || '(falhou — a abortar)'}`);
if (!ficheiro) {
  await mongoose.disconnect();
  process.exit(1);
}

const col = mongoose.connection.collection('observations');
const todas = await col.find({ grelhaPosicao: { $exists: true } }).project({ grelhaPosicao: 1 }).toArray();

let n = 0;
let chavesRemovidas = 0;
for (const o of todas) {
  const g = o.grelhaPosicao || {};
  let mudou = false;
  for (const k of Object.keys(g)) {
    if (k.endsWith('.comunicacao') || k.endsWith('.altura')) {
      delete g[k];
      chavesRemovidas++;
      mudou = true;
    }
  }
  if (mudou) {
    await col.updateOne({ _id: o._id }, { $set: { grelhaPosicao: g } });
    n++;
  }
}

console.log(`[migração] limpas ${chavesRemovidas} chave(s) (comunicacao/altura) em ${n} observação(ões).`);
await mongoose.disconnect();
console.log('[migração] concluída.');
