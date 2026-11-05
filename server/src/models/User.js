import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { acessosEfetivos } from '../acessos.js';

const { Schema } = mongoose;

// Papéis de acesso:
//  - 'editor'  → scouting: acesso total (ler + alterar tudo)
//  - 'viewer'  → clube: só consulta (bloqueado de qualquer alteração no servidor)
//  - 'tecnico' → equipa técnica: por agora só acede às Sugestões (ver o seu uso
//                no frontend e o bloqueio das avaliações do plantel).
export const PAPEIS = ['editor', 'viewer', 'tecnico'];

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    nome: { type: String, trim: true }, // nome a mostrar na interface
    funcao: { type: String, trim: true }, // cargo no clube (ex.: "Treinador", "Diretor desportivo") — usado nas avaliações do plantel
    passwordHash: { type: String, required: true, select: false },
    papel: { type: String, enum: PAPEIS, default: 'viewer' },
    ativo: { type: Boolean, default: true },
    // Overrides de acesso por página desta conta ({ pagina: true|false }). O que
    // não estiver aqui segue o valor por omissão do papel/função (ver acessos.js).
    acessos: { type: Schema.Types.Mixed, default: {} },
    ultimoLogin: { type: Date },
  },
  { timestamps: true }
);

// Define a palavra-passe (encripta antes de guardar). Nunca guardamos texto simples.
userSchema.methods.definirPassword = async function (texto) {
  this.passwordHash = await bcrypt.hash(texto, 12);
};

userSchema.methods.verificarPassword = function (texto) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(texto, this.passwordHash);
};

// Versão segura para enviar ao frontend (sem o hash).
userSchema.methods.paraCliente = function () {
  return {
    id: this._id,
    username: this.username,
    nome: this.nome || this.username,
    funcao: this.funcao || '',
    papel: this.papel,
    ativo: this.ativo,
    acessos: acessosEfetivos(this), // mapa efetivo (omissão do papel + overrides)
    acessosOverride: this.acessos || {}, // só os overrides explícitos desta conta
  };
};

export default mongoose.model('User', userSchema);
