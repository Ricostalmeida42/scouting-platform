import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { CLUBE_PROPRIO } from '../lib.js';
import TemaSwitch from './TemaSwitch.jsx';

// Navegação agrupada por categorias. `pagina` liga cada item ao acesso por conta
// (ver auth.jsx → acessos). Um item só aparece se a conta tiver essa página.
// Sem `pagina` → visível a todos (ex.: Página inicial).
const GRUPOS = [
  {
    titulo: 'Visão geral',
    itens: [
      { para: '/', icone: '⌂', rotulo: 'Página inicial', exact: true },
      { para: '/controlo', icone: '◍', rotulo: 'Controlo', pagina: 'controlo' },
    ],
  },
  {
    titulo: 'Scouting',
    itens: [
      { para: '/agenda', icone: '🗓', rotulo: 'Agenda', pagina: 'agenda' },
      { para: '/observacoes', icone: '✎', rotulo: 'Observações', pagina: 'observacoes' },
      { para: '/jogadores', icone: '◉', rotulo: 'Base de dados', pagina: 'jogadores' },
    ],
  },
  {
    titulo: 'Recrutamento',
    itens: [
      { para: '/recrutamento', icone: '★', rotulo: 'Recrutamento', pagina: 'recrutamento' },
      { para: '/planeamento', icone: '⬢', rotulo: 'Planeamento', pagina: 'planeamento' },
      { para: '/sugestoes', icone: '✦', rotulo: 'Sugestões', pagina: 'sugestoes' },
    ],
  },
  {
    titulo: 'Diretório',
    itens: [
      { para: '/ligas', icone: '◈', rotulo: 'Ligas & Clubes', pagina: 'ligas' },
      { para: '/contactos', icone: '☏', rotulo: 'Contactos', pagina: 'contactos' },
    ],
  },
];

export default function Layout({ children }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [min, setMin] = useState(() => localStorage.getItem('scouting.sidebarMin') === '1');
  const [sugNovas, setSugNovas] = useState(0);
  const auth = useAuth();
  const { utilizador, logout, podeEditar, ehDiretor, ehTecnico, ehTreinador } = auth;
  const fechar = () => setMenuAberto(false);
  const alternarMin = () =>
    setMin((v) => {
      const nv = !v;
      localStorage.setItem('scouting.sidebarMin', nv ? '1' : '0');
      return nv;
    });

  // Contador de sugestões novas (só relevante para o scouting).
  useEffect(() => {
    if (!podeEditar) return;
    api.get('/sugestoes/contador', { silencioso: true })
      .then((d) => setSugNovas(d?.novas || 0))
      .catch(() => {});
  }, [podeEditar]);

  return (
    <div className={'app' + (min ? ' app--sidebar-min' : '')}>
      {/* Barra superior — só visível em ecrãs estreitos */}
      <header className="topbar">
        <button className="topbar__menu" onClick={() => setMenuAberto((v) => !v)} aria-label="Menu">
          ☰
        </button>
        <span className="topbar__marca">{CLUBE_PROPRIO}</span>
      </header>

      {menuAberto && <div className="sidebar__overlay" onClick={fechar} />}

      <aside className={'sidebar' + (menuAberto ? ' sidebar--aberta' : '')}>
        <div className="sidebar__marca">
          <h1>{CLUBE_PROPRIO}</h1>
          <span>Scouting</span>
          <button
            type="button"
            className="sidebar__toggle"
            onClick={alternarMin}
            title={min ? 'Expandir menu' : 'Minimizar menu'}
            aria-label={min ? 'Expandir menu' : 'Minimizar menu'}
          >
            {min ? '»' : '«'}
          </button>
        </div>
        <nav className="sidebar__nav">
          {GRUPOS.map((g) => {
            const itens = g.itens.filter((m) => !m.pagina || auth.podeVer(m.pagina));
            if (itens.length === 0) return null;
            return (
            <div className="sidebar__grupo" key={g.titulo}>
              <div className="sidebar__grupo-titulo">{g.titulo}</div>
              {itens.map((m) => (
                <NavLink
                  key={m.para}
                  to={m.para}
                  end={m.exact}
                  onClick={fechar}
                  title={m.rotulo}
                  className={({ isActive }) => 'sidebar__link' + (isActive ? ' ativo' : '')}
                >
                  <span className="sidebar__icone">{m.icone}</span>
                  <span className="sidebar__rotulo">{m.rotulo}</span>
                  {m.para === '/sugestoes' && sugNovas > 0 && (
                    <span className="sidebar__badge" title={`${sugNovas} sugestão(ões) nova(s)`}>{sugNovas}</span>
                  )}
                </NavLink>
              ))}
            </div>
            );
          })}
        </nav>
        <div className="sidebar__rodape">
          <div className="sidebar__tema">
            <span className="sidebar__tema-l">Tema</span>
            <div className="sidebar__tema-dir">
              <TemaSwitch />
              <NavLink
                to="/definicoes"
                onClick={fechar}
                title="Definições"
                aria-label="Definições"
                className={({ isActive }) => 'sidebar__def-botao' + (isActive ? ' ativo' : '')}
              >
                ⚙
              </NavLink>
            </div>
          </div>

          {utilizador && (
            <div className="sidebar__utilizador">
              <div className="sidebar__utilizador-info">
                <span className="sidebar__utilizador-nome" title={utilizador.nome}>
                  {utilizador.nome}
                </span>
                <span className={'sidebar__papel' + (podeEditar ? ' sidebar__papel--editor' : '')}>
                  {podeEditar
                    ? 'Scouting'
                    : ehDiretor
                    ? 'Diretor desportivo'
                    : ehTreinador
                    ? 'Treinador principal'
                    : ehTecnico
                    ? 'Equipa técnica'
                    : '—'}
                </span>
              </div>
              <button
                type="button"
                className="sidebar__sair"
                onClick={logout}
                title="Terminar sessão"
              >
                ⎋ Sair
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="conteudo">{children}</main>
    </div>
  );
}
