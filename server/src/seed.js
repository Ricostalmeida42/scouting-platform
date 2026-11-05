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

// Avaliações de demonstração, uma por jogador. As notas das 4 dimensões estão na
// escala 1-5 (nível de liga) e geram o rating; o veredito acompanha o rating, para
// a base de exemplo ser coerente em vez de aleatória.
//   t = técnica · ta = tática · f = física · m = mental
const PERFIS_DEMO = {
  'Rafael Monteiro Dias':     { t:3, ta:3, f:3, m:3, veredito:'Nova observação', rend:'R2', pot:'P2', perfil:'misto',   imed:3, mp:3, lp:3, contrato:2027 },
  'Tomás Vieira Lopes':       { t:3, ta:3, f:4, m:3, veredito:'Nova observação', rend:'R2', pot:'P2', perfil:'fisico',  imed:3, mp:3, lp:4, contrato:2027 },
  'Diogo Fonseca Ramos':      { t:2, ta:3, f:3, m:2, veredito:'Não avança',      rend:'R3', pot:'P3', perfil:'fisico',  imed:2, mp:2, lp:2, contrato:2026 },
  'Miguel Antunes Rocha':     { t:4, ta:3, f:4, m:3, veredito:'A acompanhar',    rend:'R2', pot:'P2', perfil:'fisico',  imed:3, mp:4, lp:4, contrato:2028 },
  'André Carvalho Pires':     { t:4, ta:3, f:3, m:4, veredito:'A acompanhar',    rend:'R2', pot:'P1', perfil:'tecnico', imed:3, mp:4, lp:4, contrato:2028 },
  'Gonçalo Teixeira Nunes':   { t:3, ta:2, f:3, m:2, veredito:'Não avança',      rend:'R3', pot:'P3', perfil:'misto',   imed:2, mp:2, lp:2, contrato:2026 },
  'Rúben Cardoso Faria':      { t:4, ta:4, f:3, m:3, veredito:'A acompanhar',    rend:'R2', pot:'P2', perfil:'tecnico', imed:3, mp:4, lp:4, contrato:2027 },
  'Nuno Ferreira Lima':       { t:3, ta:3, f:3, m:4, veredito:'Nova observação', rend:'R2', pot:'P2', perfil:'misto',   imed:3, mp:3, lp:3, contrato:2027 },
  'Hélder Barbosa Melo':      { t:5, ta:4, f:4, m:5, veredito:'Contratar',       rend:'R1', pot:'P1', perfil:'tecnico', imed:4, mp:5, lp:5, contrato:2027 },
  'Francisco Nogueira Pinto': { t:5, ta:4, f:4, m:4, veredito:'Contratar',       rend:'R1', pot:'P1', perfil:'tecnico', imed:4, mp:4, lp:5, contrato:2028 },
  'João Resende Matos':       { t:3, ta:3, f:4, m:3, veredito:'Nova observação', rend:'R2', pot:'P2', perfil:'fisico',  imed:3, mp:3, lp:3, contrato:2026 },
  'Pedro Alves Marques':      { t:4, ta:3, f:4, m:3, veredito:'A acompanhar',    rend:'R2', pot:'P2', perfil:'misto',   imed:3, mp:4, lp:4, contrato:2027 },
  'Daniel Sousa Branco':      { t:4, ta:4, f:5, m:5, veredito:'Contratar',       rend:'R1', pot:'P1', perfil:'misto',   imed:4, mp:5, lp:5, contrato:2028 },
  'Vasco Correia Leal':       { t:4, ta:3, f:3, m:4, veredito:'A acompanhar',    rend:'R2', pot:'P1', perfil:'tecnico', imed:3, mp:4, lp:5, contrato:2029 },
};

// Jogos de onde saem as observações de exemplo.
const JOGOS = [
  { dias: 38, competicao: 'Liga 3',                  adversario: 'SC Covilhã' },
  { dias: 24, competicao: 'Campeonato de Portugal',  adversario: 'Anadia FC' },
  { dias: 11, competicao: 'Juniores A (Sub-19)',     adversario: 'FC Porto B' },
];

const haDias = (n) => new Date(Date.now() - n * 86400000);

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

  // Jogadores + uma observação cada, para a base abrir com ratings e vereditos
  // calculados em vez de colunas vazias.
  let nObs = 0;
  for (const [i, j] of jogadores.entries()) {
    const p = await new Player(j).save(); // save() para disparar hooks

    const d = PERFIS_DEMO[j.nomeCompleto];
    if (!d) continue;

    const jogo = JOGOS[i % JOGOS.length];
    const obs = new Observation({
      jogador: p._id,
      dataJogo: haDias(jogo.dias),
      competicao: jogo.competicao,
      adversario: jogo.adversario,
      minutos: 90,
      posicaoJogo: j.posicaoPrincipal,
      titular: true,
      avaliacao: { tecnica: d.t, tatica: d.ta, fisica: d.f, mental: d.m },
      veredito: d.veredito,
      rendimento: d.rend,
      potencialClass: d.pot,
    });
    await obs.save(); // o pre-save calcula o rating a partir da avaliação
    nObs += 1;

    // Espelha no jogador o que a rota /api/observations faria a seguir.
    p.avaliacao = { tecnica: d.t, tatica: d.ta, fisica: d.f, mental: d.m };
    p.ratingFinal = obs.rating;
    p.veredito = d.veredito;
    p.rendimento = d.rend;
    p.potencialClass = d.pot; // o pre-save limpa-o acima da idade máxima
    p.perfil = d.perfil;
    p.avaliacaoImediata = d.imed;
    p.avaliacaoMedioPrazo = d.mp;
    p.avaliacaoLongoPrazo = d.lp;
    p.fimContrato = new Date(d.contrato, 5, 30); // 30 de junho do ano indicado
    await p.save();
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

  console.log(
    `[seed] Base limpa. ${jogadores.length} jogadores e ${nObs} observações de exemplo inseridos.`
  );
  console.log(
    `[seed] Conta de demonstração ${nova ? 'criada' : 'atualizada'}: ` +
      `${DEMO.username} / ${DEMO.password} (${DEMO.papel}). Apaga-a antes de usar a sério.`
  );
  await mongoose.disconnect();
}

run();
