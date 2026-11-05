import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import ControloTrabalho from './pages/ControloTrabalho.jsx';
import Jogadores from './pages/Jogadores.jsx';
import JogadorForm from './pages/JogadorForm.jsx';
import FichaJogador from './pages/FichaJogador.jsx';
import Observacoes from './pages/Observacoes.jsx';
import Agenda from './pages/Agenda.jsx';
import Planeamento from './pages/Planeamento.jsx';
import Recrutamento from './pages/Recrutamento.jsx';
import Ligas from './pages/Ligas.jsx';
import Contactos from './pages/Contactos.jsx';
import Sugestoes from './pages/Sugestoes.jsx';
import Manual from './pages/Manual.jsx';
import Definicoes from './pages/Definicoes.jsx';

// Rota só para editores (scouting). Os outros papéis são reencaminhados para a Home.
function RotaEditor({ children }) {
  const { podeEditar } = useAuth();
  return podeEditar ? children : <Navigate to="/" replace />;
}

// Rota condicionada ao acesso por conta a uma página (ver auth.jsx → acessos).
// Sem acesso → Home.
function RotaPagina({ pagina, children }) {
  const { podeVer } = useAuth();
  return podeVer(pagina) ? children : <Navigate to="/" replace />;
}

export default function App() {
  const auth = useAuth();
  const { carregando, autenticado } = auth;

  if (carregando) {
    return (
      <div className="login">
        <div className="login__carregar">A carregar…</div>
      </div>
    );
  }
  if (!autenticado) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/controlo" element={<RotaPagina pagina="controlo"><ControloTrabalho /></RotaPagina>} />
        <Route path="/controlo/:aba" element={<RotaPagina pagina="controlo"><ControloTrabalho /></RotaPagina>} />
        <Route path="/jogadores" element={<RotaPagina pagina="jogadores"><Jogadores /></RotaPagina>} />
        <Route path="/jogadores/novo" element={<RotaEditor><JogadorForm /></RotaEditor>} />
        <Route path="/jogadores/:id/editar" element={<RotaEditor><JogadorForm /></RotaEditor>} />
        <Route path="/jogador/:id" element={<FichaJogador />} />
        <Route path="/jogadores/:id" element={<RotaPagina pagina="jogadores"><Jogadores /></RotaPagina>} />
        <Route path="/observacoes" element={<RotaPagina pagina="observacoes"><Observacoes /></RotaPagina>} />
        <Route path="/agenda" element={<RotaPagina pagina="agenda"><Agenda /></RotaPagina>} />
        <Route path="/agenda/:aba" element={<RotaPagina pagina="agenda"><Agenda /></RotaPagina>} />
        <Route path="/planeamento" element={<RotaPagina pagina="planeamento"><Planeamento /></RotaPagina>} />
        <Route path="/planeamento/:aba" element={<RotaPagina pagina="planeamento"><Planeamento /></RotaPagina>} />
        <Route path="/planeamento/:aba/:id" element={<RotaPagina pagina="planeamento"><Planeamento /></RotaPagina>} />
        <Route path="/profundidade" element={<Navigate to="/planeamento" replace />} />
        <Route path="/recrutamento" element={<RotaPagina pagina="recrutamento"><Recrutamento /></RotaPagina>} />
        <Route path="/recrutamento/:aba" element={<RotaPagina pagina="recrutamento"><Recrutamento /></RotaPagina>} />
        <Route path="/sugestoes" element={<RotaPagina pagina="sugestoes"><Sugestoes /></RotaPagina>} />
        <Route path="/manual" element={<RotaPagina pagina="manual"><Manual /></RotaPagina>} />
        <Route path="/definicoes" element={<Definicoes />} />
        {/* Rotas antigas → novos caminhos */}
        <Route path="/comparar" element={<Navigate to="/recrutamento/comparar" replace />} />
        <Route path="/shortlist" element={<Navigate to="/recrutamento" replace />} />
        <Route path="/pipeline" element={<Navigate to="/recrutamento" replace />} />
        <Route path="/ligas" element={<RotaPagina pagina="ligas"><Ligas /></RotaPagina>} />
        <Route path="/ligas/:id" element={<RotaPagina pagina="ligas"><Ligas /></RotaPagina>} />
        <Route path="/clubes" element={<Navigate to="/ligas" replace />} />
        <Route path="/contactos" element={<RotaPagina pagina="contactos"><Contactos /></RotaPagina>} />
      </Routes>
    </Layout>
  );
}
