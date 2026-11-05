import mongoose from 'mongoose';

const { Schema } = mongoose;

// Estatísticas de jogo (Wyscout), por jogador-competição-época.
// COLEÇÃO SEPARADA do Player — o import NUNCA cria jogadores na base de scouting.
// Guarda todos os jogadores da liga (para o cálculo de percentis), mas só os que
// casam com um Player da plataforma têm `jogador` preenchido e aparecem na ficha.
const estatisticaSchema = new Schema(
  {
    jogador: { type: Schema.Types.ObjectId, ref: 'Player', default: null, index: true },
    nome: { type: String, trim: true, index: true },
    equipa: { type: String, trim: true },
    chave: { type: String, index: true }, // "nome|equipa" normalizado (para ligar/procurar)

    competicao: { type: String, required: true, index: true },
    epoca: { type: String, required: true, index: true },

    posicaoOriginal: { type: String, trim: true }, // código Wyscout (ex.: "LCMF, RDMF")
    grupoPosicao: { type: String, index: true },    // GR/DC/LATERAL/MDF/MC/MOF/EXTREMO/PL

    minutos: { type: Number, default: 0 },
    jogos: { type: Number, default: 0 },

    // biográfico (útil para filtros/contexto)
    idade: Number,
    valorMercado: Number,
    contratoTermina: String,
    nacionalidade: String,
    pe: String,
    altura: Number,
    peso: Number,
    emprestado: String,

    // todas as métricas normalizadas (chave → número), incl. derivadas (deltaXG…)
    metricas: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Peer group dos percentis: mesma competição/época/grupo de posição.
estatisticaSchema.index({ competicao: 1, epoca: 1, grupoPosicao: 1 });

export default mongoose.model('EstatisticaJogador', estatisticaSchema);
