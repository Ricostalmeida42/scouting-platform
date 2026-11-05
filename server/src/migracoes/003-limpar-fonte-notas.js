// Migração: remove das notas dos jogadores as referências à fonte externa.
// Correr:  node src/migracoes/003-limpar-fonte-notas.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Player from '../models/Player.js';

await connectDB(process.env.MONGODB_URI);

const jogadores = await Player.find({ notas: /zerozero/i });
let alterados = 0;

for (const j of jogadores) {
  const limpo = j.notas
    .split(' · ')
    .filter((p) => !/zerozero/i.test(p))
    .map((p) => p.replace(/\s*\(o zerozero indica apenas "Avançado"\)/i, ' (consta apenas como "Avançado")'))
    .join(' · ')
    .trim();
  j.notas = limpo;
  await j.save();
  alterados++;
}

console.log(`[migração] notas limpas em ${alterados} jogador(es).`);
await mongoose.disconnect();
