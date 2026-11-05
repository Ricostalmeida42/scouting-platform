import mongoose from 'mongoose';

const { Schema } = mongoose;

const contactSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    tipo: { type: String, trim: true },        // Treinador, Dirigente, Coord. formação, Scout, Agente…
    empresa: { type: String, trim: true },      // clube ou agência
    zona: { type: String, trim: true },         // localidade / zona (rede de proximidade)
    email: { type: String, trim: true },
    telemovel: { type: String, trim: true },
    jogadoresRepresentados: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
    oQueSabe: { type: String, trim: true },     // o que sabe / o seu valor para o scouting
    favor: { type: String, trim: true },        // Em dia | Devo-lhe | Deve-me (reciprocidade)
    ultimoContacto: { type: Date },
    proximoFollowUp: { type: Date },
    notas: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Contact', contactSchema);
