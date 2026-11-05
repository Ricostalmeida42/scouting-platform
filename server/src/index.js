import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import {
  POSICOES,
  PRIORIDADE_LIGA,
  PESOS_AVALIACAO,
  METAS,
  DIAS_SEM_ATUALIZACAO,
  RELACAO_CLUBE,
  ESTADO_AGENDAMENTO,
  ESTADOS_PLANTEL,
} from './constants.js';

import playersRouter from './routes/players.js';
import observationsRouter from './routes/observations.js';
import leaguesRouter from './routes/leagues.js';
import contactsRouter from './routes/contacts.js';
import clubsRouter from './routes/clubs.js';
import exportRouter from './routes/export.js';
import agendamentosRouter from './routes/agendamentos.js';
import searchRouter from './routes/search.js';
import dashboardRouter from './routes/dashboard.js';
import calendarioRouter from './routes/calendario.js';
import observacoesJogoRouter from './routes/observacoesJogo.js';
import planoAlvosRouter from './routes/planoAlvos.js';
import relatoriosRouter from './routes/relatorios.js';
import classificacaoRouter from './routes/classificacao.js';
import estatisticasRouter from './routes/estatisticas.js';
import configGrelhaRouter from './routes/configGrelha.js';
import avaliacoesPlantelRouter from './routes/avaliacoesPlantel.js';
import sugestoesRouter from './routes/sugestoes.js';
import authRouter from './routes/auth.js';
import { requireAuth, bloquearEscritaViewer, exigirPagina } from './middleware/auth.js';
import { escreverBackupDisco } from './utils/backup.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Private Network Access: o Chrome exige esta resposta ao preflight para
// permitir pedidos de uma página file:// (contexto "público") ao localhost
// (rede local) — usado pelo botão "➕ Scouting" do filtro.html do zerozero.
app.use((req, res, next) => {
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});

// Origens permitidas: o frontend do Scouting e a página de filtro do zerozero.
// Como o filtro.html abre como ficheiro local (file://), o browser envia
// Origin: null — daí incluir 'null'. Sem CLIENT_ORIGIN definido, mantém-se
// permissivo (true) como antes.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN
      ? [process.env.CLIENT_ORIGIN, 'null', 'https://resultados.fpf.pt']
      : true,
    credentials: true,
  })
);
// limite maior para acomodar as fotografias dos jogadores (data URL)
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Verificação de disponibilidade (público)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Autenticação: /api/auth/login é público; o resto do router trata a sua própria sessão.
app.use('/api/auth', authRouter);

// A partir daqui, toda a API exige sessão iniciada.
app.use('/api', requireAuth);

// Sugestões: montado ANTES do bloqueio de escrita — o clube (viewer) pode
// sugerir jogadores. As permissões são tratadas dentro do próprio router.
app.use('/api/sugestoes', sugestoesRouter);

// Avaliações do plantel: também ANTES do bloqueio — qualquer conta pode avaliar
// um jogador do plantel (equipa técnica / direção). Permissões no router.
app.use('/api/avaliacoes-plantel', avaliacoesPlantelRouter);

// Os 'viewer' (clube) só podem consultar — qualquer outra alteração é bloqueada.
app.use('/api', bloquearEscritaViewer);

// Vocabulário partilhado para o frontend
app.get('/api/meta', (req, res) => {
  res.json({
    posicoes: POSICOES,
    prioridadeLiga: PRIORIDADE_LIGA,
    pesosAvaliacao: PESOS_AVALIACAO,
    metas: METAS,
    diasSemAtualizacao: DIAS_SEM_ATUALIZACAO,
    relacaoClube: RELACAO_CLUBE,
    estadoAgendamento: ESTADO_AGENDAMENTO,
    estadosPlantel: ESTADOS_PLANTEL,
  });
});

app.use('/api/players', playersRouter);
// Dados sensíveis (RGPD / menores): o acesso é garantido no servidor, não só
// escondido no frontend. Observações (notas de scouting) e contactos ficam
// trancados por página. Ligas/clubes são dados de referência partilhados por
// várias páginas (ex.: Agenda) — ficam legíveis; a página de gestão é que é
// restrita no frontend. Ver acessos.js + exigirPagina().
app.use('/api/observations', exigirPagina('observacoes'), observationsRouter);
app.use('/api/leagues', leaguesRouter);
app.use('/api/contacts', exigirPagina('contactos'), contactsRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/export', exportRouter);
app.use('/api/agendamentos', agendamentosRouter);
app.use('/api/search', searchRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/calendario', calendarioRouter);
app.use('/api/observacoes-jogo', observacoesJogoRouter);
app.use('/api/plano-alvos', planoAlvosRouter);
app.use('/api/relatorios', relatoriosRouter);
app.use('/api/classificacao', classificacaoRouter);
app.use('/api/estatisticas', estatisticasRouter);
app.use('/api/config-grelha', configGrelhaRouter);

// Em produção, serve a aplicação já construída (client/dist) na mesma porta.
// Assim basta um comando e um endereço: http://localhost:PORT
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // Qualquer rota que não seja /api devolve o index.html (aplicação de página única)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
  console.log('[web] Interface servida a partir de client/dist');
}

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('[erro]', err.message);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ erro: 'Dados inválidos', detalhes: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ erro: 'Identificador inválido' });
  }
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

connectDB(process.env.MONGODB_URI).then(async () => {
  // Cópia de segurança automática no arranque: cada vez que a app abre, fica
  // um snapshot dos dados em server/backups/ (mantém as 12 mais recentes).
  const ficheiro = await escreverBackupDisco('auto');
  if (ficheiro) console.log('[backup] Cópia automática guardada.');
  app.listen(PORT, () => console.log(`[api] A correr em http://localhost:${PORT}`));
});
