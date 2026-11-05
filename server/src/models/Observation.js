import mongoose from 'mongoose';
import { POSICAO_KEYS, RENDIMENTOS, POTENCIAIS, VEREDITOS, calcularRatingFinal } from '../constants.js';

const { Schema } = mongoose;

// Avaliação por dimensão (1-10) desta observação — o rating é calculado a partir
// daqui pela fórmula ponderada (pre-save), como no jogador.
const avaliacaoObsSchema = new Schema(
  {
    tecnica: { type: Number, min: 1, max: 10 },
    tatica: { type: Number, min: 1, max: 10 },
    fisica: { type: Number, min: 1, max: 10 },
    mental: { type: Number, min: 1, max: 10 },
  },
  { _id: false }
);

const observationSchema = new Schema(
  {
    jogador: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    dataJogo: { type: Date, required: true, index: true }, // data em que o jogo foi DISPUTADO
    // Data em que o scout VIU o jogo (ao vivo ou em diferido). É esta que conta como
    // "data da observação" em toda a plataforma. Omissa em obs antigas → usa-se createdAt.
    dataObservacao: { type: Date, default: Date.now, index: true },
    competicao: { type: String, trim: true },
    adversario: { type: String, trim: true },
    minutos: { type: Number, min: 0, max: 120 },
    posicaoJogo: { type: String, enum: POSICAO_KEYS },
    titular: { type: Boolean, default: true }, // true = titular, false = suplente
    // Classificação DESTA observação (independente da do jogador) — para ver a
    // evolução do veredito/R/P ao longo do tempo no histórico.
    veredito: { type: String, enum: ['', ...VEREDITOS], default: '' },
    rendimento: { type: String, enum: ['', ...RENDIMENTOS], default: '' },
    potencialClass: { type: String, enum: ['', ...POTENCIAIS], default: '' },
    // Rating global da observação — CALCULADO a partir de `avaliacao` (pre-save).
    rating: { type: Number, min: 1, max: 10 },
    // Nota por dimensão que gera o rating (pre-save). Vem da grelha da posição
    // (média ponderada dos atributos); nas obs antigas ainda não reavaliadas mantém
    // a nota legada como fallback. Já não há override manual por dimensão.
    avaliacao: { type: avaliacaoObsSchema, default: () => ({}) },
    // Grelha da posição: mapa "categoria.atributo" -> nota (1-10). Eixos fixos por
    // posição (Hughes et al., 2012) — base comparável entre jogadores.
    grelhaPosicao: { type: Schema.Types.Mixed, default: undefined },
    // Pontos fortes / fracos — DUAS caixas de texto livre (gerais, não por dimensão).
    fortes: { type: String, trim: true, default: '' },
    fracos: { type: String, trim: true, default: '' },
    // Estilo de jogo do atleta. É único por jogador mas vive nas observações: o
    // formulário arrasta o texto da observação anterior, para o scout o ir
    // refinando a cada observação. O relatório mostra o da observação mais recente.
    estiloJogo: { type: String, trim: true },
    notas: { type: String, trim: true },
  },
  { timestamps: true }
);

// Rating = média ponderada das 4 dimensões (1-5, inteiro). Sem ajuste da divisão
// (o 1-5 já é o nível de liga). Sem dimensões avaliadas, mantém o rating que vier.
observationSchema.pre('save', function calcularRating(next) {
  const r = calcularRatingFinal(this.avaliacao);
  if (r != null) this.rating = r;
  next();
});

export default mongoose.model('Observation', observationSchema);
