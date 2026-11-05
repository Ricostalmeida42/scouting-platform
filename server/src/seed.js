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
// O catálogo de atributos por posição vive no cliente e não tem dependências,
// por isso serve de fonte única também para o seed.
import { GRELHA_PADRAO } from '../../client/src/grelhaPosicao.js';

// Conta de demonstração, para a plataforma poder ser aberta logo após o seed.
// Só para uso local: apaga-a ou troca a palavra-passe antes de usar a sério
// (Definições → Gestor de contas, ou src/apagarUtilizador.js).
const DEMO = { username: 'demo', password: 'demo1234', papel: 'editor', nome: 'Scout' };

// Avaliações de demonstração, uma por jogador. As notas das 4 dimensões estão na
// escala 1-5 (nível de liga) e geram o rating; o veredito acompanha o rating, para
// a base de exemplo ser coerente em vez de aleatória.
//   t = técnica · ta = tática · f = física · m = mental
const PERFIS_DEMO = {
  'Rafael Monteiro Dias':     { t:3, ta:3, f:3, m:3, veredito:'Nova observação', rend:'R2', pot:'P2', perfil:'misto',   imed:3, mp:3, lp:3, contrato:2027, shadow:'GR',
    estilo:'Guarda-redes de linha, seguro no jogo aéreo. Participação na construção ainda por avaliar com bola pressionada.' },
  'Tomás Vieira Lopes':       { t:3, ta:3, f:4, m:3, veredito:'Nova observação', rend:'R2', pot:'P2', perfil:'fisico',  imed:3, mp:3, lp:4, contrato:2027, shadow:'DD',
    estilo:'Lateral de ida e volta, forte no apoio ofensivo. Decisão no último terço inconsistente.' },
  'Diogo Fonseca Ramos':      { t:2, ta:3, f:3, m:2, veredito:'Não avança',      rend:'R3', pot:'P3', perfil:'fisico',  imed:2, mp:2, lp:2, contrato:2026, shadow:null,
    estilo:'Central de duelo, cumpre no corpo a corpo. Limitado na saída de bola para o modelo pretendido.' },
  'Miguel Antunes Rocha':     { t:4, ta:3, f:4, m:3, veredito:'A acompanhar',    rend:'R2', pot:'P2', perfil:'fisico',  imed:3, mp:4, lp:4, contrato:2028, shadow:'DC',
    estilo:'Central esquerdo com saída de bola em condução. Boa leitura antecipada; por vezes precipitado a sair da linha.' },
  'André Carvalho Pires':     { t:4, ta:3, f:3, m:4, veredito:'A acompanhar',    rend:'R2', pot:'P1', perfil:'tecnico', imed:3, mp:4, lp:4, contrato:2028, shadow:'DE',
    estilo:'Lateral esquerdo técnico, confortável a receber entre linhas. Deve crescer na fase defensiva.' },
  'Gonçalo Teixeira Nunes':   { t:3, ta:2, f:3, m:2, veredito:'Não avança',      rend:'R3', pot:'P3', perfil:'misto',   imed:2, mp:2, lp:2, contrato:2026, shadow:null,
    estilo:'Médio defensivo posicional. Ritmo de circulação abaixo do exigido; pouca margem pela idade.' },
  'Rúben Cardoso Faria':      { t:4, ta:4, f:3, m:3, veredito:'A acompanhar',    rend:'R2', pot:'P2', perfil:'tecnico', imed:3, mp:4, lp:4, contrato:2027, shadow:'MC',
    estilo:'Médio de construção, bom primeiro passe e orientação de corpo. Intensidade sem bola a confirmar.' },
  'Nuno Ferreira Lima':       { t:3, ta:3, f:3, m:4, veredito:'Nova observação', rend:'R2', pot:'P2', perfil:'misto',   imed:3, mp:3, lp:3, contrato:2027, shadow:'MDF',
    estilo:'Médio equilibrador, lê bem os espaços. Mais seguro em posse curta do que em transição.' },
  'Hélder Barbosa Melo':      { t:5, ta:4, f:4, m:5, veredito:'Contratar',       rend:'R1', pot:'P1', perfil:'tecnico', imed:4, mp:5, lp:5, contrato:2027, shadow:'MOF',
    estilo:'Médio ofensivo criativo, decide bem sob pressão. O melhor da lista no último passe.' },
  'Francisco Nogueira Pinto': { t:5, ta:4, f:4, m:4, veredito:'Contratar',       rend:'R1', pot:'P1', perfil:'tecnico', imed:4, mp:4, lp:5, contrato:2028, shadow:'EE',
    estilo:'Extremo esquerdo de 1x1, aceleração curta e remate de fora. Margem de evolução grande para a idade.' },
  'João Resende Matos':       { t:3, ta:3, f:4, m:3, veredito:'Nova observação', rend:'R2', pot:'P2', perfil:'fisico',  imed:3, mp:3, lp:3, contrato:2026, shadow:'ED',
    estilo:'Extremo direito de profundidade. Eficaz em campo aberto, menos útil contra bloco baixo.' },
  'Pedro Alves Marques':      { t:4, ta:3, f:4, m:3, veredito:'A acompanhar',    rend:'R2', pot:'P2', perfil:'misto',   imed:3, mp:4, lp:4, contrato:2027, shadow:null,
    estilo:'Ponta de lança de referência, protege bem a bola de costas. Alternativa ao perfil titular.' },
  'Daniel Sousa Branco':      { t:4, ta:4, f:5, m:5, veredito:'Contratar',       rend:'R1', pot:'P1', perfil:'misto',   imed:4, mp:5, lp:5, contrato:2028, shadow:'PL',
    estilo:'Avançado completo: ataca a profundidade e finaliza com os dois pés. Perfil mais pronto da lista.' },
  'Vasco Correia Leal':       { t:4, ta:3, f:3, m:4, veredito:'A acompanhar',    rend:'R2', pot:'P1', perfil:'tecnico', imed:3, mp:4, lp:5, contrato:2029, shadow:null,
    estilo:'Extremo canhoto a jogar invertido. Muito jovem; seguir ao longo da época.' },
};

// Jogos de onde saem as observações de exemplo.
const JOGOS = [
  { dias: 74, competicao: 'Liga 3',                 adversario: 'SC Covilhã' },
  { dias: 52, competicao: 'Campeonato de Portugal', adversario: 'Anadia FC' },
  { dias: 31, competicao: 'Juniores A (Sub-19)',    adversario: 'FC Porto B' },
  { dias: 12, competicao: 'Liga Revelação',         adversario: 'Gil Vicente FC' },
];

const haDias = (n) => new Date(Date.now() - n * 86400000);

// Gerador determinístico: o seed produz sempre a mesma base, para a demonstração
// ser reproduzível e as capturas de ecrã não mudarem a cada execução.
function aleatorio(semente) {
  let s = [...String(semente)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const limitar = (n) => Math.max(1, Math.min(5, Math.round(n)));

// Preenche a grelha de atributos da posição à volta dos níveis-alvo de cada
// dimensão, com variação pequena para as notas não saírem todas iguais.
function gerarGrelha(pos, alvos, rnd) {
  const grelha = {};
  const dims = GRELHA_PADRAO[pos];
  if (!dims) return grelha;
  for (const [cat, attrs] of Object.entries(dims)) {
    const alvo = alvos[cat];
    if (alvo == null) continue;
    for (const a of attrs) grelha[`${cat}.${a.k}`] = limitar(alvo + (rnd() * 1.6 - 0.8));
  }
  return grelha;
}

// Nota da dimensão = média ponderada dos atributos da grelha (igual ao que o
// formulário de observação calcula no cliente).
function notaDimensao(pos, cat, grelha) {
  const attrs = (GRELHA_PADRAO[pos] || {})[cat] || [];
  const notas = attrs
    .map((a) => ({ p: a.p || 2, v: grelha[`${cat}.${a.k}`] }))
    .filter((x) => typeof x.v === 'number');
  if (!notas.length) return null;
  const somaPesos = notas.reduce((s, x) => s + x.p, 0);
  const total = notas.reduce((s, x) => s + x.v * x.p, 0);
  return Math.round((total / somaPesos) * 10) / 10;
}

// Pontos fortes e a desenvolver saem dos próprios atributos melhor e pior
// pontuados, para o texto não contradizer a grelha.
function textoFortesFracos(pos, grelha) {
  const rotulos = {};
  for (const [cat, attrs] of Object.entries(GRELHA_PADRAO[pos] || {})) {
    for (const a of attrs) rotulos[`${cat}.${a.k}`] = a.l;
  }
  const ordenados = Object.entries(grelha)
    .filter(([k]) => rotulos[k])
    .sort((a, b) => b[1] - a[1]);
  const nomes = (lista) => lista.map(([k]) => rotulos[k].split(' / ')[0]).join(', ');
  return {
    fortes: nomes(ordenados.slice(0, 3)),
    fracos: nomes(ordenados.slice(-2)),
  };
}

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

    const rnd = aleatorio(j.nomeCompleto);
    const pos = j.posicaoPrincipal;
    // Duas ou três observações por jogador, para a ficha ter histórico e o
    // painel de consistência ter o que comparar.
    const quantas = 2 + (i % 2);
    const ratings = [];
    let ultima = null;

    for (let n = 0; n < quantas; n += 1) {
      const jogo = JOGOS[(i + n) % JOGOS.length];
      // A primeira observação é ligeiramente mais contida: o jogador ainda está
      // a ser conhecido, e a avaliação converge com o número de jogos vistos.
      const ajuste = n === 0 ? -0.4 : 0;
      const alvos = {
        tecnica: d.t + ajuste,
        tatica: d.ta + ajuste,
        fisica: d.f + ajuste,
        mental: d.m + ajuste,
      };
      const grelha = gerarGrelha(pos, alvos, rnd);
      const avaliacao = {
        tecnica: notaDimensao(pos, 'tecnica', grelha),
        tatica: notaDimensao(pos, 'tatica', grelha),
        fisica: notaDimensao(pos, 'fisica', grelha),
        mental: notaDimensao(pos, 'mental', grelha),
      };
      const { fortes, fracos } = textoFortesFracos(pos, grelha);
      const ultimaDoJogador = n === quantas - 1;

      const obs = new Observation({
        jogador: p._id,
        dataJogo: haDias(jogo.dias),
        competicao: jogo.competicao,
        adversario: jogo.adversario,
        minutos: n === 0 ? 62 : 90,
        posicaoJogo: pos,
        titular: n !== 0,
        avaliacao,
        grelhaPosicao: grelha,
        fortes,
        fracos,
        estiloJogo: d.estilo,
        notas: `Observado frente ao ${jogo.adversario}. ${ultimaDoJogador ? 'Confirma a leitura das observações anteriores.' : 'Primeira observação; a confirmar em contexto diferente.'}`,
        veredito: ultimaDoJogador ? d.veredito : 'Nova observação',
        rendimento: d.rend,
        potencialClass: d.pot,
      });
      await obs.save(); // o pre-save calcula o rating a partir da avaliação
      nObs += 1;
      ratings.push(obs.rating);
      if (ultimaDoJogador) ultima = { avaliacao };
    }

    // Espelha no jogador o que a rota /api/observations faria a seguir.
    p.avaliacao = ultima.avaliacao;
    p.ratingFinal = Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10;
    p.veredito = d.veredito;
    p.rendimento = d.rend;
    p.potencialClass = d.pot; // o pre-save limpa-o acima da idade máxima
    p.perfil = d.perfil;
    p.avaliacaoImediata = d.imed;
    p.avaliacaoMedioPrazo = d.mp;
    p.avaliacaoLongoPrazo = d.lp;
    p.fimContrato = new Date(d.contrato, 5, 30); // 30 de junho do ano indicado
    // Onze-sombra: um alvo por posição. Quem não avança fica de fora, e os
    // alternativas ficam sem casa atribuída, como aconteceria num clube.
    p.shadowPos = d.shadow ? [d.shadow] : [];
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
