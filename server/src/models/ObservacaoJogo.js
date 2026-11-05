import mongoose from 'mongoose';

const { Schema } = mongoose;

// Observação de JOGO (não de jogador): regista que o scout viu um jogo, para
// contar o trabalho real feito. Independente das observações de jogador; se
// algum jogador se destacar, cria-se à parte uma Observation (observação do
// jogador). Ligada ao jogo do calendário quando vem de lá.
const observacaoJogoSchema = new Schema(
  {
    calendarioJogo: { type: Schema.Types.ObjectId, ref: 'CalendarioJogo', default: null },
    data: { type: Date, required: true, index: true }, // data do jogo
    hora: { type: String, trim: true },
    competicao: { type: String, trim: true },
    serie: { type: String, trim: true },
    casa: { type: String, trim: true },
    fora: { type: String, trim: true },
    // Meio de observação: no estádio, transmissão, vídeo…
    meio: { type: String, trim: true },
    notas: { type: String, trim: true },
  },
  { timestamps: true } // createdAt = quando foi visto/registado
);

export default mongoose.model('ObservacaoJogo', observacaoJogoSchema);
