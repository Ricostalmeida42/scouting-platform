import mongoose from 'mongoose';

const { Schema } = mongoose;

// Relatório formal de um jogador — aglomeração manual das observações, gerado a
// partir do template RCA e GUARDADO como snapshot (congela os dados do jogador +
// observações no momento da criação). Abre-se como HTML imprimível → PDF.
const relatorioSchema = new Schema(
  {
    jogador: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    titulo: { type: String, trim: true, default: null },
    // Snapshot { ...dados do jogador, observacoes } na altura da criação.
    dados: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model('Relatorio', relatorioSchema);
