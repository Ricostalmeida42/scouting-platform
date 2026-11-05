import mongoose from 'mongoose';
import { RELACAO_CLUBE } from '../constants.js';

const { Schema } = mongoose;

// Clubes de interesse ou de contacto (Modelo Operacional, secção 2.1)
const clubSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    // Nomes alternativos do clube (ex.: como aparece no calendário da FPF vs. no
    // zerozero) para o cruzamento por nome não falhar por diferença de grafia.
    apelidos: [{ type: String, trim: true }],
    pais: { type: String, trim: true },
    // Liga a que o clube pertence — referência real à League (a liga passa assim
    // a "reconhecer" os seus clubes: Club.find({ liga: <id> })).
    liga: { type: Schema.Types.ObjectId, ref: 'League', default: null, index: true },
    escalao: { type: String, trim: true }, // ex: "Sub-19", "Equipa B"
    relacao: { type: String, enum: RELACAO_CLUBE, default: 'Neutro' },
    contactoNome: { type: String, trim: true },
    contactoEmail: { type: String, trim: true },
    contactoTelefone: { type: String, trim: true },
    notas: { type: String, trim: true },
    // Identificação no zerozero (equipaId) — estável, permite re-sincronizar o
    // estádio/localização sem voltar a resolver o clube pela pesquisa.
    zerozeroId: { type: Number, default: null, index: true },
    // Estádio e localização — usados na Agenda para reconhecer onde se joga e a
    // distância de carro até casa (Rua Cipriano Nunes Martins, Oliveira de Azeméis).
    estadio: { type: String, trim: true }, // nome do estádio (ex.: "Estádio Municipal de Fafe")
    estadioCidade: { type: String, trim: true }, // cidade/localidade do clube no zerozero
    estadioLat: { type: Number, default: null },
    estadioLng: { type: Number, default: null },
    distanciaKm: { type: Number, default: null }, // km de carro desde casa
    distanciaMin: { type: Number, default: null }, // minutos de carro desde casa
  },
  { timestamps: true }
);

export default mongoose.model('Club', clubSchema);
