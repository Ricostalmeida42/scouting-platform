import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

// Campo de competição: escolhe das ligas que tens em acompanhamento,
// com escape para escrever outra que ainda não esteja no catálogo.
export default function CampoCompeticao({ valor = '', onChange }) {
  const [ligas, setLigas] = useState([]);
  const [carregou, setCarregou] = useState(false);
  const [outra, setOutra] = useState(false);

  useEffect(() => {
    api
      .get('/leagues')
      .then((l) => setLigas(l.map((x) => x.nome)))
      .catch(() => {})
      .finally(() => setCarregou(true));
  }, []);

  // Valor que não pertence ao catálogo (ex: vindo de um agendamento antigo) → modo livre
  useEffect(() => {
    if (valor && ligas.length > 0 && !ligas.includes(valor)) setOutra(true);
  }, [valor, ligas]);

  // Sem ligas registadas: campo livre + atalho para as criar
  if (carregou && ligas.length === 0) {
    return (
      <>
        <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder="Nome da competição" />
        <small style={{ color: 'var(--texto-suave)', marginTop: 4 }}>
          Ainda não tens ligas. <Link to="/ligas" style={{ color: 'var(--verde)', fontWeight: 600 }}>Adicionar ligas</Link> para
          passarem a aparecer aqui.
        </small>
      </>
    );
  }

  if (outra) {
    return (
      <>
        <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder="Nome da competição" autoFocus />
        <button
          type="button"
          className="btn btn--secundario btn--pequeno"
          style={{ marginTop: 6, alignSelf: 'flex-start' }}
          onClick={() => {
            setOutra(false);
            onChange('');
          }}
        >
          ← Escolher das minhas ligas
        </button>
      </>
    );
  }

  return (
    <select
      value={valor}
      onChange={(e) => {
        if (e.target.value === '__outra__') {
          setOutra(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
    >
      <option value="">—</option>
      {ligas.map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
      <option value="__outra__">Outra…</option>
    </select>
  );
}
