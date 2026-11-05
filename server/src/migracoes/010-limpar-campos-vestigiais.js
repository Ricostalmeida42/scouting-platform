// Migração: "arruma a casa" — remove dos documentos os campos vestigiais que já
// não são usados na UI (pipeline antigo, mercado/valor, passaporte/seleção, etc.).
// Limpa os DADOS; as definições ficam no schema (há código legado — sumário
// semanal, kpi, filtros — que ainda referencia alguns; removê-las do schema seria
// arriscado). Campos com default podem voltar a aparecer se um jogador for editado.
//
// Faz backup antes. Correr:  node src/migracoes/010-limpar-campos-vestigiais.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { escreverBackupDisco } from '../utils/backup.js';

await connectDB(process.env.MONGODB_URI);

const ficheiro = await escreverBackupDisco('pre-limpar-vestigiais');
console.log(`[migração] backup: ${ficheiro || '(falhou — a abortar)'}`);
if (!ficheiro) {
  await mongoose.disconnect();
  process.exit(1);
}

const players = mongoose.connection.collection('players');
const observations = mongoose.connection.collection('observations');

const CAMPOS_PLAYER = {
  estado: '',
  prioridade: '',
  historicoEstados: '',
  mercado: '',
  valorMercado: '',
  valorMercadoData: '',
  passaporte: '',
  selecaoNacional: '',
  janelaAlvo: '',
  contactoIniciado: '',
  ratingRCA: '',
};
const CAMPOS_OBS = {
  decisao: '',
  linkRelatorio: '',
  nivelAdversario: '',
  pontosFortes: '',
  pontosDesenvolver: '',
};

const rp = await players.updateMany({}, { $unset: CAMPOS_PLAYER });
const ro = await observations.updateMany({}, { $unset: CAMPOS_OBS });

console.log(`[migração] jogadores limpos: ${rp.modifiedCount} · observações limpas: ${ro.modifiedCount}`);
console.log(`[migração] campos player: ${Object.keys(CAMPOS_PLAYER).join(', ')}`);
console.log(`[migração] campos obs: ${Object.keys(CAMPOS_OBS).join(', ')}`);
await mongoose.disconnect();
console.log('[migração] concluída.');
