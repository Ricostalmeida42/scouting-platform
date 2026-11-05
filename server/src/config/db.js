import mongoose from 'mongoose';

// Base por omissão: se o MONGODB_URI não estiver definido, o mongoose ligava-se
// em silêncio a uma base "test" vazia e parecia que se tinha perdido tudo. Aqui
// garante-se que, sem configuração, se liga à base certa e avisa-se o utilizador.
const URI_DEFAULT = 'mongodb://127.0.0.1:27017/scouting';

export async function connectDB(uri) {
  const alvo = uri && uri.trim() ? uri.trim() : URI_DEFAULT;
  if (!uri || !uri.trim()) {
    console.warn(`[db] MONGODB_URI não definido — a usar a base por omissão (${URI_DEFAULT}).`);
  }
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(alvo);
    console.log(`[db] Ligado ao MongoDB: base "${mongoose.connection.name}"`);
    if (mongoose.connection.name === 'test') {
      console.warn(
        '[db] AVISO: ligado à base "test". O URI está provavelmente mal configurado — ' +
          'os teus dados devem estar em "scouting". Verifica o MONGODB_URI no .env.'
      );
    }
  } catch (err) {
    console.error('[db] Falha na ligação ao MongoDB. O serviço do MongoDB está a correr?');
    console.error(`[db] ${err.message}`);
    process.exit(1);
  }
}
