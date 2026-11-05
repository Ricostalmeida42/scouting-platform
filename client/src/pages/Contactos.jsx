import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Modal from '../components/Modal.jsx';
import { dataCurta, dataInput, TIPOS_CONTACTO, FAVOR_ESTADOS } from '../lib.js';
import { useToast } from '../components/Toasts.jsx';

const vazio = {
  nome: '', tipo: '', empresa: '', zona: '', email: '', telemovel: '',
  jogadoresRepresentados: [], oQueSabe: '', favor: '', ultimoContacto: '',
  proximoFollowUp: '', notas: '',
};

const HOJE = dataInput(new Date());
const estaAtrasado = (d) => !!d && dataInput(d) <= HOJE;

const estiloFavor = (f) =>
  f === 'Devo-lhe'
    ? { background: '#fdecea', color: '#b0322b' }
    : f === 'Deve-me'
    ? { background: '#e4f3e9', color: '#1f8a4d' }
    : { background: 'rgba(0,0,0,0.06)', color: 'var(--texto-suave)' };

export default function Contactos() {
  const [contactos, setContactos] = useState([]);
  const [jogadores, setJogadores] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [modal, setModal] = useState(false);
  const [f, setF] = useState(vazio);
  const [aGuardar, setAGuardar] = useState(false);
  const [filtros, setFiltros] = useState({ q: '', tipo: '', soAContactar: false });
  const toast = useToast();
  const { podeEditar } = useAuth();

  const carregarTudo = () => {
    setCarregar(true);
    Promise.all([api.get('/contacts'), api.get('/players')])
      .then(([cs, js]) => {
        setContactos(cs);
        setJogadores(js);
      })
      .finally(() => setCarregar(false));
  };
  useEffect(carregarTudo, []);

  const abrir = (c) => {
    if (c)
      setF({
        ...vazio,
        ...c,
        jogadoresRepresentados: (c.jogadoresRepresentados || [])
          .filter(Boolean)
          .map((j) => (typeof j === 'string' ? j : j._id)),
        ultimoContacto: dataInput(c.ultimoContacto),
        proximoFollowUp: dataInput(c.proximoFollowUp),
      });
    else setF(vazio);
    setModal(c || true);
  };

  const set = (campo) => (e) => setF((s) => ({ ...s, [campo]: e.target.value }));
  const setJogs = (e) =>
    setF((s) => ({ ...s, jogadoresRepresentados: Array.from(e.target.selectedOptions).map((o) => o.value) }));

  const guardar = async (e) => {
    e.preventDefault();
    setAGuardar(true);
    try {
      const corpo = {
        ...f,
        ultimoContacto: f.ultimoContacto || undefined,
        proximoFollowUp: f.proximoFollowUp || undefined,
      };
      if (modal && modal._id) await api.put('/contacts/' + modal._id, corpo);
      else await api.post('/contacts', corpo);
      setModal(false);
      carregarTudo();
      toast('Contacto guardado.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  const apagar = async (id) => {
    if (!confirm('Eliminar este contacto?')) return;
    await api.del('/contacts/' + id);
    carregarTudo();
  };

  const aContactar = useMemo(
    () => contactos.filter((c) => estaAtrasado(c.proximoFollowUp)).length,
    [contactos]
  );

  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const lista = useMemo(() => {
    const q = norm(filtros.q.trim());
    return contactos
      .filter((c) => {
        if (filtros.tipo && c.tipo !== filtros.tipo) return false;
        if (filtros.soAContactar && !estaAtrasado(c.proximoFollowUp)) return false;
        if (q && !(norm(c.nome).includes(q) || norm(c.empresa).includes(q) || norm(c.zona).includes(q) || norm(c.oQueSabe).includes(q)))
          return false;
        return true;
      })
      .sort((a, b) => {
        // primeiro os que estão a contactar (follow-up mais antigo em cima), depois por nome
        const aa = estaAtrasado(a.proximoFollowUp), ba = estaAtrasado(b.proximoFollowUp);
        if (aa !== ba) return aa ? -1 : 1;
        if (aa && ba) return dataInput(a.proximoFollowUp).localeCompare(dataInput(b.proximoFollowUp));
        return a.nome.localeCompare(b.nome);
      });
  }, [contactos, filtros]);

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Rede de contactos</h2>
        </div>
        {podeEditar && (
          <button className="btn" onClick={() => abrir(null)}>
            + Adicionar contacto
          </button>
        )}
      </div>

      <div className="filtros">
        <input
          type="search"
          placeholder="Pesquisar nome, clube, zona, o que sabe…"
          value={filtros.q}
          onChange={(e) => setFiltros((s) => ({ ...s, q: e.target.value }))}
        />
        <select value={filtros.tipo} onChange={(e) => setFiltros((s) => ({ ...s, tipo: e.target.value }))}>
          <option value="">Tipo (todos)</option>
          {TIPOS_CONTACTO.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label className="chk" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filtros.soAContactar}
            onChange={(e) => setFiltros((s) => ({ ...s, soAContactar: e.target.checked }))}
          />
          Só a contactar
          {aContactar > 0 && (
            <span className="badge" style={{ background: '#fdecea', color: '#b0322b' }}>{aContactar}</span>
          )}
        </label>
      </div>

      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Clube / agência</th>
              <th>Zona</th>
              <th>Última conversa</th>
              <th>Follow-up</th>
              <th>Favor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {carregar ? (
              <tr><td colSpan={8} className="tabela-vazia">A carregar…</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={8} className="tabela-vazia">Sem contactos. Começa pela gente que já conheces.</td></tr>
            ) : (
              lista.map((c) => {
                const atr = estaAtrasado(c.proximoFollowUp);
                return (
                  <tr key={c._id} className={podeEditar ? 'clicavel' : ''} onClick={podeEditar ? () => abrir(c) : undefined}>
                    <td>
                      <strong>{c.nome}</strong>
                      {c.oQueSabe && (
                        <div style={{ fontSize: 11.5, color: 'var(--texto-suave)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.oQueSabe}
                        </div>
                      )}
                    </td>
                    <td>{c.tipo ? <span className="badge" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--texto)' }}>{c.tipo}</span> : '—'}</td>
                    <td>{c.empresa || '—'}</td>
                    <td>{c.zona || '—'}</td>
                    <td>{dataCurta(c.ultimoContacto)}</td>
                    <td>
                      {c.proximoFollowUp ? (
                        <span className="badge" style={atr ? { background: '#fdecea', color: '#b0322b' } : { background: 'rgba(0,0,0,0.06)', color: 'var(--texto-suave)' }}>
                          {atr ? '⏰ ' : ''}{dataCurta(c.proximoFollowUp)}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{c.favor ? <span className="badge" style={estiloFavor(c.favor)}>{c.favor}</span> : '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {podeEditar && (
                        <button className="btn btn--perigo btn--pequeno" onClick={() => apagar(c._id)}>
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal largo titulo={modal._id ? 'Editar contacto' : 'Adicionar contacto'} aoFechar={() => setModal(false)}>
          <form onSubmit={guardar}>
            <div className="form-grelha">
              <div className="campo campo--largo">
                <label>Nome *</label>
                <input value={f.nome} onChange={set('nome')} required />
              </div>
              <div className="campo">
                <label>Tipo</label>
                <select value={f.tipo} onChange={set('tipo')}>
                  <option value="">—</option>
                  {TIPOS_CONTACTO.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Clube / agência</label>
                <input value={f.empresa} onChange={set('empresa')} />
              </div>
              <div className="campo">
                <label>Zona / localidade</label>
                <input value={f.zona} onChange={set('zona')} placeholder="ex.: Sta. Maria da Feira" />
              </div>
              <div className="campo">
                <label>Telemóvel</label>
                <input value={f.telemovel} onChange={set('telemovel')} />
              </div>
              <div className="campo">
                <label>Email</label>
                <input type="email" value={f.email} onChange={set('email')} />
              </div>
              <div className="campo">
                <label>Última conversa</label>
                <input type="date" value={f.ultimoContacto} onChange={set('ultimoContacto')} />
              </div>
              <div className="campo">
                <label>Próximo follow-up</label>
                <input type="date" value={f.proximoFollowUp} onChange={set('proximoFollowUp')} />
              </div>
              <div className="campo">
                <label>Favor (reciprocidade)</label>
                <select value={f.favor} onChange={set('favor')}>
                  <option value="">—</option>
                  {FAVOR_ESTADOS.map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div className="campo campo--largo">
                <label>O que sabe / o seu valor</label>
                <textarea
                  value={f.oQueSabe}
                  onChange={set('oQueSabe')}
                  placeholder="O que este contacto te traz: jogadores que conhece, clubes onde tem entrada, info de contratos, etc."
                />
              </div>
              <div className="campo campo--largo">
                <label>Jogadores associados</label>
                <select multiple value={f.jogadoresRepresentados} onChange={setJogs} size={4}>
                  {jogadores.map((j) => (
                    <option key={j._id} value={j._id}>{j.nomeCompleto}</option>
                  ))}
                </select>
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
