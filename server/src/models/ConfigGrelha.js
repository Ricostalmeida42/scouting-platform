import mongoose from 'mongoose';

const { Schema } = mongoose;

// Configuração da grelha de observação: que atributos (e pesos) aparecem na
// grelha de cada posição/dimensão. Documento ÚNICO (chave 'grelha').
// grelha = { GR: { tecnica: [{k,p}], tatica: [...], fisica: [...], mental: [...] }, DD: {...}, ... }
const configGrelhaSchema = new Schema(
  {
    chave: { type: String, default: 'grelha', unique: true },
    grelha: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('ConfigGrelha', configGrelhaSchema);
