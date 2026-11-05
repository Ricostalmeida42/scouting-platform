import mongoose from 'mongoose';

const { Schema } = mongoose;

// Classificação (tabela) de uma competição/série, importada do zerozero. Uma doc
// por (competicao, serie, epoca). Guarda a URL de origem para o botão "Atualizar".
const linhaSchema = new Schema(
  {
    posicao: Number,
    equipa: String,
    jogos: Number,
    vitorias: Number,
    empates: Number,
    derrotas: Number,
    golosMarcados: Number,
    golosSofridos: Number,
    diferenca: Number,
    pontos: Number,
  },
  { _id: false }
);

const classificacaoSchema = new Schema(
  {
    competicao: { type: String, required: true, index: true },
    serie: { type: String, default: '' },
    epoca: { type: String, default: '' },
    fonte: { type: String, default: '' }, // URL do zerozero
    atualizadoEm: { type: Date, default: Date.now },
    linhas: [linhaSchema],
  },
  { timestamps: true }
);
classificacaoSchema.index({ competicao: 1, serie: 1, epoca: 1 }, { unique: true });

export default mongoose.model('Classificacao', classificacaoSchema);
