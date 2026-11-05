// Migração: preenche o perfil do jogador a partir da 1ª observação.
//
// A regra "a 1ª observação define o perfil" passou a ser automática ao registar
// (observations.js POST). Esta migração aplica-a retroativamente aos jogadores que
// já tinham observações: copia o veredito / rendimento / potencial da PRIMEIRA
// observação (mais antiga por dataJogo) para os campos do perfil que estão VAZIOS.
// Não sobrepõe nada já preenchido no perfil (ex.: o veredito veio da migração
// estado→veredito; o rendimento/potencial que o utilizador pôs à mão fica).
//
// Faz backup antes. Correr:  node src/migracoes/006-perfil-da-primeira-obs.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { escreverBackupDisco } from '../utils/backup.js';
import Player from '../models/Player.js';
import Observation from '../models/Observation.js';

await connectDB(process.env.MONGODB_URI);

const ficheiro = await escreverBackupDisco('pre-perfil-primeira-obs');
console.log(`[migração] backup: ${ficheiro || '(falhou — a abortar)'}`);
if (!ficheiro) {
  await mongoose.disconnect();
  process.exit(1);
}

const CAMPOS = ['veredito', 'rendimento', 'potencialClass'];
const idsComObs = await Observation.distinct('jogador');
let alterados = 0;

for (const id of idsComObs) {
  const player = await Player.findById(id);
  if (!player) continue;
  // Primeira observação = a mais antiga por data do jogo (desempate por criação).
  const [primeira] = await Observation.find({ jogador: id })
    .sort({ dataJogo: 1, createdAt: 1 })
    .limit(1)
    .lean();
  if (!primeira) continue;

  let mudou = false;
  const partes = [];
  for (const campo of CAMPOS) {
    if (!player[campo] && primeira[campo]) {
      player[campo] = primeira[campo];
      partes.push(`${campo}=${primeira[campo]}`);
      mudou = true;
    }
  }
  if (mudou) {
    await player.save(); // o pre-save aplica a regra do potencial por idade
    alterados++;
    console.log(`  ${player.nomeCompleto}: ${partes.join(' · ')}`);
  }
}

console.log(`[migração] perfil preenchido a partir da 1ª obs em ${alterados} jogador(es).`);
await mongoose.disconnect();
console.log('[migração] concluída.');
