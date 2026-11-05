import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toasts.jsx';

const ESTADOS = ['Nova', 'Em análise', 'Aceite', 'Recusada'];
const COR_ESTADO = {
  Nova: 'var(--azul)',
  'Em análise': 'var(--amarelo)',
  Aceite: 'var(--verde-ok)',
  Recusada: 'var(--vermelho)',
};

function Estado({ v }) {
  const cor = COR_ESTADO[v] || 'var(--texto-suave)';
  return (
    <span
      className="badge"
      style={{
        color: cor,
        background: `color-mix(in srgb, ${cor} 14%, transparent)`,
        borderColor: `color-mix(in srgb, ${cor} 36%, transparent)`,
        whiteSpace: 'nowrap',
      }}
    >
      {v}
    </span>
  );
}

const VAZIO = { nome: '', clube: '', posicao: '', nota: '', link: '' };

export default function Sugestoes() {
  const { podeEditar, utilizador } = useAuth();
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [form, setForm] = useState(VAZIO);
  const [aEnviar, setAEnviar] = useState(false);

  const carregarLista = useCallback(async () => {
    setCarregar(true);
    try {
      setLista(await api.get('/sugestoes'));
    } catch (err) {
      toast('Erro a carregar sugestões: ' + err.message, 'erro');
    } finally {
      setCarregar(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  const campo = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const submeter = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.clube.trim() || !form.posicao.trim()) {
      toast('Preenche o nome, o clube e a posição.', 'erro');
      return;
    }
    setAEnviar(true);
    try {
      await api.post('/sugestoes', form);
      setForm(VAZIO);
      toast('Sugestão enviada. Obrigado!', 'ok');
      carregarLista();
    } catch (err) {
      toast('Erro ao enviar: ' + err.message, 'erro');
    } finally {
      setAEnviar(false);
    }
  };

  const mudarEstado = async (id, estado) => {
    try {
      await api.patch('/sugestoes/' + id, { estado });
      setLista((l) => l.map((s) => (s._id === id ? { ...s, estado } : s)));
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  };

  const guardarResposta = async (id, respostaEditor) => {
    try {
      await api.patch('/sugestoes/' + id, { respostaEditor });
      setLista((l) => l.map((s) => (s._id === id ? { ...s, respostaEditor } : s)));
      toast('Resposta guardada.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  };

  const remover = async (id) => {
    if (!window.confirm('Remover esta sugestão?')) return;
    try {
      await api.del('/sugestoes/' + id);
      setLista((l) => l.filter((s) => s._id !== id));
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  };

  const urlLink = (link) => (/^https?:\/\//i.test(link) ? link : 'https://' + link);

  return (
    <div className="sug-pagina">
      <div className="pagina-cabecalho">
        <div>
          <h2>Sugestões</h2>
          <p className="sug-sub">
            {podeEditar
              ? 'Jogadores sugeridos pelo clube — revê e dá seguimento.'
              : 'Sugere jogadores à equipa de scouting. Nome, clube e posição são obrigatórios; o motivo e o link são opcionais.'}
          </p>
        </div>
      </div>

      <div className={'sug-grelha' + (podeEditar ? ' sug-grelha--lista' : '')}>
        {/* Formulário — só para quem sugere (clube/equipa técnica); o scouting só vê a lista */}
        {!podeEditar && (
        <form className="card sug-form" onSubmit={submeter}>
          <h3 className="sug-form__titulo">Sugerir um jogador</h3>
          <label className="sug-label">
            <span>Nome do jogador *</span>
            <input value={form.nome} onChange={campo('nome')} placeholder="Nome do jogador…" />
          </label>
          <div className="sug-dois">
            <label className="sug-label">
              <span>Clube *</span>
              <input value={form.clube} onChange={campo('clube')} placeholder="Clube atual…" />
            </label>
            <label className="sug-label">
              <span>Posição *</span>
              <input value={form.posicao} onChange={campo('posicao')} placeholder="Ex.: Médio, PL…" />
            </label>
          </div>
          <label className="sug-label">
            <span>Motivo (opcional)</span>
            <textarea value={form.nota} onChange={campo('nota')} rows={3} placeholder="O que te chamou a atenção…" />
          </label>
          <label className="sug-label">
            <span>Link (opcional)</span>
            <input value={form.link} onChange={campo('link')} placeholder="zerozero, vídeo, notícia…" />
          </label>
          <button type="submit" className="btn" disabled={aEnviar || !form.nome.trim() || !form.clube.trim() || !form.posicao.trim()}>
            {aEnviar ? 'A enviar…' : 'Enviar sugestão'}
          </button>
        </form>
        )}

        {/* Lista */}
        <div className="sug-lista">
          <h3 className="sug-lista__titulo">
            {podeEditar ? 'Sugestões do clube' : 'As minhas sugestões'}
            {lista.length > 0 && <span className="sug-conta">{lista.length}</span>}
          </h3>

          {carregar ? (
            <p className="sug-vazio">A carregar…</p>
          ) : lista.length === 0 ? (
            <p className="sug-vazio">
              {podeEditar ? 'Ainda não há sugestões do clube.' : 'Ainda não sugeriste nenhum jogador.'}
            </p>
          ) : (
            lista.map((s) => {
              const podeRemover =
                podeEditar || (s.estado === 'Nova' && String(s.autorId) === String(utilizador?.id));
              return (
                <div className="card sug-item" key={s._id}>
                  <div className="sug-item__topo">
                    <div className="sug-item__id">
                      <span className="sug-item__nome">{s.nome}</span>
                      {(s.clube || s.posicao) && (
                        <span className="sug-item__meta">{[s.posicao, s.clube].filter(Boolean).join(' · ')}</span>
                      )}
                    </div>
                    <Estado v={s.estado} />
                  </div>

                  {s.nota && <p className="sug-item__nota">{s.nota}</p>}
                  {s.link && (
                    <a className="sug-item__link" href={urlLink(s.link)} target="_blank" rel="noreferrer">
                      {s.link} ↗
                    </a>
                  )}

                  <div className="sug-item__rodape">
                    <span className="sug-item__autor">
                      {podeEditar && s.autorNome ? s.autorNome + ' · ' : ''}
                      {new Date(s.createdAt).toLocaleDateString('pt-PT')}
                    </span>
                    {podeRemover && (
                      <button className="sug-item__apagar" onClick={() => remover(s._id)} title="Remover sugestão">
                        ×
                      </button>
                    )}
                  </div>

                  {/* Resposta do scouting (para o clube) */}
                  {!podeEditar && s.respostaEditor && (
                    <div className="sug-resposta">
                      <b>Scouting:</b> {s.respostaEditor}
                    </div>
                  )}

                  {/* Gestão (scouting) */}
                  {podeEditar && (
                    <div className="sug-gestao">
                      <select value={s.estado} onChange={(e) => mudarEstado(s._id, e.target.value)}>
                        {ESTADOS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                      <input
                        defaultValue={s.respostaEditor || ''}
                        placeholder="Resposta ao clube…"
                        onBlur={(e) => {
                          if (e.target.value !== (s.respostaEditor || '')) guardarResposta(s._id, e.target.value);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
