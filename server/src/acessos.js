// Acesso por CONTA às páginas da plataforma. O papel (editor/viewer/tecnico +
// função) dá os valores POR OMISSÃO; cada conta pode ter overrides em
// `User.acessos` ({ pagina: true|false }). `home` é sempre acessível (aterragem).

export const PAGINAS = [
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

// Valor por omissão de uma página para um papel/função.
export function acessoPadrao(papel, funcao, pagina) {
  const editor = papel === 'editor';
  const diretor = papel === 'viewer';
  const tecnico = papel === 'tecnico';
  const treinador = tecnico && funcao === 'Treinador principal';
  switch (pagina) {
    case 'home':
    case 'manual':
    case 'jogadores':
    case 'recrutamento':
    case 'planeamento':
    case 'sugestoes':
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

// Mapa efetivo de acessos de uma conta (omissão do papel + overrides guardados).
export function acessosEfetivos(user) {
  const ov = user?.acessos || {};
  const m = { home: true };
  for (const { key } of PAGINAS) {
    m[key] = typeof ov[key] === 'boolean' ? ov[key] : acessoPadrao(user?.papel, user?.funcao, key);
  }
  return m;
}

// A conta pode aceder a esta página?
export function podeAceder(user, pagina) {
  if (!user) return false;
  if (pagina === 'home') return true;
  const ov = user.acessos || {};
  if (typeof ov[pagina] === 'boolean') return ov[pagina];
  return acessoPadrao(user.papel, user.funcao, pagina);
}
