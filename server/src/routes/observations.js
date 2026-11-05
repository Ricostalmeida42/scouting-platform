import { Router } from 'express';
import Observation from '../models/Observation.js';
import Player from '../models/Player.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { IDADE_MAX_POTENCIAL } from '../constants.js';

const router = Router();

// O acesso às observações é controlado por conta/página no servidor, à entrada
// do router (ver index.js → exigirPagina('observacoes') + acessos.js). Por
// omissão só editor e diretor desportivo acedem; a equipa técnica não.

// Rating do jogador = MÉDIA dos ratings de todas as suas observações (null se
// nenhuma). É a única fonte do ratingFinal (a bola/tabelas em toda a plataforma).
async function mediaObservacoes(jogadorId) {
  const obs = await Observation.find({ jogador: jogadorId }).select('rating').lean();
  const rs = obs.map((o) => o.rating).filter((r) => typeof r === 'number');
  if (!rs.length) return null;
  return Math.round((rs.reduce((s, r) => s + r, 0) / rs.length) * 10) / 10;
}

// GET /api/observations — todas (com nome do jogador). query: jogador
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filtro = {};
    if (req.query.jogador) filtro.jogador = req.query.jogador;
    const observacoes = await Observation.find(filtro)
      .populate('jogador', 'nomeCompleto posicaoPrincipal clubeAtual')
      .sort({ dataObservacao: -1, dataJogo: -1 });
    res.json(observacoes);
  })
);

// GET /api/observations/:id — uma observação (com o jogador). Para o editor em
// subpágina. Registada DEPOIS de /:id/relatorio.html (que é mais específica).
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const obs = await Observation.findById(req.params.id).populate(
      'jogador',
      'nomeCompleto posicaoPrincipal clubeAtual'
    );
    if (!obs) return res.status(404).json({ erro: 'Observação não encontrada' });
    res.json(obs);
  })
);

// POST /api/observations — regista e atualiza o estado do jogador
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const player = await Player.findById(req.body.jogador);
    if (!player) return res.status(400).json({ erro: 'Jogador inválido' });

    // `perfil` (opcional) = decisão/R/P que o scout VALIDOU no popup ao confirmar a
    // observação, para escrever no PERFIL do jogador. Não é campo da observação.
    const { perfil, ...obsBody } = req.body;

    // Potencial só até IDADE_MAX_POTENCIAL anos — automático, também por observação.
    if (player.idade != null && player.idade > IDADE_MAX_POTENCIAL) obsBody.potencialClass = '';

    // É a PRIMEIRA observação deste jogador? (conta antes de criar)
    const primeira = (await Observation.countDocuments({ jogador: player._id })) === 0;

    const observacao = await Observation.create(obsBody);

    // Perfil do jogador: a cada observação nova o scout valida no popup a decisão/R/P
    // que ficam no perfil (`perfil`). Sem popup (compat), a 1ª obs define o perfil.
    let perfilAtualizado = false;
    if (perfil && typeof perfil === 'object') {
      for (const campo of ['veredito', 'rendimento', 'potencialClass']) {
        if (campo in perfil) {
          player[campo] = perfil[campo] || '';
          perfilAtualizado = true;
        }
      }
    } else if (primeira) {
      for (const campo of ['veredito', 'rendimento', 'potencialClass']) {
        if (observacao[campo]) {
          player[campo] = observacao[campo];
          perfilAtualizado = true;
        }
      }
    }

    player.ratingFinal = await mediaObservacoes(player._id);
    await player.save(); // o pre-save atualiza ultimaAtividade (e a regra do potencial)

    res.status(201).json({ observacao, jogadorEstado: player.veredito, estadoAlterado: false, perfilAtualizado });
  })
);

// PUT /api/observations/:id — corrigir uma observação e reavaliar o pipeline.
// Corrigir um rating/decisão pode fazer o jogador avançar (ex.: 3→8). Não
// recua (as fases avançadas não retrocedem automaticamente); e grava sempre o
// jogador para atualizar a última atividade.
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    // O jogador de uma observação não se muda por aqui.
    const { jogador, ...campos } = req.body;
    // Um objeto vazio NÃO pode sobrepor (e apagar) dados existentes: editar uma obs
    // antiga sem mexer na grelha envia avaliacao/grelhaPosicao = {}, e o Object.assign
    // substituiria o subdocumento inteiro, destruindo as notas legadas.
    for (const k of ['avaliacao', 'grelhaPosicao']) {
      const v = campos[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) delete campos[k];
    }
    // Carrega + grava (em vez de findByIdAndUpdate) para o pre-save recalcular o
    // rating a partir da avaliação editada — senão a lista de observações e o
    // rating do jogador (média) ficavam com o valor antigo.
    const obs = await Observation.findById(req.params.id);
    if (!obs) return res.status(404).json({ erro: 'Observação não encontrada' });

    const player = await Player.findById(obs.jogador);
    // Potencial só até IDADE_MAX_POTENCIAL anos — automático, também por observação.
    if ('potencialClass' in campos && player && player.idade != null && player.idade > IDADE_MAX_POTENCIAL) {
      campos.potencialClass = '';
    }
    Object.assign(obs, campos);
    await obs.save();

    if (player) {
      player.ratingFinal = await mediaObservacoes(player._id);
      await player.save();
    }

    res.json({ observacao: obs, jogadorEstado: player ? player.veredito : null, estadoAlterado: false });
  })
);

// DELETE /api/observations/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const obs = await Observation.findByIdAndDelete(req.params.id);
    if (!obs) return res.status(404).json({ erro: 'Observação não encontrada' });
    // Recalcula o rating do jogador sem esta observação (findByIdAndUpdate não corre o pre-save).
    await Player.findByIdAndUpdate(obs.jogador, { ratingFinal: await mediaObservacoes(obs.jogador) });
    res.json({ ok: true });
  })
);

export default router;
