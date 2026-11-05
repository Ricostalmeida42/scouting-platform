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

// Nível médio ponderado das quatro dimensões-alvo, na mesma proporção que o
// rating usa. Serve de base a tudo o que se deriva a seguir.
const nivelMedio = (j) => (j.t * 0.2 + j.ta * 0.2 + j.f * 0.15 + j.m * 0.2) / 0.75;

const idadeEm = (nasc) => Math.floor((Date.now() - new Date(nasc)) / 31557600000);

// Rendimento, potencial, perfil e avaliação por horizonte derivam das notas e da
// idade, em vez de serem escritos à mão. Assim não podem contradizer a grelha.
function classificar(j) {
  const n = nivelMedio(j);
  const idade = idadeEm(j.nasc);
  return {
    idade,
    rend: n >= 3.9 ? 'R1' : n >= 2.9 ? 'R2' : 'R3',
    pot: n >= 3.9 ? 'P1' : n >= 2.9 ? (idade <= 20 ? 'P1' : 'P2') : 'P3',
    perfil: j.t - j.f >= 1 ? 'tecnico' : j.f - j.t >= 1 ? 'fisico' : 'misto',
    imed: limitar(n),
    mp: limitar(n + (idade <= 21 ? 0.7 : 0)),
    lp: limitar(n + (idade <= 18 ? 1.4 : idade <= 21 ? 0.9 : 0)),
  };
}


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

// Base de exemplo: 34 jogadores fictícios em clubes portugueses reais, cada um
// com as notas-alvo das 4 dimensões (1-5, nível de liga) e o veredito do scout.
// Tudo o resto — rendimento, potencial, perfil, horizontes, rating — é derivado.
//   t = técnica · ta = tática · f = física · m = mental · obs = nº de observações
const JOGADORES = [
  { nome:'Rafael Monteiro Dias', pos:'GR', nasc:'2005-02-11', clube:'Leixões SC', liga:'Liga 3', pe:'Direito',
    t:3, ta:3, f:3, m:3, veredito:'Nova observação', contrato:2027, shadow:'GR', obs:3,
    estilo:'Guarda-redes de linha, seguro no jogo aéreo. Participação na construção ainda por avaliar com bola pressionada.' },
  { nome:'Tomás Vieira Lopes', pos:'DD', sec:['DC'], nasc:'2006-09-03', clube:'FC Famalicão B', liga:'Liga 3', pe:'Direito',
    t:3, ta:3, f:4, m:3, veredito:'Nova observação', contrato:2027, shadow:'DD', obs:2,
    estilo:'Lateral de ida e volta, forte no apoio ofensivo. Decisão no último terço inconsistente.' },
  { nome:'Diogo Fonseca Ramos', pos:'DC', nasc:'2004-05-20', clube:'Académico de Viseu', liga:'Liga Portugal 2', pe:'Esquerdo',
    t:2, ta:3, f:3, m:2, veredito:'Não avança', contrato:2026, obs:3,
    estilo:'Central de duelo, cumpre no corpo a corpo. Limitado na saída de bola para o modelo pretendido.' },
  { nome:'Miguel Antunes Rocha', pos:'DC', nasc:'2007-01-14', clube:'Varzim SC', liga:'Campeonato de Portugal', pe:'Direito',
    t:4, ta:3, f:4, m:3, veredito:'A acompanhar', contrato:2028, shadow:'DC', obs:2,
    estilo:'Central esquerdo com saída de bola em condução. Boa leitura antecipada; por vezes precipitado a sair da linha.' },
  { nome:'André Carvalho Pires', pos:'DE', sec:['EE'], nasc:'2008-07-22', clube:'Rio Ave B', liga:'Juniores A (Sub-19)', pe:'Esquerdo',
    t:4, ta:3, f:3, m:4, veredito:'A acompanhar', contrato:2028, shadow:'DE', obs:3,
    estilo:'Lateral esquerdo técnico, confortável a receber entre linhas. Deve crescer na fase defensiva.' },
  { nome:'Gonçalo Teixeira Nunes', pos:'MDF', nasc:'2003-11-30', clube:'GD Chaves', liga:'Liga Portugal 2', pe:'Direito',
    t:3, ta:2, f:3, m:2, veredito:'Não avança', contrato:2026, obs:2,
    estilo:'Médio defensivo posicional. Ritmo de circulação abaixo do exigido; pouca margem pela idade.' },
  { nome:'Rúben Cardoso Faria', pos:'MC', nasc:'2006-03-18', clube:'Moreirense B', liga:'Liga 3', pe:'Ambidestro',
    t:4, ta:4, f:3, m:3, veredito:'A acompanhar', contrato:2027, shadow:'MC', obs:3,
    estilo:'Médio de construção, bom primeiro passe e orientação de corpo. Intensidade sem bola a confirmar.' },
  { nome:'Nuno Ferreira Lima', pos:'MC', sec:['MDF'], nasc:'2005-08-27', clube:'CD Tondela', liga:'Liga Portugal 2', pe:'Direito',
    t:3, ta:3, f:3, m:4, veredito:'Nova observação', contrato:2027, shadow:'MDF', obs:2,
    estilo:'Médio equilibrador, lê bem os espaços. Mais seguro em posse curta do que em transição.' },
  { nome:'Hélder Barbosa Melo', pos:'MOF', nasc:'2007-04-09', clube:'Vitória SC B', liga:'Juniores A (Sub-19)', pe:'Esquerdo',
    t:5, ta:4, f:4, m:5, veredito:'Contratar', contrato:2027, shadow:'MOF', obs:3,
    estilo:'Médio ofensivo criativo, decide bem sob pressão. O melhor da lista no último passe.' },
  { nome:'Francisco Nogueira Pinto', pos:'EE', sec:['ED'], nasc:'2008-12-05', clube:'SC Braga B', liga:'Juniores A (Sub-19)', pe:'Direito',
    t:5, ta:4, f:4, m:4, veredito:'Contratar', contrato:2028, shadow:'EE', obs:2,
    estilo:'Extremo esquerdo de um contra um, aceleração curta e remate de fora. Margem de evolução grande para a idade.' },
  { nome:'João Resende Matos', pos:'ED', nasc:'2004-06-16', clube:'Casa Pia AC B', liga:'Liga 3', pe:'Esquerdo',
    t:3, ta:3, f:4, m:3, veredito:'Nova observação', contrato:2026, shadow:'ED', obs:3,
    estilo:'Extremo direito de profundidade. Eficaz em campo aberto, menos útil contra bloco baixo.' },
  { nome:'Pedro Alves Marques', pos:'PL', nasc:'2006-10-01', clube:'Estrela da Amadora B', liga:'Liga 3', pe:'Direito',
    t:4, ta:3, f:4, m:3, veredito:'A acompanhar', contrato:2027, obs:2,
    estilo:'Ponta de lança de referência, protege bem a bola de costas. Alternativa ao perfil titular.' },
  { nome:'Daniel Sousa Branco', pos:'PL', sec:['MOF'], nasc:'2007-02-28', clube:'FC Alverca', liga:'Campeonato de Portugal', pe:'Direito',
    t:4, ta:4, f:5, m:5, veredito:'Contratar', contrato:2028, shadow:'PL', obs:3,
    estilo:'Avançado completo: ataca a profundidade e finaliza com os dois pés. Perfil mais pronto da lista.' },
  { nome:'Vasco Correia Leal', pos:'EE', nasc:'2009-05-12', clube:'Boavista FC Sub-19', liga:'Juniores A (Sub-19)', pe:'Esquerdo',
    t:4, ta:3, f:3, m:4, veredito:'A acompanhar', contrato:2029, obs:2,
    estilo:'Extremo canhoto a jogar invertido. Muito jovem; seguir ao longo da época.' },
  { nome:'Tiago Moreira Antunes', pos:'GR', nasc:'2006-04-18', clube:'Académica de Coimbra', liga:'Liga 3', pe:'Direito',
    t:3, ta:3, f:4, m:3, veredito:'Nova observação', contrato:2027, obs:4,
    estilo:'Guarda-redes de reflexo, domina bem a pequena área. Jogo de pés limitado sob pressão alta.' },
  { nome:'Bruno Loureiro Castro', pos:'DD', nasc:'2007-08-02', clube:'SC Farense B', liga:'Campeonato de Portugal', pe:'Direito',
    t:3, ta:3, f:3, m:3, veredito:'Nova observação', contrato:2027, obs:5,
    estilo:'Lateral direito equilibrado, sem ponto forte evidente. Cumpre em bloco médio.' },
  { nome:'Afonso Neves Cardoso', pos:'DC', nasc:'2005-01-27', clube:'FC Vizela B', liga:'Liga 3', pe:'Direito',
    t:3, ta:4, f:4, m:4, veredito:'A acompanhar', contrato:2027, obs:4,
    estilo:'Central destro de bloco alto, agressivo a subir na linha. Boa comunicação com os laterais.' },
  { nome:'Martim Oliveira Sá', pos:'DC', sec:['MDF'], nasc:'2008-03-11', clube:'AD Sanjoanense', liga:'Campeonato de Portugal', pe:'Esquerdo',
    t:4, ta:4, f:4, m:4, veredito:'Contratar', contrato:2029, shadow:'DC', obs:5,
    estilo:'Central canhoto com passe quebra-linhas. Perfil raro no mercado e encaixa no modelo de construção.' },
  { nome:'Rodrigo Pinheiro Gomes', pos:'DE', nasc:'2006-11-23', clube:'Portimonense B', liga:'Liga 3', pe:'Esquerdo',
    t:3, ta:3, f:4, m:3, veredito:'A acompanhar', contrato:2028, obs:4,
    estilo:'Lateral esquerdo de repetição de corridas. Centro inconsistente, mas chega sempre à linha.' },
  { nome:'Simão Duarte Freitas', pos:'MDF', nasc:'2004-02-09', clube:'Leça FC', liga:'Campeonato de Portugal', pe:'Direito',
    t:2, ta:3, f:3, m:3, veredito:'Não avança', contrato:2026, obs:4,
    estilo:'Médio de corte, útil sem bola. Primeiro passe curto demais para a saída pretendida.' },
  { nome:'Henrique Barros Teixeira', pos:'MC', sec:['MOF'], nasc:'2007-06-30', clube:'FC Felgueiras 1932', liga:'Liga 3', pe:'Direito',
    t:4, ta:4, f:3, m:4, veredito:'A acompanhar', contrato:2028, obs:5,
    estilo:'Médio de meia-distância, chega bem à área à segunda bola. Volume de corrida a confirmar em 90 minutos.' },
  { nome:'Leandro Martins Vaz', pos:'MC', nasc:'2005-09-14', clube:'SC Espinho', liga:'Campeonato de Portugal', pe:'Ambidestro',
    t:3, ta:3, f:3, m:2, veredito:'Não avança', contrato:2026, obs:4,
    estilo:'Médio ambidestro, tecnicamente correto. Quebra competitiva evidente na segunda parte.' },
  { nome:'Guilherme Santos Abreu', pos:'MOF', sec:['EE'], nasc:'2008-05-07', clube:'FC Penafiel', liga:'Liga Portugal 2', pe:'Esquerdo',
    t:4, ta:4, f:3, m:4, veredito:'A acompanhar', contrato:2029, obs:5,
    estilo:'Médio ofensivo associativo, joga entre linhas com orientação de corpo aberta. Fisicamente ainda a formar-se.' },
  { nome:'Dinis Ferreira Cunha', pos:'MOF', nasc:'2009-01-19', clube:'AVS Futebol SAD', liga:'Liga Portugal 2', pe:'Direito',
    t:4, ta:3, f:3, m:4, veredito:'Nova observação', contrato:2029, obs:4,
    estilo:'Muito jovem a competir em sénior. Lampejos de qualidade; falta constância nos 90 minutos.' },
  { nome:'Salvador Reis Mendes', pos:'EE', sec:['PL'], nasc:'2007-10-05', clube:'UD Oliveirense', liga:'Liga 3', pe:'Direito',
    t:4, ta:3, f:4, m:3, veredito:'A acompanhar', contrato:2028, obs:5,
    estilo:'Extremo de impacto direto, procura sempre o duelo individual. Participação defensiva irregular.' },
  { nome:'Lourenço Pacheco Nóbrega', pos:'ED', nasc:'2006-07-21', clube:'CD Nacional B', liga:'Campeonato de Portugal', pe:'Esquerdo',
    t:3, ta:2, f:3, m:3, veredito:'Não avança', contrato:2026, obs:4,
    estilo:'Extremo de drible repetido, perde demasiadas bolas em zonas de risco. Leitura tática curta.' },
  { nome:'Rui Monteiro Craveiro', pos:'PL', nasc:'2005-12-03', clube:'CD Trofense', liga:'Campeonato de Portugal', pe:'Direito',
    t:3, ta:3, f:4, m:3, veredito:'Nova observação', contrato:2027, obs:4,
    estilo:'Avançado de área, vive de duelos e segundas bolas. Pouco participativo na construção.' },
  { nome:'Gabriel Sousa Tavares', pos:'PL', sec:['EE'], nasc:'2008-09-26', clube:'Vilaverdense FC', liga:'Liga 3', pe:'Direito',
    t:5, ta:4, f:4, m:4, veredito:'Contratar', contrato:2028, obs:5,
    estilo:'Avançado móvel que parte da esquerda para dentro. Finalização limpa e sangue-frio na área.' },
  { nome:'Eduardo Lima Pereira', pos:'DC', nasc:'2007-03-30', clube:'Amarante FC', liga:'Campeonato de Portugal', pe:'Direito',
    t:2, ta:3, f:3, m:2, veredito:'Não avança', contrato:2026, obs:4,
    estilo:'Central de porte, domina o jogo aéreo defensivo. Muito exposto em campo aberto.' },
  { nome:'Mateus Correia Lobo', pos:'DD', sec:['ED'], nasc:'2008-11-08', clube:'Lusitânia de Lourosa', liga:'Campeonato de Portugal', pe:'Direito',
    t:3, ta:3, f:3, m:3, veredito:'Nova observação', contrato:2028, obs:5,
    estilo:'Lateral convertido de extremo, melhor com bola do que sem ela. Processo defensivo em construção.' },
  { nome:'Samuel Azevedo Rocha', pos:'MC', nasc:'2009-04-02', clube:'SC Braga Sub-19', liga:'Juniores A (Sub-19)', pe:'Esquerdo',
    t:4, ta:3, f:3, m:4, veredito:'A acompanhar', contrato:2029, obs:4,
    estilo:'Médio canhoto de formação de elite. Toque e cadência acima da média do escalão.' },
  { nome:'Ivo Carvalho Brandão', pos:'EE', nasc:'2009-08-17', clube:'Sporting CP Sub-19', liga:'Juniores A (Sub-19)', pe:'Direito',
    t:4, ta:3, f:3, m:3, veredito:'Nova observação', contrato:2029, obs:5,
    estilo:'Extremo explosivo em espaço curto. Decisão final ainda por amadurecer.' },
  { nome:'Nelson Fonseca Dias', pos:'MDF', sec:['DC'], nasc:'2008-06-12', clube:'FC Porto Sub-19', liga:'Juniores A (Sub-19)', pe:'Direito',
    t:3, ta:3, f:3, m:3, veredito:'Nova observação', contrato:2029, obs:4,
    estilo:'Médio defensivo que também joga a central. Versatilidade é o principal argumento.' },
  { nome:'Alexandre Pinto Gaspar', pos:'GR', nasc:'2009-02-24', clube:'SL Benfica Sub-19', liga:'Juniores A (Sub-19)', pe:'Direito',
    t:3, ta:3, f:3, m:2, veredito:'Não avança', contrato:2029, obs:5,
    estilo:'Guarda-redes de bom tamanho, mas inseguro nas saídas. Não reúne condições a curto prazo.' },
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

  // Jogadores + as suas observações, para a base abrir com ratings e vereditos
  // calculados em vez de colunas vazias.
  let nObs = 0;
  for (const [i, j] of JOGADORES.entries()) {
    const d = classificar(j);
    const pos = j.pos;

    const p = await new Player({
      nomeCompleto: j.nome,
      posicaoPrincipal: pos,
      posicoesSecundarias: j.sec || [],
      dataNascimento: new Date(j.nasc),
      clubeAtual: j.clube,
      liga: j.liga,
      nacionalidade: 'Portugal',
      pePreferencial: j.pe,
    }).save(); // save() para disparar hooks

    const rnd = aleatorio(j.nome);
    // Cada jogador tem o seu número de observações: uns foram vistos duas
    // vezes, outros cinco. A ficha ganha histórico e o painel de consistência
    // passa a ter o que comparar.
    const quantas = j.obs;
    const ratings = [];
    let ultima = null;

    for (let n = 0; n < quantas; n += 1) {
      const jogo = JOGOS[(i + n) % JOGOS.length];
      // As primeiras observações são mais contidas: o jogador ainda está a ser
      // conhecido, e a avaliação converge à medida que se vêem mais jogos.
      const ajuste = -0.5 * (1 - n / Math.max(1, quantas - 1));
      const alvos = {
        tecnica: j.t + ajuste,
        tatica: j.ta + ajuste,
        fisica: j.f + ajuste,
        mental: j.m + ajuste,
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
        estiloJogo: j.estilo,
        notas: `Observado frente ao ${jogo.adversario}. ${ultimaDoJogador ? 'Confirma a leitura das observações anteriores.' : n === 0 ? 'Primeira observação; a confirmar em contexto diferente.' : 'Em linha com o que foi visto antes.'}`,
        veredito: ultimaDoJogador ? j.veredito : 'Nova observação',
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
    p.veredito = j.veredito;
    p.rendimento = d.rend;
    p.potencialClass = d.pot; // o pre-save limpa-o acima da idade máxima
    p.perfil = d.perfil;
    p.avaliacaoImediata = d.imed;
    p.avaliacaoMedioPrazo = d.mp;
    p.avaliacaoLongoPrazo = d.lp;
    p.fimContrato = new Date(j.contrato, 5, 30); // 30 de junho do ano indicado
    // Onze-sombra: um alvo por posição. Quem não avança fica de fora, e as
    // alternativas ficam sem casa atribuída, como aconteceria num clube.
    p.shadowPos = j.shadow ? [j.shadow] : [];
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
    `[seed] Base limpa. ${JOGADORES.length} jogadores e ${nObs} observações de exemplo inseridos.`
  );
  console.log(
    `[seed] Conta de demonstração ${nova ? 'criada' : 'atualizada'}: ` +
      `${DEMO.username} / ${DEMO.password} (${DEMO.papel}). Apaga-a antes de usar a sério.`
  );
  await mongoose.disconnect();
}

run();
