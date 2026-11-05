import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Player from './models/Player.js';
import Observation from './models/Observation.js';

// Diagnóstico: quantos jogadores existem e como se distribuem.
async function run() {
  await connectDB(process.env.MONGODB_URI);

  const total = await Player.countDocuments();
  const plantel = await Player.countDocuments({ doPlantel: true });
  const naoPlantel = await Player.countDocuments({ doPlantel: { $ne: true } });
  const arquivo = await Player.countDocuments({ doPlantel: { $ne: true }, veredito: 'Não avança' });
  const semVeredito = await Player.countDocuments({ doPlantel: { $ne: true }, veredito: { $in: [null, ''] } });

  const comObs = (await Observation.distinct('jogador')).length;

  // Jogadores não-plantel SEM observação (os que o filtro antigo escondia).
  const idsComObs = await Observation.distinct('jogador');
  const semObs = await Player.countDocuments({
    doPlantel: { $ne: true },
    _id: { $nin: idsComObs },
  });

  console.log('--- Diagnóstico de jogadores ---');
  console.log('Total na BD:            ', total);
  console.log('  Plantel (doPlantel):  ', plantel);
  console.log('  Scouting (não plantel):', naoPlantel);
  console.log('    dos quais arquivados (Não avança):', arquivo);
  console.log('    sem veredito:        ', semVeredito);
  console.log('    sem observação:      ', semObs);
  console.log('Jogadores com ≥1 observação (qualquer):', comObs);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[diagnóstico] Erro:', err.message);
  process.exit(1);
});
