import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { posCurto } from '../lib.js';

export default function PesquisaGlobal({ aoNavegar }) {
  const navegar = useNavigate();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .get('/search?q=' + encodeURIComponent(q.trim()))
        .then((r) => {
          setRes(r);
          setAberto(true);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // fechar ao clicar fora
  useEffect(() => {
    const fora = (e) => caixaRef.current && !caixaRef.current.contains(e.target) && setAberto(false);
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const ir = (destino) => {
    setQ('');
    setRes(null);
    setAberto(false);
    aoNavegar && aoNavegar();
    navegar(destino);
  };

  const total = res ? res.players.length + res.clubs.length + res.contacts.length : 0;

  return (
    <div className="pesquisa" ref={caixaRef}>
      <input
        type="search"
        placeholder="Pesquisar…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => res && setAberto(true)}
      />
      {aberto && res && (
        <div className="pesquisa__resultados">
          {total === 0 && <div className="pesquisa__vazio">Sem resultados.</div>}

          {res.players.length > 0 && (
            <div className="pesquisa__grupo">
              <div className="pesquisa__titulo">Jogadores</div>
              {res.players.map((p) => (
                <button key={p._id} className="pesquisa__item" onClick={() => ir('/jogadores/' + p._id)}>
                  <strong>{p.nomeCompleto}</strong>
                  <small>
                    {posCurto(p.posicaoPrincipal)} · {p.clubeAtual || '—'}
                  </small>
                </button>
              ))}
            </div>
          )}

          {res.clubs.length > 0 && (
            <div className="pesquisa__grupo">
              <div className="pesquisa__titulo">Clubes</div>
              {res.clubs.map((c) => (
                <button key={c._id} className="pesquisa__item" onClick={() => ir('/ligas')}>
                  <strong>{c.nome}</strong>
                  <small>{c.pais || '—'}</small>
                </button>
              ))}
            </div>
          )}

          {res.contacts.length > 0 && (
            <div className="pesquisa__grupo">
              <div className="pesquisa__titulo">Contactos</div>
              {res.contacts.map((c) => (
                <button key={c._id} className="pesquisa__item" onClick={() => ir('/contactos')}>
                  <strong>{c.nome}</strong>
                  <small>{c.empresa || '—'}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
