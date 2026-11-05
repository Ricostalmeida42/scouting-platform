import mongoose from 'mongoose';
import {
  POSICAO_KEYS,
  ESTADOS_PLANTEL,
  RENDIMENTOS,
  POTENCIAIS,
  PERFIS,
  VEREDITOS,
  IDADE_MAX_POTENCIAL,
} from '../constants.js';

// Idade em anos a partir de uma data (Date ou string), ou null se inválida.
const anosDe = (d) => {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return Math.floor((Date.now() - dt.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
};

const { Schema } = mongoose;

// Subdocumento de avaliação: as 4 dimensões que geram o rating final ponderado.
const avaliacaoSchema = new Schema(
  {
    tecnica: { type: Number, min: 1, max: 10 },
    tatica: { type: Number, min: 1, max: 10 },
    fisica: { type: Number, min: 1, max: 10 },
    mental: { type: Number, min: 1, max: 10 },
  },
  { _id: false }
);

// Estatísticas da época puxadas de uma integração externa — atualizadas
// automaticamente na sincronização semanal. Não editadas à mão.
const statsZerozeroSchema = new Schema(
  {
    epoca: { type: String },
    competicao: { type: String },
    jogos: { type: Number },
    minutos: { type: Number },
    titular: { type: Number }, // nº de jogos como titular
    golos: { type: Number },
    atualizadoEm: { type: Date },
  },
  { _id: false }
);

const playerSchema = new Schema(
  {
    nomeCompleto: { type: String, required: true, trim: true },

    // Fotografia do jogador (data URL, já redimensionada no cliente).
    // Excluída das listagens por peso — só vem na ficha individual e no backup.
    foto: { type: String },

    // Jogador do plantel do clube (serve de referência/comparação).
    // Fica fora das vistas de scouting: lista, pipeline, shortlist e dashboard.
    doPlantel: { type: Boolean, default: false, index: true },
    posicaoPrincipal: { type: String, enum: POSICAO_KEYS, required: true, index: true },
    posicoesSecundarias: [{ type: String, enum: POSICAO_KEYS }],
    dataNascimento: {
      type: Date,
      // Evita idades negativas (nascimento no futuro) e datas absurdas.
      validate: {
        validator: (v) => !v || (v <= new Date() && v.getFullYear() >= 1950),
        message: 'Data de nascimento inválida (no futuro ou anterior a 1950).',
      },
    },
    clubeAtual: { type: String, trim: true },
    // Referência ao clube (a fonte de verdade da ligação clube→jogador). O texto
    // clubeAtual fica para mostrar/legado; o cruzamento com o calendário usa esta
    // referência (com fallback ao nome quando ainda não está ligado).
    clube: { type: Schema.Types.ObjectId, ref: 'Club', default: null, index: true },
    // 2.ª equipa (ex.: joga no Sub-19 e no Sub-23 do mesmo clube). Serve para o
    // jogador aparecer como alvo nos jogos das DUAS equipas no calendário. Nome
    // (mostrar/fallback) + referência ao clube (cruzamento), como o clube atual.
    clubeSecundarioNome: { type: String, trim: true },
    clubeSecundario: { type: Schema.Types.ObjectId, ref: 'Club', default: null, index: true },
    liga: { type: String, trim: true, index: true },

    // Dados biográficos que antes o scout escrevia à mão no relatório (só no
    // browser, perdiam-se). Agora vivem aqui e entram no backup.
    numero: { type: String, trim: true }, // nº da camisola (ex.: "10")
    nacionalidade: { type: String, trim: true }, // ex.: "Portugal" ou "Portugal / Cabo Verde"
    altura: { type: String, trim: true }, // ex.: "1,84 m"
    pePreferencial: { type: String, enum: ['', 'Direito', 'Esquerdo', 'Ambidestro'], default: '' },
    internacional: { type: String, trim: true }, // ex.: "Sub-19 Portugal" / "Não"

    // Ligação à integração externa — chave para sincronizar as stats da época.
    zerozeroId: { type: String, trim: true, default: null, index: true },
    zerozeroUrl: { type: String, trim: true },
    statsZerozero: { type: statsZerozeroSchema, default: null },

    fimContrato: {
      type: Date,
      index: true,
      // Um ano mal digitado (ex.: 2262) era classificado como contrato "Longo"
      // e tirava o jogador das janelas "Livre/<6m". Trava o disparate.
      validate: {
        validator: (v) => !v || v.getFullYear() <= new Date().getFullYear() + 10,
        message: 'Ano de fim de contrato irrealista (mais de 10 anos no futuro).',
      },
    },
    agente: { type: String, trim: true },
    // Link para a página do agente/empresário no zerozero (/agent.php?id=…).
    // Ponto de partida para procurar o contacto manualmente. Preenchido pelo bridge.
    agenteUrl: { type: String, trim: true },
    contacto: { type: String, trim: true }, // contacto do jogador/agente (telefone, email, etc.)

    // Situação financeira do alvo — apoio à decisão de recrutamento (custo vs
    // rendimento esperado vs potencial de valorização). Tudo opcional e estimado.
    valorEstimado: { type: Number, min: 0, default: null }, // € — valor de mercado / custo estimado
    potencialValorizacao: { type: String, enum: ['', 'Alto', 'Médio', 'Baixo'], default: '' },
    condicoesContratuais: { type: String, trim: true }, // texto livre: cláusula, salário, empréstimo, situação

    // Avaliação por dimensões → ratingFinal calculado.
    avaliacao: { type: avaliacaoSchema, default: () => ({}) },
    ratingFinal: { type: Number, min: 1, max: 10, default: null },

    // Classificações do cabeçalho do relatório (substituem as antigas dimensões
    // Potencial e Prontidão). Rendimento = nível para o clube; Potencial = teto
    // face à liga do clube.
    rendimento: { type: String, enum: ['', ...RENDIMENTOS], default: '' },
    potencialClass: { type: String, enum: ['', ...POTENCIAIS], default: '' },

    // Perfil do jogador (técnico / físico / misto).
    perfil: { type: String, enum: ['', ...PERFIS], default: '' },
    // Avaliação do nível de liga projetado por horizonte (1-5: Distrital→Ligas
    // profissionais). Imediata, médio prazo e longo prazo.
    avaliacaoImediata: { type: Number, min: 1, max: 5, default: null },
    avaliacaoMedioPrazo: { type: Number, min: 1, max: 5, default: null },
    avaliacaoLongoPrazo: { type: Number, min: 1, max: 5, default: null },
    // Veredito de observação — estado principal do jogador (substitui o pipeline).
    veredito: { type: String, enum: ['', ...VEREDITOS], default: '', index: true },

    // Recursos (vídeos, highlights, links extra)
    recursos: [{ _id: false, titulo: { type: String, trim: true }, url: { type: String, trim: true } }],

    // Situação no plantel — só se aplica a jogadores do clube (doPlantel).
    estadoPlantel: { type: String, enum: [...ESTADOS_PLANTEL, null], default: null },

    // PLANEAMENTO do plantel (aba Planeamento) — duas dimensões independentes:
    // (1) ação pós-janela, que colore o jogador no campo; null = sem alteração.
    planoEstatuto: { type: String, enum: ['priority', 'potencial', 'emprestar', null], default: null },
    // (2) tier da estrutura idealizada (A=Top, B=Core, C=Back-Up, D=Jovens),
    // atribuído arrastando o jogador para o tier ao lado do campo. null = sem tier.
    planoTier: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
    // (3) slot ocupado no CAMPO do planeamento (1-3-4-3): GR/DCE/DCC/DCD/DE/MDF/
    // MC/DD/EE/PL/ED. Arrastado do tier para o campo. null = fora do onze.
    // Independente da posicaoPrincipal (é planeamento, não mexe no perfil).
    planoPos: { type: String, default: null },
    // Ordem do jogador DENTRO do slot do campo (quando há vários na mesma posição).
    // Menor = mais acima. Definida pelas setas no chip.
    planoOrdem: { type: Number, default: 0 },
    // PLANEAMENTO da PRÓXIMA ÉPOCA — mesmo conceito, dados independentes (a aba
    // "Momento" usa os campos acima; a aba "Próxima época" usa este sub-objeto).
    planoProx: {
      planoEstatuto: { type: String, enum: ['priority', 'potencial', 'emprestar', null], default: null },
      planoTier: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
      planoPos: { type: String, default: null },
      planoOrdem: { type: Number, default: 0 },
    },

    // Posições ATRIBUÍDAS na Shadow Team (independentes da posição de perfil do
    // jogador). Definidas pelo botão no Ranking. Até 3 posições (um jogador
    // versátil pode ocupar várias casas do 11-sombra). [] = fora da Shadow Team.
    shadowPos: {
      type: [String],
      default: [],
      index: true,
      validate: { validator: (a) => !a || a.length <= 3, message: 'Máximo 3 posições no 11-sombra.' },
    },

    notas: { type: String, trim: true },

    // Análise qualitativa (2ª página do relatório): perfil tático por momentos
    // do jogo, síntese e veredicto de encaixe no modelo de jogo (secção 8.3 do
    // Modelo Operacional — relatório para treinador, sem notas nem pesos).
    analiseTatica: {
      orgOfensiva: { type: String, trim: true },
      transOfensiva: { type: String, trim: true },
      orgDefensiva: { type: String, trim: true },
      transDefensiva: { type: String, trim: true },
      bolaParada: { type: String, trim: true },
    },
    sinteseQualitativa: { type: String, trim: true },
    // Veredicto de encaixe no modelo de jogo do treinador.
    veredictoModelo: { type: String, enum: ['adequado', 'nao_adequado', null], default: null },
    // Texto livre: qual o enquadramento IDEAL do jogador no modelo de jogo.
    enquadramentoModelo: { type: String, trim: true },

    // Link para um relatório externo (URL), editável na ficha.
    linkRelatorio: { type: String, trim: true },

    // Associações manuais aos dados Wyscout (chaves normalizadas "nome|equipa").
    // Como os nomes do Wyscout nem sempre coincidem, o editor liga à mão e isto
    // sobrevive às reimportações (o importador dá-lhes prioridade antes do fuzzy).
    dadosChaves: { type: [String], default: [] },

    // Última atividade de scouting (criação, edição ou nova observação).
    // Usada para sinalizar jogadores "parados" (sem atualização há > 30 dias).
    ultimaAtividade: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Regista atividade e impõe a regra do potencial por idade ao gravar.
// (o ratingFinal é a MÉDIA das observações, recalculada na rota /api/observations.)
playerSchema.pre('save', function aoGravar(next) {
  this.ultimaAtividade = new Date();
  // O Potencial só se aplica até IDADE_MAX_POTENCIAL anos — acima disso fica sempre
  // vazio, automaticamente (mesmo que já estivesse preenchido quando era mais novo).
  const anos = anosDe(this.dataNascimento);
  if (anos != null && anos > IDADE_MAX_POTENCIAL) this.potencialClass = '';
  next();
});

// findByIdAndUpdate (ex.: PATCH /classificacao) NÃO dispara o pre-save — impõe aqui
// a mesma regra: se o jogador tem 23+ anos, o potencial é forçado a vazio.
playerSchema.pre('findOneAndUpdate', async function imporPotencialIdade() {
  const upd = this.getUpdate() || {};
  const set = upd.$set || {};
  // Os campos podem vir à cabeça (findByIdAndUpdate(id, {campo})) ou dentro de $set
  // (o plugin de timestamps acrescenta sempre $set.updatedAt).
  const temPot = 'potencialClass' in upd || 'potencialClass' in set;
  const temNasc = 'dataNascimento' in upd || 'dataNascimento' in set;
  if (!temPot && !temNasc) return;
  let nasc = 'dataNascimento' in upd ? upd.dataNascimento : set.dataNascimento;
  if (nasc === undefined) {
    const doc = await this.model.findOne(this.getQuery()).select('dataNascimento').lean();
    nasc = doc?.dataNascimento;
  }
  const anos = anosDe(nasc);
  if (anos != null && anos > IDADE_MAX_POTENCIAL) {
    if ('potencialClass' in set) upd.$set.potencialClass = '';
    else upd.potencialClass = '';
    this.setUpdate(upd);
  }
});

// Idade calculada (não persistida)
playerSchema.virtual('idade').get(function getIdade() {
  if (!this.dataNascimento) return null;
  const diff = Date.now() - this.dataNascimento.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
});

playerSchema.set('toJSON', { virtuals: true });
playerSchema.set('toObject', { virtuals: true });

export default mongoose.model('Player', playerSchema);
