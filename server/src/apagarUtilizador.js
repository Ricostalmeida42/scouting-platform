import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';

// Apaga um utilizador da plataforma pelo username.
//
// Uso:
//   node src/apagarUtilizador.js <username>
//
// Não deixa a plataforma sem nenhum editor ativo.

async function run() {
  const username = (process.argv[2] || '').trim().toLowerCase();
  if (!username) {
    console.error('\nUso: node src/apagarUtilizador.js <username>\n');
    process.exit(1);
  }

  await connectDB(process.env.MONGODB_URI);

  const u = await User.findOne({ username });
  if (!u) {
    console.log(`[utilizadores] Não existe nenhum utilizador "${username}".`);
    await mongoose.disconnect();
    return;
  }

  if (u.papel === 'editor' && u.ativo) {
    const outrosEditores = await User.countDocuments({ papel: 'editor', ativo: true, _id: { $ne: u._id } });
    if (outrosEditores === 0) {
      console.error('[utilizadores] Não posso apagar: ficaria sem nenhum editor ativo.');
      process.exit(1);
    }
  }

  await u.deleteOne();
  const restantes = await User.find().select('username papel');
  console.log(
    `[utilizadores] Apagado "${username}". Restantes: ${restantes.map((x) => x.username + '(' + x.papel + ')').join(', ') || '(nenhum)'}`
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[utilizadores] Erro:', err.message);
  process.exit(1);
});
