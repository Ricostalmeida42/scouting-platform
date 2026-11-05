import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from './Toasts.jsx';
import Modal from './Modal.jsx';
import { obterGrelha } from '../grelhaConfig.js';
import { CATS_GRELHA, ESCALA_PRESSAO } from '../grelhaPosicao.js';
import { calcularRatingFinal, dataCurta, posCurto } from '../lib.js';

const GUIA = ESCALA_PRESSAO.map((e) => `${e.min}: ${e.txt}`).join('\n');

// Avaliações por dimensão de um jogador do plantel — com HISTÓRICO e vários
// autores. A avaliação usa a GRELHA definida no Controlo (atributos por
// dimensão): cada dimensão = média ponderada dos atributos avaliados, como nas
// observações de scouting. A mais recente é a que aparece no perfil.
export default function AvaliacaoPlantel({ jogador, aoMudar }) {
  const { podeEditar, utilizador, ehTecnico, ehTreinador } = useAuth();
  const toast = useToast();
  const [avals, setAvals] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [grelha, setGrelha] = useState(null);
  const [modal, setModal] = useState(false);
  const [notas, setNotas] = useState({}); // "cat.k" -> valor (string)
  const [aGuardar, setAGuardar] = useState(false);

  const pos = jogador.posicaoPrincipal;
  const posGrelha = grelha?.[pos] || null;

  const carregarAvals = useCallback(async () => {
    setCarregar(true);
    try {
      setAvals(await api.get('/avaliacoes-plantel/' + jogador._id));
    } catch {
      /* ignora */
    } finally {
      setCarregar(false);
    }
  }, [jogador._id]);
  useEffect(() => {
    carregarAvals();
  }, [carregarAvals]);
  useEffect(() => {
    obterGrelha().then(setGrelha);
  }, []);

  const abrir = () => {
    setNotas({});
    setModal(true);
  };

  // Nota de uma dimensão = média ponderada (1 casa decimal) dos atributos
  // avaliados dessa dimensão (igual à grelha das observações).
  const notaDim = (cat) => {
    const attrs = posGrelha?.[cat] || [];
    const rated = attrs
      .map((a) => ({ p: a.p || 1, v: notas[cat + '.' + a.k] }))
      .filter((x) => x.v !== '' && x.v != null && !Number.isNaN(Number(x.v)));
    if (!rated.length) return null;
    const sp = rated.reduce((s, x) => s + x.p, 0);
    const t = rated.reduce((s, x) => s + Number(x.v) * x.p, 0);
    return Math.round((t / sp) * 10) / 10;
  };
  const dims = () => {
    const a = {};
    for (const c of CATS_GRELHA) {
      const v = notaDim(c.key);
      if (v != null) a[c.key] = v;
    }
    return a;
  };
  const previa = calcularRatingFinal(dims());

  const submeter = async () => {
    const avaliacao = dims();
    if (Object.keys(avaliacao).length === 0) {
      toast('Avalia pelo menos um atributo.', 'erro');
      return;
    }
    setAGuardar(true);
    try {
      const grelhaNotas = {};
      for (const [k, v] of Object.entries(notas)) {
        if (v !== '' && v != null && !Number.isNaN(Number(v))) grelhaNotas[k] = Number(v);
      }
      await api.post('/avaliacoes-plantel', {
        jogador: jogador._id,
        avaliacao,
        grelha: grelhaNotas,
        posicao: pos,
      });
      setModal(false);
      toast('Avaliação registada.', 'ok');
      await carregarAvals();
      aoMudar?.();
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  const remover = async (a) => {
    if (!window.confirm('Remover esta avaliação do histórico?')) return;
    try {
      await api.del('/avaliacoes-plantel/' + a._id);
      await carregarAvals();
      aoMudar?.();
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };
  const podeRemover = (a) => podeEditar || (a.autorId && String(a.autorId) === String(utilizador?.id));

  return (
    <div className="card aval-plantel">
      <div className="aval-plantel__hd">
        <div className="resumo-card__titulo" style={{ margin: 0 }}>
          Avaliações {avals.length > 0 && <span className="aval-plantel__n">{avals.length}</span>}
        </div>
        {(!ehTecnico || ehTreinador) && <button className="btn btn--pequeno" onClick={abrir}>+ Avaliar</button>}
      </div>

      {carregar ? (
        <p className="aval-plantel__vazio">A carregar…</p>
      ) : avals.length === 0 ? (
        <p className="aval-plantel__vazio">
          Sem avaliações. Qualquer conta (equipa técnica, direção) pode avaliar — a mais recente fica no perfil.
        </p>
      ) : (
        <div className="aval-lista">
          {avals.map((a, i) => (
            <div key={a._id} className={'aval-item' + (i === 0 ? ' aval-item--atual' : '')}>
              <div className="aval-item__top">
                <span className="aval-item__rating">{a.rating != null ? a.rating.toFixed(1) : '—'}</span>
                <div className="aval-item__meta">
                  <span className="aval-item__autor">
                    {a.funcao ? a.funcao + ' · ' : ''}
                    {a.autorNome || '—'}
                  </span>
                  <span className="aval-item__data">
                    {dataCurta(a.createdAt)}
                    {i === 0 && <span className="aval-item__atual-tag">atual</span>}
                  </span>
                </div>
                {podeRemover(a) && (
                  <button className="aval-item__x" onClick={() => remover(a)} title="Remover do histórico">×</button>
                )}
              </div>
              <div className="aval-item__dims">
                {CATS_GRELHA.map((c) => (
                  <span key={c.key} className="aval-dim">
                    <b>{c.label}</b> {a.avaliacao?.[c.key] != null ? a.avaliacao[c.key].toFixed(1) : '—'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal largo titulo={`Avaliar · ${jogador.nomeCompleto} (${posCurto(pos)})`} aoFechar={() => setModal(false)}>
          <p style={{ marginTop: 0, color: 'var(--texto-suave)', fontSize: 13 }}>
            Avalia os atributos (1-5 = nível de liga) da grelha definida em Controlo → Grelha. Cada
            dimensão é a média ponderada; fica no histórico com o teu nome e função.
          </p>
          {!posGrelha ? (
            <p className="aval-plantel__vazio">Sem grelha definida para esta posição.</p>
          ) : (
            <div className="aval-grelha">
              {CATS_GRELHA.map((c) => (
                <div className="aval-grelha__dim" key={c.key}>
                  <div className="aval-grelha__dim-hd">
                    <span>{c.label}</span>
                    <strong>{notaDim(c.key) != null ? notaDim(c.key).toFixed(1) : '—'}</strong>
                  </div>
                  {(posGrelha[c.key] || []).map((a) => (
                    <label className="aval-grelha__attr" key={a.k}>
                      <span className="aval-grelha__attr-l">
                        {a.l} <span className="aval-grelha__peso" title={'Peso ' + (a.p || 1)}>{'●'.repeat(a.p || 1)}</span>
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="1"
                        title={GUIA}
                        value={notas[c.key + '.' + a.k] ?? ''}
                        onChange={(e) => setNotas((s) => ({ ...s, [c.key + '.' + a.k]: e.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="linha-acoes" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <span style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
              Rating: <b>{previa != null ? previa.toFixed(1) : '—'}</b> / 5
            </span>
            <button className="btn" onClick={submeter} disabled={aGuardar}>
              {aGuardar ? 'A guardar…' : 'Registar avaliação'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
