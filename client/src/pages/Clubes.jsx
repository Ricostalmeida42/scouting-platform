import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Modal from '../components/Modal.jsx';
import { RELACAO_CLUBE } from '../lib.js';
import { useToast } from '../components/Toasts.jsx';

const vazio = {
  nome: '',
  pais: '',
  liga: '',
  escalao: '',
  relacao: 'Neutro',
  contactoNome: '',
  contactoEmail: '',
  contactoTelefone: '',
  notas: '',
};

export default function Clubes() {
  const [clubes, setClubes] = useState([]);
  const [ligas, setLigas] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [modal, setModal] = useState(false);
  const [f, setF] = useState(vazio);
  const [aGuardar, setAGuardar] = useState(false);
  const [aSincronizar, setASincronizar] = useState(false);
  const toast = useToast();

  const carregarLista = () => {
    setCarregar(true);
    api.get('/clubs').then(setClubes).finally(() => setCarregar(false));
  };
  useEffect(carregarLista, []);
  useEffect(() => {
    api.get('/leagues').then(setLigas).catch(() => {});
  }, []);

  const abrir = (c) => {
    // liga vem populada (objeto) da API; no formulário guardamos só o _id.
    setF(c ? { ...vazio, ...c, liga: c.liga?._id || c.liga || '' } : vazio);
    setModal(c || true);
  };
  const set = (campo) => (e) => setF((s) => ({ ...s, [campo]: e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    setAGuardar(true);
    try {
      const corpo = { ...f, liga: f.liga || null };
      if (modal && modal._id) await api.put('/clubs/' + modal._id, corpo);
      else await api.post('/clubs', corpo);
      setModal(false);
      carregarLista();
      toast('Clube guardado.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  const sincronizar = async () => {
    setASincronizar(true);
    try {
      const r = await api.post('/clubs/sincronizar-calendario', {});
      carregarLista();
      const semLiga = r.semLiga?.length ? ` · ${r.semLiga.length} sem liga` : '';
      toast(`Sincronizado: ${r.criados} clube(s) novo(s), ${r.ligados} ligado(s)${semLiga}.`, 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    } finally {
      setASincronizar(false);
    }
  };

  const apagar = async (id) => {
    if (!confirm('Eliminar este clube?')) return;
    await api.del('/clubs/' + id);
    carregarLista();
  };

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Clubes</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--secundario" onClick={sincronizar} disabled={aSincronizar}>
            {aSincronizar ? 'A sincronizar…' : '↻ Sincronizar do calendário'}
          </button>
          <button className="btn" onClick={() => abrir(null)}>
            + Adicionar clube
          </button>
        </div>
      </div>

      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Liga</th>
              <th style={{ textAlign: 'center' }}>Jogadores</th>
              <th>Escalão</th>
              <th>Relação</th>
              <th>Contacto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {carregar ? (
              <tr><td colSpan={7} className="tabela-vazia">A carregar…</td></tr>
            ) : clubes.length === 0 ? (
              <tr><td colSpan={7} className="tabela-vazia">Sem clubes registados.</td></tr>
            ) : (
              clubes.map((c) => (
                <tr key={c._id} className="clicavel" onClick={() => abrir(c)}>
                  <td><strong>{c.nome}</strong></td>
                  <td>{c.liga?.nome || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {c.jogadoresCount ? <span className="badge badge--shortlist">{c.jogadoresCount}</span> : '—'}
                  </td>
                  <td>{c.escalao || '—'}</td>
                  <td>{c.relacao}</td>
                  <td>{c.contactoNome || c.contactoEmail || c.contactoTelefone || '—'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn--perigo btn--pequeno" onClick={() => apagar(c._id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal titulo={modal._id ? 'Editar clube' : 'Adicionar clube'} aoFechar={() => setModal(false)}>
          <form onSubmit={guardar}>
            <div className="form-grelha">
              <div className="campo campo--largo">
                <label>Nome *</label>
                <input value={f.nome} onChange={set('nome')} required />
              </div>
              <div className="campo">
                <label>País</label>
                <input value={f.pais} onChange={set('pais')} />
              </div>
              <div className="campo">
                <label>Liga</label>
                <select value={f.liga} onChange={set('liga')}>
                  <option value="">—</option>
                  {ligas.map((l) => (
                    <option key={l._id} value={l._id}>{l.nome}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Escalão</label>
                <input value={f.escalao} onChange={set('escalao')} placeholder="ex: Sub-19, Equipa B" />
              </div>
              <div className="campo">
                <label>Relação</label>
                <select value={f.relacao} onChange={set('relacao')}>
                  {RELACAO_CLUBE.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="form-subtitulo">Contacto no clube</div>
              <div className="campo">
                <label>Nome</label>
                <input value={f.contactoNome} onChange={set('contactoNome')} />
              </div>
              <div className="campo">
                <label>Email</label>
                <input type="email" value={f.contactoEmail} onChange={set('contactoEmail')} />
              </div>
              <div className="campo">
                <label>Telefone</label>
                <input value={f.contactoTelefone} onChange={set('contactoTelefone')} />
              </div>
              <div className="campo campo--largo">
                <label>Notas</label>
                <textarea value={f.notas} onChange={set('notas')} />
              </div>
            </div>
            <div className="modal__rodape" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn btn--secundario" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn" disabled={aGuardar}>{aGuardar ? 'A guardar…' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
