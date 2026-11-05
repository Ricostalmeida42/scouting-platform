// Migração: remove os jogadores importados em massa ("adicionar todos os jogadores")
// que não têm qualquer ligação real ao scouting — sem observações, sem shadow team,
// sem planeamento, não do plantel, e sem referências (agendamentos/contactos).
//
// MANTÉM (keep): jogadores com ≥1 observação, do plantel (Clube), com shadowPos, com
// plano (planoTier/planoEstatuto), ou referenciados por agendamentos/contactos.
//
// Faz backup antes. Correr:  node src/migracoes/008-limpar-importados.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { escreverBackupDisco } from '../utils/backup.js';
import Player from '../models/Player.js';
import Observation from '../models/Observation.js';
import Agendamento from '../models/Agendamento.js';
import Contact from '../models/Contact.js';

await connectDB(process.env.MONGODB_URI);

const ficheiro = await escreverBackupDisco('pre-limpar-importados');
console.log(`[migração] backup: ${ficheiro || '(falhou — a abortar)'}`);
if (!ficheiro) {
  await mongoose.disconnect();
  process.exit(1);
}

const keep = new Set();
(await Observation.distinct('jogador')).forEach((id) => keep.add(String(id)));
(
  await Player.find({
    $or: [
      { doPlantel: true },
      { shadowPos: { $exists: true, $nin: [null, []] } },
      { planoTier: { $nin: [null, ''] } },
      { planoEstatuto: { $nin: [null] } },
    ],
  })
    .select('_id')
    .lean()
).forEach((p) => keep.add(String(p._id)));
(await Agendamento.distinct('jogador')).filter(Boolean).forEach((id) => keep.add(String(id)));
(await Contact.find({ jogadoresRepresentados: { $exists: true, $ne: [] } }).select('jogadoresRepresentados').lean()).forEach(
  (c) => (c.jogadoresRepresentados || []).forEach((id) => keep.add(String(id)))
);

const todos = await Player.find().select('_id').lean();
const apagarIds = todos.filter((p) => !keep.has(String(p._id))).map((p) => p._id);

console.log(`[migração] manter: ${keep.size} · apagar: ${apagarIds.length} (de ${todos.length})`);

if (apagarIds.length) {
  // Defensivo (devem ser 0): limpa observações e referências dos que vão sair.
  await Observation.deleteMany({ jogador: { $in: apagarIds } });
  await Agendamento.updateMany({ jogador: { $in: apagarIds } }, { $set: { jogador: null } });
  await Contact.updateMany(
    { jogadoresRepresentados: { $in: apagarIds } },
    { $pull: { jogadoresRepresentados: { $in: apagarIds } } }
  );
  const r = await Player.deleteMany({ _id: { $in: apagarIds } });
  console.log(`[migração] apagados ${r.deletedCount} jogador(es).`);
}

await mongoose.disconnect();
console.log('[migração] concluída.');
