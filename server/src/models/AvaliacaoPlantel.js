import mongoose from 'mongoose';

const { Schema } = mongoose;

// Uma avaliação (por dimensão) de um jogador do plantel, num dado momento, por
// um dado autor (equipa técnica / direção desportiva). Há HISTÓRICO: vários
// registos por jogador; a mais recente é a que aparece no perfil (Player.avaliacao
// é sincronizado com ela). Qualquer conta pode criar (editor E viewer).
const avaliacaoSub = new Schema(
  { tecnica: Number, tatica: Number, fisica: Number, mental: Number },
  { _id: false }
);

const schema = new Schema(
  {
    jogador: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    // Dimensões (1-5), calculadas da grelha configurada (Controlo → Grelha).
    avaliacao: { type: avaliacaoSub, default: () => ({}) },
    // Notas em bruto da grelha: "categoria.atributo" -> nota 1-5 (como nas observações).
    grelha: { type: Schema.Types.Mixed, default: undefined },
    posicao: { type: String }, // posição avaliada (grelha depende dela)
    rating: { type: Number }, // média ponderada das dimensões (calcularRatingFinal)
    funcao: { type: String, trim: true }, // cargo da conta que avaliou (ex.: "Treinador", "Diretor desportivo")
    autorId: { type: String },
    autorNome: { type: String, trim: true },
    autorPapel: { type: String }, // 'editor' | 'viewer'
  },
  { timestamps: true }
);

export default mongoose.model('AvaliacaoPlantel', schema);
