import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useEhTelemovel } from '../hooks.js';
import Modal from '../components/Modal.jsx';
import { PRIORIDADE_LIGA, RELACAO_CLUBE, dataInput } from '../lib.js';
import { useToast } from '../components/Toasts.jsx';

const ligaVazia = { nome: '', competicao: '', pais: '', nivel: 3, transmissao: false, ultimaObservacao: '', prioridade: 'Média', notas: '' };
const clubeVazio = { nome: '', pais: '', liga: '', escalao: '', relacao: 'Neutro', contactoNome: '', contactoEmail: '', contactoTelefone: '', notas: '' };

// Prioridade da liga → classe de cor (Alta vermelho · Média amarelo · Baixa cinza).
const prioSlug = (p) => (p || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Ordem de apresentação das ligas: Alta → Média → Baixa.
const ORDEM_PRIO = { Alta: 0, Média: 1, Baixa: 2 };
const ordenarPorPrio = (ls) =>
  [...ls].sort(
    (a, b) => (ORDEM_PRIO[a.prioridade] ?? 3) - (ORDEM_PRIO[b.prioridade] ?? 3) || (a.nome || '').localeCompare(b.nome || '', 'pt')
  );
const PrioLiga = ({ p }) =>
  p ? <span className={'liga-prio liga-prio--' + prioSlug(p)}>{p}</span> : null;

// Ligas & Clubes numa só página (master-detail): ligas à esquerda, clubes da liga
// escolhida à direita. Reflete a cadeia Liga → Clube → Jogador.
export default function Ligas() {
  const navegar = useNavigate();
  const { id: selId } = useParams();
  const toast = useToast();
  const { podeEditar } = useAuth();
  const ehTelemovel = useEhTelemovel();
  const [ligas, setLigas] = useState([]);
  const [clubes, setClubes] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [modalLiga, setModalLiga] = useState(false);
  const [modalClube, setModalClube] = useState(false);
  const [fLiga, setFLiga] = useState(ligaVazia);
  const [fClube, setFClube] = useState(clubeVazio);
  const [aGuardar, setAGuardar] = useState(false);
  const [aSincronizar, setASincronizar] = useState(false);

  const carregarLista = useCallback(async () => {
    setCarregar(true);
    try {
      const [ls, cs] = await Promise.all([api.get('/leagues'), api.get('/clubs')]);
      setLigas(ls);
      setClubes(cs);
      return ls;
    } finally {
      setCarregar(false);
    }
  }, []);
  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  const ligaId = (c) => String(c.liga?._id || c.liga || '');
  const clubesDaLiga = (id) => clubes.filter((c) => ligaId(c) === String(id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const nClubes = (id) => clubes.filter((c) => ligaId(c) === String(id)).length;
  const sel = ligas.find((l) => l._id === selId) || null;

  // Auto-seleciona a 1.ª liga; re-seleciona se a escolhida deixar de existir.
  useEffect(() => {
    if (carregar || !ligas.length) return;
    if (!selId || !ligas.some((l) => l._id === selId)) navegar('/ligas/' + ligas[0]._id, { replace: true });
  }, [carregar, ligas, selId, navegar]);

  // ---------- Liga (adicionar / editar) ----------
  const abrirLiga = (liga) => {
    setFLiga(liga ? { ...ligaVazia, ...liga, ultimaObservacao: dataInput(liga.ultimaObservacao) } : ligaVazia);
    setModalLiga(liga || true);
  };
  const setL = (campo) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFLiga((s) => ({ ...s, [campo]: v }));
  };
  const guardarLiga = async (e) => {
    e.preventDefault();
    setAGuardar(true);
    try {
      const corpo = { ...fLiga, nivel: Number(fLiga.nivel), ultimaObservacao: fLiga.ultimaObservacao || undefined };
      const res = modalLiga && modalLiga._id ? await api.put('/leagues/' + modalLiga._id, corpo) : await api.post('/leagues', corpo);
      setModalLiga(false);
      await carregarLista();
      if (res?._id) navegar('/ligas/' + res._id);
      toast('Liga guardada.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };
  const apagarLiga = async (id) => {
    if (!confirm('Eliminar esta liga? Os clubes ficam sem liga.')) return;
    await api.del('/leagues/' + id);
    navegar('/ligas');
    await carregarLista();
    toast('Liga eliminada.', 'ok');
  };

  // ---------- Clube (adicionar / editar) ----------
  const abrirClube = (c) => {
    setFClube(c ? { ...clubeVazio, ...c, liga: c.liga?._id || c.liga || '' } : { ...clubeVazio, liga: selId || '' });
    setModalClube(c || true);
  };
  const setC = (campo) => (e) => setFClube((s) => ({ ...s, [campo]: e.target.value }));
  const guardarClube = async (e) => {
    e.preventDefault();
    setAGuardar(true);
    try {
      const corpo = { ...fClube, liga: fClube.liga || null };
      if (modalClube && modalClube._id) await api.put('/clubs/' + modalClube._id, corpo);
      else await api.post('/clubs', corpo);
      setModalClube(false);
      await carregarLista();
      toast('Clube guardado.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };
  const apagarClube = async (id) => {
    if (!confirm('Eliminar este clube?')) return;
    await api.del('/clubs/' + id);
    await carregarLista();
  };

  const sincronizar = async () => {
    setASincronizar(true);
    try {
      const r = await api.post('/clubs/sincronizar-calendario', {});
      await carregarLista();
      const semLiga = r.semLiga?.length ? ` · ${r.semLiga.length} sem liga` : '';
      toast(`Sincronizado: ${r.criados} novo(s), ${r.ligados} ligado(s)${semLiga}.`, 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    } finally {
      setASincronizar(false);
    }
  };

  return (
    <div className="liga-pagina">
      <div className="pagina-cabecalho liga-cabecalho">
        <div>
          <h2>Ligas &amp; Clubes</h2>
        </div>
        {podeEditar && (
          <div className="linha-acoes">
            <button className="btn btn--secundario" onClick={sincronizar} disabled={aSincronizar}>
              {aSincronizar ? 'A sincronizar…' : '↻ Sincronizar do calendário'}
            </button>
            <button className="btn" onClick={() => abrirLiga(null)}>
              + Adicionar liga
            </button>
          </div>
        )}
      </div>

      <div className="liga-layout">
        {ehTelemovel ? (
          <select
            className="liga-lista__dropdown"
            value={selId || ''}
            onChange={(e) => e.target.value && navegar('/ligas/' + e.target.value)}
          >
            <option value="" disabled>
              {carregar ? 'A carregar…' : ligas.length === 0 ? 'Sem ligas' : 'Escolhe uma competição…'}
            </option>
            {ordenarPorPrio(ligas).map((l) => (
              <option key={l._id} value={l._id}>
                {l.nome + (l.prioridade ? ' · ' + l.prioridade : '')}
              </option>
            ))}
          </select>
        ) : (
          <div className="liga-lista">
            <div className="liga-lista__rolo">
              {carregar ? (
                <p className="obs-lista__vazio">A carregar…</p>
              ) : ligas.length === 0 ? (
                <p className="obs-lista__vazio">Sem ligas registadas.</p>
              ) : (
                ordenarPorPrio(ligas).map((l) => (
                  <button
                    key={l._id}
                    className={'liga-item' + (l._id === selId ? ' liga-item--ativo' : '')}
                    onClick={() => navegar('/ligas/' + l._id)}
                  >
                    <div className="liga-item__topo">
                      <span className="liga-item__nome">{l.nome}</span>
                      <span className="liga-item__n" title="Nº de clubes">{nClubes(l._id) || '—'}</span>
                    </div>
                    <div className="liga-item__meta">
                      {l.pais || ''}
                      <PrioLiga p={l.prioridade} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="liga-detalhe">
          {!sel ? (
            <div className="obs-vazio">Seleciona uma liga à esquerda.</div>
          ) : (
            <>
              <div className="liga-detalhe__barra">
                <div>
                  <h3 className="liga-detalhe__nome">{sel.nome}</h3>
                  <div className="liga-detalhe__meta">
                    {[
                      sel.pais,
                      sel.nivel ? 'nível ' + sel.nivel : null,
                      sel.transmissao ? 'transmissão' : null,
                      nClubes(sel._id) + ' clube(s)',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    <PrioLiga p={sel.prioridade} />
                  </div>
                </div>
                {podeEditar && (
                  <div className="liga-detalhe__acoes">
                    <button className="btn btn--pequeno" onClick={() => abrirLiga(sel)}>
                      Editar liga
                    </button>
                    <button className="btn btn--secundario btn--pequeno" onClick={() => abrirClube(null)}>
                      + Clube
                    </button>
                    <button className="btn btn--secundario btn--pequeno" onClick={() => apagarLiga(sel._id)}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
              {sel.notas && <p className="liga-detalhe__notas">{sel.notas}</p>}
              <div className="tabela-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Clube</th>
                      <th style={{ textAlign: 'center' }}>Jogadores</th>
                      <th>Escalão</th>
                      <th>Relação</th>
                      <th>Contacto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clubesDaLiga(sel._id).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="tabela-vazia">
                          Sem clubes nesta liga. Usa “↻ Sincronizar do calendário” ou “+ Clube”.
                        </td>
                      </tr>
                    ) : (
                      clubesDaLiga(sel._id).map((c) => (
                        <tr key={c._id} className={podeEditar ? 'clicavel' : ''} onClick={podeEditar ? () => abrirClube(c) : undefined}>
                          <td>
                            <strong>{c.nome}</strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {c.jogadoresCount ? <span className="badge badge--shortlist">{c.jogadoresCount}</span> : '—'}
                          </td>
                          <td>{c.escalao || '—'}</td>
                          <td>{c.relacao}</td>
                          <td>{c.contactoNome || c.contactoEmail || c.contactoTelefone || '—'}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {podeEditar && (
                              <button className="btn btn--perigo btn--pequeno" onClick={() => apagarClube(c._id)}>
                                Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {modalLiga && (
        <Modal titulo={modalLiga._id ? 'Editar liga' : 'Adicionar liga'} aoFechar={() => setModalLiga(false)}>
          <form onSubmit={guardarLiga}>
            <div className="form-grelha">
              <div className="campo campo--largo">
                <label>Nome *</label>
                <input value={fLiga.nome} onChange={setL('nome')} required />
              </div>
              <div className="campo">
                <label>Competição</label>
                <input value={fLiga.competicao} onChange={setL('competicao')} placeholder="Ex.: Campeonato de Portugal" />
              </div>
              <div className="campo">
                <label>País</label>
                <input value={fLiga.pais} onChange={setL('pais')} />
              </div>
              <div className="campo">
                <label>Nível (1-5)</label>
                <input type="number" min="1" max="5" value={fLiga.nivel} onChange={setL('nivel')} />
              </div>
              <div className="campo">
                <label>Última observação</label>
                <input type="date" value={fLiga.ultimaObservacao} onChange={setL('ultimaObservacao')} />
              </div>
              <div className="campo">
                <label>Prioridade</label>
                <select value={fLiga.prioridade} onChange={setL('prioridade')}>
                  {PRIORIDADE_LIGA.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="campo campo--largo">
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={fLiga.transmissao} onChange={setL('transmissao')} />
                  Transmissão disponível
                </label>
              </div>
              <div className="campo campo--largo">
                <label>Notas</label>
                <textarea value={fLiga.notas} onChange={setL('notas')} />
              </div>
            </div>
            <div className="modal__rodape" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn btn--secundario" onClick={() => setModalLiga(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn" disabled={aGuardar}>
                {aGuardar ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modalClube && (
        <Modal titulo={modalClube._id ? 'Editar clube' : 'Adicionar clube'} aoFechar={() => setModalClube(false)}>
          <form onSubmit={guardarClube}>
            <div className="form-grelha">
              <div className="campo campo--largo">
                <label>Nome *</label>
                <input value={fClube.nome} onChange={setC('nome')} required />
              </div>
              <div className="campo">
                <label>País</label>
                <input value={fClube.pais} onChange={setC('pais')} />
              </div>
              <div className="campo">
                <label>Liga</label>
                <select value={fClube.liga} onChange={setC('liga')}>
                  <option value="">—</option>
                  {ligas.map((l) => (
                    <option key={l._id} value={l._id}>{l.nome}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Escalão</label>
                <input value={fClube.escalao} onChange={setC('escalao')} placeholder="ex: Sub-19, Equipa B" />
              </div>
              <div className="campo">
                <label>Relação</label>
                <select value={fClube.relacao} onChange={setC('relacao')}>
                  {RELACAO_CLUBE.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="form-subtitulo">Contacto no clube</div>
              <div className="campo">
                <label>Nome</label>
                <input value={fClube.contactoNome} onChange={setC('contactoNome')} />
              </div>
              <div className="campo">
                <label>Email</label>
                <input type="email" value={fClube.contactoEmail} onChange={setC('contactoEmail')} />
              </div>
              <div className="campo">
                <label>Telefone</label>
                <input value={fClube.contactoTelefone} onChange={setC('contactoTelefone')} />
              </div>
              <div className="campo campo--largo">
                <label>Notas</label>
                <textarea value={fClube.notas} onChange={setC('notas')} />
              </div>
            </div>
            <div className="modal__rodape" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn btn--secundario" onClick={() => setModalClube(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn" disabled={aGuardar}>
                {aGuardar ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
