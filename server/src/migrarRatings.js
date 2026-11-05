// Migração única: ratingFinal de cada jogador = média dos ratings das suas
// observações (null se não tiver nenhuma). Correr com: node src/migrarRatings.js
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Player from './models/Player.js';
import Observation from './models/Observation.js';

await connectDB(process.env.MONGODB_URI);

const players = await Player.find().select('_id nomeCompleto ratingFinal').lean();
let mudados = 0;
let comRating = 0;
for (const p of players) {
  const obs = await Observation.find({ jogador: p._id }).select('rating').lean();
  const rs = obs.map((o) => o.rating).filter((r) => typeof r === 'number');
  const media = rs.length ? Math.round((rs.reduce((s, r) => s + r, 0) / rs.length) * 10) / 10 : null;
  if (media != null) comRating++;
  const atual = p.ratingFinal ?? null;
  if (media !== atual) {
    await Player.updateOne({ _id: p._id }, { ratingFinal: media });
    mudados++;
  }
}
console.log(`Jogadores: ${players.length} | com rating (têm observações): ${comRating} | atualizados: ${mudados}`);
await mongoose.disconnect();
process.exit(0);
