import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User, { PAPEIS } from './models/User.js';

// Cria (ou atualiza) um utilizador da plataforma.
//
// Uso:
//   node src/criarUtilizador.js <username> <password> <editor|viewer> [Nome a mostrar]
//
// Exemplos:
//   node src/criarUtilizador.js admin "umaPassForte" editor "Administrador"
//   node src/criarUtilizador.js clube "passDoClube"  viewer "FC Exemplo"
//
// Em alternativa, pelas variáveis de ambiente SCOUT_USER / SCOUT_PASS /
// SCOUT_PAPEL / SCOUT_NOME (evita deixar a palavra-passe no histórico).
//
// A FUNÇÃO (cargo no clube — "Treinador", "Diretor desportivo"…) define-se pela
// variável SCOUT_FUNCAO e é a que aparece nas avaliações do plantel feitas por
// esta conta. Ex.: SCOUT_FUNCAO="Diretor desportivo" node src/criarUtilizador.js ...

async function run() {
  const [, , argUser, argPass, argPapel, ...argNome] = process.argv;

  const username = (process.env.SCOUT_USER || argUser || '').trim().toLowerCase();
  const password = process.env.SCOUT_PASS || argPass || '';
  const papel = (process.env.SCOUT_PAPEL || argPapel || 'viewer').trim();
  const nome = (process.env.SCOUT_NOME || argNome.join(' ') || '').trim();
  const funcao = (process.env.SCOUT_FUNCAO || '').trim();

  if (!username || !password) {
    console.error('\nUso: node src/criarUtilizador.js <username> <password> <editor|viewer> [Nome]\n');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('A palavra-passe tem de ter pelo menos 6 caracteres.');
    process.exit(1);
  }
  if (!PAPEIS.includes(papel)) {
    console.error(`Papel inválido: "${papel}". Usa um de: ${PAPEIS.join(', ')}`);
    process.exit(1);
  }

  await connectDB(process.env.MONGODB_URI);

  let u = await User.findOne({ username });
  const novo = !u;
  if (!u) u = new User({ username });
  if (nome) u.nome = nome;
  if (funcao) u.funcao = funcao;
  u.papel = papel;
  u.ativo = true;
  await u.definirPassword(password);
  await u.save();

  console.log(
    `[utilizadores] ${novo ? 'Criado' : 'Atualizado'}: ${u.username} (${u.papel})${u.nome ? ' — ' + u.nome : ''}`
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[utilizadores] Erro:', err.message);
  process.exit(1);
});
