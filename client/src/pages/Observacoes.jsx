import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useEhTelemovel } from '../hooks.js';
import FormularioObservacao from '../components/FormularioObservacao.jsx';
import RelatorioObs from '../components/RelatorioObs.jsx';
import BadgesRP from '../components/BadgesRP.jsx';
import { useToast } from '../components/Toasts.jsx';
import { posCurto, dataCurta, corVeredito } from '../lib.js';

// Cartão de uma observação: dados do jogo (data, competição, minutos…). Clicável.
function CartaoObs({ obs, ativo, aoAbrir }) {
  return (
    <button className={'obs-cartao' + (ativo ? ' obs-cartao--ativo' : '')} onClick={aoAbrir}>
      <div className="obs-cartao__topo">
        <span className="obs-cartao__data">{dataCurta(obs.dataObservacao || obs.dataJogo)}</span>
        <span className="obs-cartao__rating">{obs.rating != null ? obs.rating.toFixed(1) : '—'}</span>
      </div>
      <div className="obs-cartao__meta">{[obs.competicao, obs.adversario].filter(Boolean).join(' · ') || '—'}</div>
      <div className="obs-cartao__meta2">
        {[obs.minutos != null ? obs.minutos + "'" : null, obs.posicaoJogo ? posCurto(obs.posicaoJogo) : null, obs.titular ? 'Titular' : 'Suplente']
          .filter(Boolean)
          .join(' · ')}
      </div>
    </button>
  );
}

// Página de Observações em duas colunas: à esquerda uma linha por JOGADOR (as
// suas obs agrupadas); à direita, ao escolher o jogador, os cartões de cada obs
// (dados + notas por dimensão) e, ao abrir um, o relatório não editável / editor.
export default function Observacoes() {
  const [observacoes, setObservacoes] = useState([]);
  const [jogadores, setJogadores] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [selJog, setSelJog] = useState(null); // jogador escolhido
  const [selObs, setSelObs] = useState(null); // obs aberta
  const [modo, setModo] = useState('ler'); // 'ler' | 'editar' | 'nova'
  const [novaJogador, setNovaJogador] = useState('');
  const [voltar, setVoltar] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [jogosSug, setJogosSug] = useState([]); // jogos vistos deste jogador (sugestões)
  const [jogoSel, setJogoSel] = useState(null); // jogo escolhido nas sugestões
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { podeEditar } = useAuth();
  const ehTelemovel = useEhTelemovel();

  const carregarTudo = useCallback(async () => {
    setCarregar(true);
    try {
      const [obs, jogs] = await Promise.all([
        api.get('/observations'),
        api.get('/players?incluirPlantel=true'),
      ]);
      setObservacoes(obs);
      setJogadores(jogs);
      return obs;
    } finally {
      setCarregar(false);
    }
  }, []);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  // Entradas por query param (da ficha): ?obs=<id>[&editar=1] | ?nova=<jogadorId> | &voltar=<path>.
  useEffect(() => {
    const obsId = params.get('obs');
    const nova = params.get('nova');
    const v = params.get('voltar');
    if (!obsId && !nova && !v) return;
    if (v) setVoltar(v);
    if (nova) {
      setModo('nova');
      setNovaJogador(nova);
      setSelJog(null);
      setSelObs(null);
    } else if (obsId) {
      setSelObs(obsId);
      setModo(params.get('editar') ? 'editar' : 'ler');
    }
    setParams({}, { replace: true });
  }, [params, setParams]);

  // Sugestões de jogos: os que marcaste como vistos com o clube deste jogador.
  useEffect(() => {
    setJogoSel(null);
    if (modo === 'nova' && novaJogador) {
      api
        .get('/players/' + novaJogador + '/jogos-por-reportar')
        .then(setJogosSug)
        .catch(() => setJogosSug([]));
    } else {
      setJogosSug([]);
    }
  }, [modo, novaJogador]);

  // Agrupa as observações por jogador; ordena as obs (recente 1.º) e os jogadores
  // pela obs mais recente.
  const grupos = useMemo(() => {
    const m = new Map();
    for (const o of observacoes) {
      const jid = o.jogador?._id || 'sem-jogador';
      if (!m.has(jid)) m.set(jid, { jid, jogador: o.jogador, obs: [] });
      m.get(jid).obs.push(o);
    }
    const arr = [...m.values()];
    for (const g of arr) g.obs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    arr.sort((a, b) => new Date(b.obs[0].createdAt) - new Date(a.obs[0].createdAt));
    return arr;
  }, [observacoes]);

  const listaGrupos = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return q ? grupos.filter((g) => (g.jogador?.nomeCompleto || '').toLowerCase().includes(q)) : grupos;
  }, [grupos, filtro]);

  const grupoSel = grupos.find((g) => g.jid === selJog) || null;
  const sel = observacoes.find((o) => o._id === selObs) || null;

  // Quando entra por ?obs=, resolve o jogador a partir da obs assim que carrega.
  useEffect(() => {
    if (selObs && !selJog) {
      const o = observacoes.find((x) => x._id === selObs);
      if (o) setSelJog(o.jogador?._id || 'sem-jogador');
    }
  }, [selObs, selJog, observacoes]);

  // Auto-seleciona o 1.º jogador quando não há nada escolhido (modo leitura).
  useEffect(() => {
    if (!carregar && modo === 'ler' && !selJog && !selObs && listaGrupos.length) {
      const g = listaGrupos[0];
      setSelJog(g.jid);
      setSelObs(g.obs[0]._id); // abre sempre a mais recente
    }
  }, [carregar, modo, selJog, selObs, listaGrupos]);

  const podeTrocar = () =>
    modo === 'ler' || window.confirm('Tens alterações por guardar nesta observação. Descartar?');

  const selecionarJogador = (g) => {
    if (!podeTrocar()) return;
    setVoltar(''); // troca de contexto na própria página → abandona o regresso à ficha
    setSelJog(g.jid);
    setModo('ler');
    setSelObs(g.obs[0]._id); // abre sempre a mais recente (obs ordenadas desc)
  };
  const abrirObs = (oid) => {
    setSelObs(oid);
    setModo('ler');
  };
  const novaObs = () => {
    if (!podeTrocar()) return;
    setVoltar('');
    setModo('nova');
    setNovaJogador('');
    setSelJog(null);
    setSelObs(null);
  };
  const cancelar = () => {
    const destino = voltar;
    setVoltar('');
    if (destino) return navigate(destino);
    setModo('ler');
  };

  const feito = (res, msg) =>
    toast(res.perfilAtualizado ? `${msg} · perfil atualizado` : msg, 'ok');

  const guardarNova = async (dados) => {
    setAGuardar(true);
    try {
      const res = await api.post('/observations', dados);
      feito(res, 'Observação registada.');
      const destino = voltar;
      setVoltar('');
      if (destino) return navigate(destino);
      const obs = await carregarTudo();
      const criada = obs.find((o) => o._id === res.observacao._id);
      setSelJog(criada?.jogador?._id || 'sem-jogador');
      setSelObs(criada?._id || null);
      setModo('ler');
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  const guardarEdicao = async (dados) => {
    setAGuardar(true);
    try {
      const res = await api.put('/observations/' + selObs, dados);
      feito(res, 'Observação corrigida.');
      const destino = voltar;
      setVoltar('');
      if (destino) return navigate(destino);
      await carregarTudo();
      setModo('ler');
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  const eliminar = async () => {
    if (!sel || !window.confirm('Eliminar esta observação? Não se pode desfazer.')) return;
    try {
      await api.del('/observations/' + sel._id);
      setSelObs(null);
      setSelJog(null);
      setModo('ler');
      await carregarTudo();
      toast('Observação eliminada.', 'ok');
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };

  const metaLinha = (o) =>
    [
      o.competicao,
      o.adversario,
      o.dataJogo ? 'jogo ' + dataCurta(o.dataJogo) : null,
      o.minutos != null ? o.minutos + "'" : null,
      o.posicaoJogo ? posCurto(o.posicaoJogo) : null,
      o.titular ? 'Titular' : 'Suplente',
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <div className="obs-pagina">
      <div className="pagina-cabecalho obs-cabecalho">
        <h2>Observações</h2>
        {podeEditar && (
          <button className="btn" onClick={novaObs}>
            + Nova observação
          </button>
        )}
      </div>

      <div className="obs-layout">
        {ehTelemovel ? (
          <select
            className="obs-lista__dropdown"
            value={modo !== 'nova' ? selJog || '' : ''}
            onChange={(e) => {
              const g = listaGrupos.find((x) => x.jid === e.target.value);
              if (g) selecionarJogador(g);
            }}
          >
            <option value="" disabled>
              {carregar ? 'A carregar…' : listaGrupos.length === 0 ? 'Sem observações' : 'Escolhe um jogador…'}
            </option>
            {listaGrupos.map((g) => (
              <option key={g.jid} value={g.jid}>
                {(g.jogador?.nomeCompleto || 'Jogador removido') + ' · ' + g.obs.length + ' obs'}
              </option>
            ))}
          </select>
        ) : (
          <div className="obs-lista">
            <input
              className="obs-lista__busca"
              type="search"
              placeholder="Procurar por jogador…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            <div className="obs-lista__rolo">
              {carregar ? (
                <p className="obs-lista__vazio">A carregar…</p>
              ) : listaGrupos.length === 0 ? (
                <p className="obs-lista__vazio">Sem observações.</p>
              ) : (
                listaGrupos.map((g) => (
                  <button
                    key={g.jid}
                    className={'obs-item' + (g.jid === selJog && modo !== 'nova' ? ' obs-item--ativo' : '')}
                    onClick={() => selecionarJogador(g)}
                  >
                    <div className="obs-item__topo">
                      <span className="obs-item__nome">{g.jogador?.nomeCompleto || 'Jogador removido'}</span>
                      <span className="obs-item__conta">
                        {g.obs.length} {g.obs.length === 1 ? 'obs' : 'obs'}
                      </span>
                    </div>
                    <div className="obs-item__meta">
                      {g.jogador?.posicaoPrincipal ? posCurto(g.jogador.posicaoPrincipal) + ' · ' : ''}
                      última {dataCurta(g.obs[0].dataObservacao || g.obs[0].dataJogo)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="obs-detalhe">
          {modo === 'nova' && podeEditar ? (
            <div className="obs-detalhe__form">
              <div className="obs-detalhe__form-cab">
                <h3>Nova observação{jogadores.find((j) => j._id === novaJogador) ? ' · ' + jogadores.find((j) => j._id === novaJogador).nomeCompleto : ''}</h3>
              </div>
              {jogosSug.length > 0 && (
                <div style={{ background: 'var(--fundo-alt, #eef0f2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8, color: 'var(--texto-suave)' }}>
                    Jogos que marcaste como vistos com este jogador — clica para preencher:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {jogosSug.map((g) => {
                      const ativo = jogoSel?.calendarioJogo === g.calendarioJogo;
                      return (
                        <button
                          type="button"
                          key={g.calendarioJogo}
                          onClick={() => setJogoSel(ativo ? null : g)}
                          style={{
                            textAlign: 'left', cursor: 'pointer', padding: '6px 10px', borderRadius: 6,
                            border: '1px solid ' + (ativo ? 'var(--verde)' : 'var(--borda)'),
                            background: ativo ? 'var(--verde)' : 'var(--superficie)',
                            color: ativo ? '#fff' : 'var(--texto)', font: 'inherit', lineHeight: 1.25,
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{g.casa} × {g.fora}</div>
                          <div style={{ fontSize: 11, opacity: 0.85 }}>
                            {dataCurta(g.data)}{g.competicao ? ' · ' + g.competicao : ''}{g.serie ? ' ' + g.serie.replace('Série', 'Sér.') : ''}
                            {g.jaReportado ? ' · já reportado' : ''}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {jogoSel && (
                    <div style={{ fontSize: 12, color: 'var(--verde)', marginTop: 8 }}>
                      ✓ Preenchido com {jogoSel.casa} × {jogoSel.fora} ·{' '}
                      <button type="button" onClick={() => setJogoSel(null)} style={{ background: 'none', border: 'none', color: 'var(--texto-suave)', cursor: 'pointer', padding: 0, textDecoration: 'underline', font: 'inherit' }}>limpar</button>
                    </div>
                  )}
                </div>
              )}
              <FormularioObservacao
                key={'obs-nova-' + (jogoSel ? jogoSel.calendarioJogo : 'x')}
                jogadores={jogadores}
                jogadorFixo={novaJogador || undefined}
                posicaoJogador={jogadores.find((j) => j._id === novaJogador)?.posicaoPrincipal}
                inicial={jogoSel ? { jogador: novaJogador, dataJogo: jogoSel.data, competicao: jogoSel.competicao + (jogoSel.serie ? ' · ' + jogoSel.serie : ''), adversario: jogoSel.adversario } : undefined}
                aoGuardar={guardarNova}
                aoCancelar={cancelar}
                aGuardar={aGuardar}
                textoBotao="Registar observação"
              />
            </div>
          ) : !selJog ? (
            <div className="obs-vazio">Seleciona um jogador à esquerda.</div>
          ) : modo === 'editar' && sel && podeEditar ? (
            <div className="obs-detalhe__form">
              <div className="obs-detalhe__form-cab">
                <h3>Corrigir observação — {sel.jogador?.nomeCompleto || ''}</h3>
              </div>
              <FormularioObservacao
                key={'obs-ed-' + sel._id}
                jogadores={jogadores}
                jogadorFixo={sel.jogador?._id || sel.jogador}
                posicaoJogador={sel.jogador?.posicaoPrincipal}
                inicial={sel}
                aoGuardar={guardarEdicao}
                aoCancelar={cancelar}
                aGuardar={aGuardar}
                textoBotao="Guardar alterações"
              />
            </div>
          ) : (
            <>
              <div className="obs-detalhe__topo">
                {grupoSel && grupoSel.obs.length >= 2 && (
                  <div className="obs-cartoes">
                    <div className="obs-cartoes__cab">
                      {grupoSel.jogador?.nomeCompleto} · {grupoSel.obs.length} observações
                    </div>
                    <div className="obs-cartoes__grelha">
                      {grupoSel.obs.map((o) => (
                        <CartaoObs key={o._id} obs={o} ativo={o._id === selObs} aoAbrir={() => abrirObs(o._id)} />
                      ))}
                    </div>
                  </div>
                )}
                {sel && (
                  <div className="obs-detalhe__barra">
                    <div className="obs-detalhe__cab">
                      <h3 className="obs-detalhe__nome">
                        {sel.jogador ? (
                          <Link to={'/jogadores/' + sel.jogador._id}>{sel.jogador.nomeCompleto}</Link>
                        ) : (
                          'Jogador removido'
                        )}
                        <span className="obs-detalhe__data" title="Data em que viste o jogo">{dataCurta(sel.dataObservacao || sel.dataJogo)}</span>
                      </h3>
                      <div className="obs-detalhe__linha">{metaLinha(sel) || '—'}</div>
                      {/* Decisão (veredito) + R + P DESTA observação (leitura) */}
                      <div className="obs-detalhe__cls">
                        {sel.veredito ? (
                          <span
                            className="badge"
                            title="Decisão desta observação"
                            style={{
                              color: corVeredito(sel.veredito),
                              background: `color-mix(in srgb, ${corVeredito(sel.veredito)} 14%, transparent)`,
                              borderColor: `color-mix(in srgb, ${corVeredito(sel.veredito)} 36%, transparent)`,
                            }}
                          >
                            {sel.veredito}
                          </span>
                        ) : (
                          <span className="badge badge--prospecao" title="Decisão desta observação">Decisão por definir</span>
                        )}
                        <BadgesRP rendimento={sel.rendimento} potencial={sel.potencialClass} />
                      </div>
                    </div>
                    <div className="obs-detalhe__acoes">
                      <span className="obs-detalhe__rating">
                        {sel.rating != null ? sel.rating.toFixed(1) : '—'}
                        <small>rating</small>
                      </span>
                      {podeEditar && (
                        <>
                          <button className="btn btn--pequeno" onClick={() => setModo('editar')}>
                            Editar
                          </button>
                          <button className="btn btn--secundario btn--pequeno" onClick={eliminar}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {sel ? (
                <RelatorioObs obs={sel} />
              ) : (
                <div className="obs-vazio">Escolhe uma observação acima para ver o relatório.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
