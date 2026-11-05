import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

// Páginas que podem ser dadas/retiradas por conta. Tem de bater certo com
// server/src/acessos.js (PAGINAS). 'home'/'definicoes' não entram (sempre).
export const PAGINAS_ACESSO = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'jogadores', label: 'Base de dados' },
  { key: 'recrutamento', label: 'Recrutamento' },
  { key: 'planeamento', label: 'Planeamento' },
  { key: 'sugestoes', label: 'Sugestões' },
  { key: 'controlo', label: 'Controlo' },
  { key: 'ligas', label: 'Ligas & Clubes' },
  { key: 'contactos', label: 'Contactos' },
  { key: 'manual', label: 'Manual' },
];

// Valor por omissão de uma página para um papel/função (espelha acessos.js).
export function acessoPadrao(papel, funcao, pagina) {
  const editor = papel === 'editor';
  const diretor = papel === 'viewer';
  const tecnico = papel === 'tecnico';
  const treinador = tecnico && funcao === 'Treinador principal';
  switch (pagina) {
    case 'jogadores':
    case 'recrutamento':
    case 'planeamento':
    case 'sugestoes':
    case 'manual':
      return true;
    case 'agenda':
      return editor || diretor || (tecnico && !treinador);
    case 'observacoes':
    case 'controlo':
      return editor || diretor;
    case 'ligas':
    case 'contactos':
      return editor;
    default:
      return false;
  }
}

export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Ao arrancar, pergunta ao servidor quem está autenticado.
  useEffect(() => {
    let vivo = true;
    api
      .get('/auth/me', { silencioso: true })
      .then((u) => vivo && setUtilizador(u))
      .catch(() => vivo && setUtilizador(null))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, []);

  // Se algum pedido devolver 401, limpa a sessão.
  useEffect(() => {
    const aoPerder = () => setUtilizador(null);
    window.addEventListener('scouting:sem-sessao', aoPerder);
    return () => window.removeEventListener('scouting:sem-sessao', aoPerder);
  }, []);

  const login = useCallback(async (username, password) => {
    const u = await api.post('/auth/login', { username, password });
    setUtilizador(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignora */
    }
    setUtilizador(null);
  }, []);

  // Papéis:
  //  - editor  → Scouting (acesso total)
  //  - viewer  → Diretor desportivo (vê quase tudo, só leitura; + sugestões/avaliar plantel)
  //  - tecnico → Equipa técnica (vê um subconjunto; só sugestões/consulta limitada)
  //              O "treinador principal" = tecnico com funcao 'Treinador principal'
  //              (vê o Controlo em leitura).
  const papel = utilizador?.papel;
  const funcao = utilizador?.funcao || '';
  const podeEditar = papel === 'editor';
  const ehDiretor = papel === 'viewer';
  const ehTecnico = papel === 'tecnico';
  const ehTreinador = ehTecnico && funcao === 'Treinador principal';

  // Acesso efetivo por página: overrides da conta (vindos do servidor) + omissão
  // do papel/função. O editor tem sempre tudo (administra a plataforma).
  const overrides = utilizador?.acessos || {};
  const acessos = { home: true, definicoes: true };
  for (const { key } of PAGINAS_ACESSO) {
    acessos[key] = podeEditar
      ? true
      : typeof overrides[key] === 'boolean'
      ? overrides[key]
      : acessoPadrao(papel, funcao, key);
  }
  const podeVer = (pagina) => acessos[pagina] !== false;

  const valor = {
    utilizador,
    carregando,
    login,
    logout,
    autenticado: !!utilizador,
    papel,
    funcao,
    podeEditar,
    ehDiretor,
    ehTecnico,
    ehTreinador,
    acessos,
    podeVer,
    // Visibilidade de páginas (acesso por conta — ver acessos acima).
    veObservacoes: acessos.observacoes,
    veAgenda: acessos.agenda,
    veControlo: acessos.controlo,
    veLigas: acessos.ligas,
    veContactos: acessos.contactos,
    // Comportamentos que continuam a depender do PAPEL (não são dar/tirar página).
    veObsRecentesHome: podeEditar || ehDiretor, // bloco "observações recentes" na Home
    veObsBruto: podeEditar || ehDiretor, // observações em bruto na ficha
    soContratar: ehTecnico, // técnico: só jogadores com veredito "Contratar"
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tem de estar dentro de <AuthProvider>');
  return ctx;
}

// Mostra o conteúdo só a quem pode editar (scouting). Para o clube (viewer)
// nada é renderizado — usado para esconder botões de criar/editar/apagar.
export function SeEditor({ children }) {
  const { podeEditar } = useAuth();
  return podeEditar ? children : null;
}
