import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Player from './models/Player.js';
import Observation from './models/Observation.js';
import League from './models/League.js';
import Contact from './models/Contact.js';
import Club from './models/Club.js';
import Agendamento from './models/Agendamento.js';
import User from './models/User.js';

// Conta de demonstração, para a plataforma poder ser aberta logo após o seed.
// Só para uso local: apaga-a ou troca a palavra-passe antes de usar a sério
// (Definições → Gestor de contas, ou src/apagarUtilizador.js).
const DEMO = { username: 'demo', password: 'demo1234', papel: 'editor', nome: 'Scout' };

// Jogadores de exemplo (fictícios) para arrancar a base com dados de demonstração.
const jogadores = [
  { nomeCompleto: 'Rafael Monteiro Dias', posicaoPrincipal: 'GR', dataNascimento: new Date('2005-02-11'), clubeAtual: 'Leixões SC', liga: 'Liga 3', nacionalidade: 'Portugal', pePreferencial: 'Direito' },
  { nomeCompleto: 'Tomás Vieira Lopes', posicaoPrincipal: 'DD', posicoesSecundarias: ['DC'], dataNascimento: new Date('2006-09-03'), clubeAtual: 'FC Famalicão B', liga: 'Liga 3', nacionalidade: 'Portugal', pePreferencial: 'Direito' },
  { nomeCompleto: 'Diogo Fonseca Ramos', posicaoPrincipal: 'DC', dataNascimento: new Date('2004-05-20'), clubeAtual: 'Académico de Viseu', liga: 'Liga Portugal 2', nacionalidade: 'Portugal', pePreferencial: 'Esquerdo' },
  { nomeCompleto: 'Miguel Antunes Rocha', posicaoPrincipal: 'DC', dataNascimento: new Date('2007-01-14'), clubeAtual: 'Varzim SC', liga: 'Campeonato de Portugal', nacionalidade: 'Portugal', pePreferencial: 'Direito' },
  { nomeCompleto: 'André Carvalho Pires', posicaoPrincipal: 'DE', posicoesSecundarias: ['EE'], dataNascimento: new Date('2008-07-22'), clubeAtual: 'Rio Ave B', liga: 'Juniores A (Sub-19)', nacionalidade: 'Portugal', pePreferencial: 'Esquerdo' },
  { nomeCompleto: 'Gonçalo Teixeira Nunes', posicaoPrincipal: 'MDF', dataNascimento: new Date('2003-11-30'), clubeAtual: 'GD Chaves', liga: 'Liga Portugal 2', nacionalidade: 'Portugal', pePreferencial: 'Direito' },
  { nomeCompleto: 'Rúben Cardoso Faria', posicaoPrincipal: 'MC', dataNascimento: new Date('2006-03-18'), clubeAtual: 'Moreirense B', liga: 'Liga 3', nacionalidade: 'Portugal', pePreferencial: 'Ambidestro' },
  { nomeCompleto: 'Nuno Ferreira Lima', posicaoPrincipal: 'MC', posicoesSecundarias: ['MDF'], dataNascimento: new Date('2005-08-27'), clubeAtual: 'CD Tondela', liga: 'Liga Portugal 2', nacionalidade: 'Portugal', pePreferencial: 'Direito' },
  { nomeCompleto: 'Hélder Barbosa Melo', posicaoPrincipal: 'MOF', dataNascimento: new Date('2007-04-09'), clubeAtual: 'Vitória SC B', liga: 'Juniores A (Sub-19)', nacionalidade: 'Portugal', pePreferencial: 'Esquerdo' },
  { nomeCompleto: 'Francisco Nogueira Pinto', posicaoPrincipal: 'EE', posicoesSecundarias: ['ED'], dataNascimento: new Date('2008-12-05'), clubeAtual: 'SC Braga B', liga: 'Juniores A (Sub-19)', nacionalidade: 'Portugal', pePreferencial: 'Direito' },
  { nomeCompleto: 'João Resende Matos', posicaoPrincipal: 'ED', dataNascimento: new Date('2004-06-16'), clubeAtual: 'Casa Pia AC B', liga: 'Liga 3', nacionalidade: 'Portugal', pePreferencial: 'Esquerdo' },
  { nomeCompleto: 'Pedro Alves Marques', posicaoPrincipal: 'PL', dataNascimento: new Date('2006-10-01'), clubeAtual: 'Estrela da Amadora B', liga: 'Liga 3', nacionalidade: 'Portugal', pePreferencial: 'Direito' },
  { nomeCompleto: 'Daniel Sousa Branco', posicaoPrincipal: 'PL', posicoesSecundarias: ['MOF'], dataNascimento: new Date('2007-02-28'), clubeAtual: 'FC Alverca', liga: 'Campeonato de Portugal', nacionalidade: 'Portugal', pePreferencial: 'Direito' },
  { nomeCompleto: 'Vasco Correia Leal', posicaoPrincipal: 'EE', dataNascimento: new Date('2009-05-12'), clubeAtual: 'Boavista FC Sub-19', liga: 'Juniores A (Sub-19)', nacionalidade: 'Portugal', pePreferencial: 'Esquerdo' },
];

async function run() {
  await connectDB(process.env.MONGODB_URI);

  // Limpar todos os dados existentes
  await Promise.all([
    Player.deleteMany({}),
    Observation.deleteMany({}),
    League.deleteMany({}),
    Contact.deleteMany({}),
    Club.deleteMany({}),
    Agendamento.deleteMany({}),
  ]);

  for (const j of jogadores) {
    await new Player(j).save(); // save() para disparar hooks
  }

  // Conta de demonstração (não mexe nas restantes contas que existam).
  let u = await User.findOne({ username: DEMO.username });
  const nova = !u;
  if (!u) u = new User({ username: DEMO.username });
  u.nome = DEMO.nome;
  u.papel = DEMO.papel;
  u.ativo = true;
  await u.definirPassword(DEMO.password);
  await u.save();

  console.log(`[seed] Base limpa. ${jogadores.length} jogadores de exemplo inseridos.`);
  console.log(
    `[seed] Conta de demonstração ${nova ? 'criada' : 'atualizada'}: ` +
      `${DEMO.username} / ${DEMO.password} (${DEMO.papel}). Apaga-a antes de usar a sério.`
  );
  await mongoose.disconnect();
}

run();
