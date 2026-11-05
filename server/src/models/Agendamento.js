import mongoose from 'mongoose';
import { ESTADO_AGENDAMENTO } from '../constants.js';

const { Schema } = mongoose;

// Jogo agendado para observação (Modelo Operacional, rotina de segunda-feira).
const agendamentoSchema = new Schema(
  {
    jogador: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    // Jogo do calendário de onde veio o agendamento (para listar os observáveis
    // das duas equipas na Agenda). Opcional — agendamentos manuais não o têm.
    calendarioJogo: { type: Schema.Types.ObjectId, ref: 'CalendarioJogo', default: null },
    dataJogo: { type: Date, required: true, index: true },
    hora: { type: String, trim: true }, // "HH:MM" — hora real do jogo
    // Horário de VISIONAMENTO do scout (INÍCIO do bloco). Independente da hora
    // real do jogo — em diferido é a hora escolhida; ao vivo/em direto é a hora
    // do jogo (com margem para viagem/aquecimento no caso de ir ao estádio).
    visionamento: { type: Date, default: null, index: true },
    // Modo de visionamento: 'diferido' (casa, replay), 'em_direto' (casa, TV ao
    // vivo) ou 'ao_vivo' (no estádio). Define a duração/cor do bloco.
    modo: { type: String, default: 'diferido' },
    // Duração do bloco em minutos (o jogo são 90; ao vivo estica com a viagem).
    duracaoMin: { type: Number, default: 90 },
    competicao: { type: String, trim: true },
    adversario: { type: String, trim: true },
    local: { type: String, enum: ['Casa', 'Fora', null], default: null },
    estado: { type: String, enum: ESTADO_AGENDAMENTO, default: 'Planeado', index: true },
    notas: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Agendamento', agendamentoSchema);
