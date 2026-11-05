import mongoose from 'mongoose';

const { Schema } = mongoose;

// Um jogo de um calendário de competição (extensível a várias competições:
// Campeonato de Portugal agora, distritais mais tarde). A Agenda cruza os
// jogadores observados com estes jogos pelo nome do clube (casa/fora).
const calendarioJogoSchema = new Schema(
  {
    competicao: { type: String, required: true, trim: true, index: true }, // ex.: 'Campeonato de Portugal'
    epoca: { type: String, trim: true, index: true }, // ex.: '2026/27'
    serie: { type: String, trim: true, index: true }, // ex.: 'Série A' (ou '' se não aplicável)
    jornada: { type: Number, index: true },
    data: { type: Date, index: true },
    hora: { type: String, trim: true }, // hora de início "HH:MM" (fuso Portugal); '' se ainda não marcada
    casa: { type: String, trim: true, index: true },
    fora: { type: String, trim: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('CalendarioJogo', calendarioJogoSchema);
