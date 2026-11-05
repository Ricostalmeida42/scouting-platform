// Migração: elimina os campos comportamental / comportamentalNotas.
//
// Porquê: a dimensão Comportamental vinha da secção 1.3 do Modelo Operacional,
// que lista critérios de observação. A secção 5.2 (dimensões com peso) e a
// fórmula da 5.3 nunca a incluíram — era uma nota de 1-10 que não contava para
// nada. Dos três critérios, "atitude no treino" não é observável, "disciplina"
// é dado histórico e "estabilidade contratual" já está em campos próprios
// (fimContrato, agente, tag de estado contratual).
//
// Os valores preenchidos são guardados em JSON antes de serem removidos, para
// o caso de fazerem falta.
//
// Correr:  node src/migracoes/004-remover-comportamental.js
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';

await connectDB(process.env.MONGODB_URI);
const col = mongoose.connection.collection('players');

const preenchidos = await col
  .find({
    $or: [
      { comportamental: { $ne: null, $exists: true } },
      { comportamentalNotas: { $nin: [null, ''], $exists: true } },
    ],
  })
  .project({ nomeCompleto: 1, comportamental: 1, comportamentalNotas: 1 })
  .toArray();

if (preenchidos.length > 0) {
  const destino = path.resolve('comportamental-arquivado.json');
  fs.writeFileSync(destino, JSON.stringify(preenchidos, null, 2), 'utf8');
  console.log(`[migração] ${preenchidos.length} valor(es) guardado(s) em ${destino}`);
  preenchidos.forEach((p) =>
    console.log(`           ${p.nomeCompleto}: ${p.comportamental ?? '—'} ${p.comportamentalNotas || ''}`)
  );
}

const r = await col.updateMany({}, { $unset: { comportamental: '', comportamentalNotas: '' } });
console.log(`[migração] campos removidos de ${r.modifiedCount} jogador(es).`);
await mongoose.disconnect();
