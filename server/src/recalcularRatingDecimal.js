// Migração: reaplica a nova fórmula do rating (UMA casa decimal) às observações
// existentes — recalcula o rating de cada observação a partir das suas dimensões
// guardadas — e atualiza o ratingFinal (média das observações) de cada jogador.
// Correr com: node src/recalcularRatingDecimal.js
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Player from './models/Player.js';
import Observation from './models/Observation.js';
import { calcularRatingFinal } from './constants.js';

await connectDB(process.env.MONGODB_URI);

// 1) Rating de cada observação (a partir das dimensões já gravadas).
const obs = await Observation.find().select('_id avaliacao rating').lean();
let obsMud = 0;
for (const o of obs) {
  const r = calcularRatingFinal(o.avaliacao);
  if (r != null && r !== o.rating) {
    await Observation.updateOne({ _id: o._id }, { rating: r });
    obsMud++;
  }
}

// 2) ratingFinal (média das observações) de cada jogador.
const players = await Player.find().select('_id ratingFinal').lean();
let plMud = 0;
for (const p of players) {
  const rs = (await Observation.find({ jogador: p._id }).select('rating').lean())
    .map((o) => o.rating)
    .filter((r) => typeof r === 'number');
  const media = rs.length ? Math.round((rs.reduce((s, r) => s + r, 0) / rs.length) * 10) / 10 : null;
  if (media !== (p.ratingFinal ?? null)) {
    await Player.updateOne({ _id: p._id }, { ratingFinal: media });
    plMud++;
  }
}

console.log(`Observações recalculadas: ${obsMud}/${obs.length} | jogadores atualizados: ${plMud}/${players.length}`);
await mongoose.disconnect();
process.exit(0);
