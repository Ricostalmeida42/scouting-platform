// Migração única: remove o estado "Observação Confirmatória" (conceito eliminado).
// - Jogadores nesse estado passam a "Observação Inicial".
// - Remove-o do historicoEstados e colapsa duplicados consecutivos.
// Correr com: node src/migrarConfirmatoria.js
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Player from './models/Player.js';

const ALVO = 'Observação Confirmatória';

await connectDB(process.env.MONGODB_URI);

const players = await Player.find().select('_id estado historicoEstados').lean();
let mudados = 0;
for (const p of players) {
  const novoEstado = p.estado === ALVO ? 'Observação Inicial' : p.estado;
  const semAlvo = (p.historicoEstados || []).filter((h) => h.estado !== ALVO);
  const colapsado = semAlvo.filter((h, i) => i === 0 || h.estado !== semAlvo[i - 1].estado);
  const mudouHist = colapsado.length !== (p.historicoEstados || []).length;
  if (novoEstado !== p.estado || mudouHist) {
    await Player.updateOne({ _id: p._id }, { estado: novoEstado, historicoEstados: colapsado });
    mudados++;
  }
}
console.log(`Jogadores: ${players.length} | limpos de "${ALVO}": ${mudados}`);
await mongoose.disconnect();
process.exit(0);
