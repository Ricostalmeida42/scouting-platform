import mongoose from 'mongoose';

const { Schema } = mongoose;

// Alvo de recrutamento colocado no CAMPO do Planeamento — um "espaço vazio" numa
// posição que se quer preencher com uma contratação. Independente dos jogadores.
const planoAlvoSchema = new Schema(
  {
    planoPos: { type: String, required: true }, // slot do campo (GR/DCE/.../PL)
    nota: { type: String, trim: true, default: '' }, // perfil pretendido (texto livre)
    planoEstatuto: { type: String, enum: ['priority', 'potencial', 'emprestar', null], default: null }, // cor
    planoTier: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null }, // texto na box
    planoOrdem: { type: Number, default: 0 },
    // Época do planeamento: 'momento' (atual) vs 'proxima' (planear a próxima época).
    epoca: { type: String, enum: ['momento', 'proxima'], default: 'momento', index: true },
  },
  { timestamps: true }
);

export default mongoose.model('PlanoAlvo', planoAlvoSchema);
