import mongoose from 'mongoose';

const { Schema } = mongoose;

// Estados do ciclo de vida de uma sugestão (geridos pelo scouting).
export const ESTADOS_SUGESTAO = ['Nova', 'Em análise', 'Aceite', 'Recusada'];

// Sugestão de jogador — o clube (viewer) propõe nomes ao scouting.
// É a única coleção em que um viewer pode escrever (só criar; ver Sugestao routes).
const sugestaoSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true }, // nome do jogador sugerido
    clube: { type: String, trim: true },                // clube atual (opcional)
    posicao: { type: String, trim: true },              // posição (texto livre)
    nota: { type: String, trim: true },                 // porque sugere / contexto
    link: { type: String, trim: true },                 // zerozero / vídeo / etc.
    autorId: { type: String },                          // id do utilizador que sugeriu
    autorNome: { type: String, trim: true },            // nome a mostrar
    estado: { type: String, enum: ESTADOS_SUGESTAO, default: 'Nova' },
    respostaEditor: { type: String, trim: true },       // nota de volta do scouting
  },
  { timestamps: true }
);

export default mongoose.model('Sugestao', sugestaoSchema);
