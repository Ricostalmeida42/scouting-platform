import mongoose from 'mongoose';
import { PRIORIDADE_LIGA } from '../constants.js';

const { Schema } = mongoose;

const leagueSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    // Competição a que a liga corresponde (editável).
    competicao: { type: String, trim: true },
    pais: { type: String, trim: true },
    nivel: { type: Number, min: 1, max: 5 },
    transmissao: { type: Boolean, default: false },
    ultimaObservacao: { type: Date },
    prioridade: { type: String, enum: PRIORIDADE_LIGA, default: 'Média' },
    notas: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('League', leagueSchema);
