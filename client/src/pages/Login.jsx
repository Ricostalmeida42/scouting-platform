import { useState } from 'react';
import { CLUBE_PROPRIO } from '../lib.js';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [aEntrar, setAEntrar] = useState(false);

  const submeter = async (e) => {
    e.preventDefault();
    setErro('');
    setAEntrar(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setErro(err.status === 401 ? 'Utilizador ou palavra-passe incorretos.' : err.message);
      setAEntrar(false);
    }
  };

  return (
    <div className="login">
      <form className="login__cartao" onSubmit={submeter}>
        <div className="login__marca">
          <h1>{CLUBE_PROPRIO}</h1>
          <span>Scouting</span>
        </div>

        <label className="login__campo">
          <span>Utilizador</span>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className="login__campo">
          <span>Palavra-passe</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {erro && <div className="login__erro">{erro}</div>}

        <button type="submit" className="login__btn" disabled={aEntrar || !username || !password}>
          {aEntrar ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
