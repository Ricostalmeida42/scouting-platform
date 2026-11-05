import { consistenciaCompleta, CONSIST_BANDA } from '../lib.js';

// Consistência do jogador — título + banda·% + nº de observações no cabeçalho, e
// um corpo com métricas (consistência, atributos avaliados, variação média) e uma
// nota. O detalhe por atributo/dimensão continua fora (removido a pedido).
export default function PainelConsistencia({ observacoes = [], posicao = null }) {
  const c = consistenciaCompleta(observacoes, posicao);
  if (!c.n) return null;
  const banda = CONSIST_BANDA[c.banda];

  return (
    <div className="card consist" style={{ padding: 18 }}>
      <div className="consist__cab">
        <div className="resumo-card__titulo" style={{ margin: 0 }}>
          Consistência da avaliação
        </div>
        <div className="consist__cab-dir">
          <span
            className="consist-escala"
            title="Estabilidade das notas nos atributos avaliados em vários jogos (quanto menor a variação, mais consistente)"
          >
            <span className="consist-escala__ponto" style={{ background: banda.cor }} />
            {banda.label}
            {c.indice != null ? ' · ' + Math.round(c.indice * 100) + '%' : ''}
          </span>
          <span className="consist__n">
            {c.n} {c.n === 1 ? 'observação' : 'observações'}
          </span>
        </div>
      </div>

      <div className="resumo-metricas" style={{ marginTop: 14 }}>
        <div className="resumo-metrica">
          <strong>{c.indice != null ? Math.round(c.indice * 100) + '%' : '—'}</strong>
          <span>consistência</span>
        </div>
        <div className="resumo-metrica">
          <strong>{c.nAvaliados ?? 0}</strong>
          <span>atributos</span>
        </div>
        <div className="resumo-metrica">
          <strong>{c.variacaoMedia != null ? '±' + c.variacaoMedia : '—'}</strong>
          <span>variação média</span>
        </div>
      </div>

      {c.n < 2 ? (
        <p className="consist__aviso" style={{ marginBottom: 0 }}>
          A consistência afina-se a partir da 2.ª observação — por agora é a leitura de um jogo.
        </p>
      ) : c.nAvaliados > 0 ? (
        <p className="consist__aviso" style={{ marginBottom: 0 }}>
          Nos <strong>{c.nAvaliados}</strong> atributos avaliados em vários jogos, a nota varia em média{' '}
          <strong>±{c.variacaoMedia}</strong> {c.variacaoMedia === 1 ? 'ponto' : 'pontos'}.
        </p>
      ) : (
        <p className="consist__aviso" style={{ marginBottom: 0 }}>
          Ainda sem atributos avaliados em jogos diferentes — preenche a grelha da posição em vários jogos para medir a consistência.
        </p>
      )}
    </div>
  );
}
