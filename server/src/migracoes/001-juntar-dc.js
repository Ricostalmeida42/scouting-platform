// Migração: junta DC_DIR e DC_ESQ numa única posição DC.
// Correr uma vez:  node src/migracoes/001-juntar-dc.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Player from '../models/Player.js';
import Observation from '../models/Observation.js';

const ANTIGAS = ['DC_DIR', 'DC_ESQ'];

await connectDB(process.env.MONGODB_URI);

// 1. Jogadores — posição principal
const p1 = await Player.updateMany(
  { posicaoPrincipal: { $in: ANTIGAS } },
  { $set: { posicaoPrincipal: 'DC' } }
);

// 2. Jogadores — posições secundárias (substitui e remove duplicados)
const comSecundarias = await Player.find({ posicoesSecundarias: { $in: ANTIGAS } });
for (const j of comSecundarias) {
  const novas = [...new Set(j.posicoesSecundarias.map((p) => (ANTIGAS.includes(p) ? 'DC' : p)))];
  await Player.updateOne({ _id: j._id }, { $set: { posicoesSecundarias: novas } });
}

// 3. Observações — posição no jogo
const p3 = await Observation.updateMany(
  { posicaoJogo: { $in: ANTIGAS } },
  { $set: { posicaoJogo: 'DC' } }
);

console.log(
  `[migração] jogadores(principal): ${p1.modifiedCount} · secundárias: ${comSecundarias.length} · observações: ${p3.modifiedCount}`
);
await mongoose.disconnect();
