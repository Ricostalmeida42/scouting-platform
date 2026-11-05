import { useTema } from '../useTema.js';

// Switch claro/escuro (quadrado, segue o design linear da app).
export default function TemaSwitch() {
  const { escuro, alternar } = useTema();
  return (
    <button
      type="button"
      className={'tema-switch' + (escuro ? ' tema-switch--escuro' : '')}
      onClick={alternar}
      role="switch"
      aria-checked={escuro}
      aria-label="Alternar tema claro ou escuro"
      title={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
    >
      <span className="tema-switch__icone tema-switch__sol" aria-hidden="true">☀</span>
      <span className="tema-switch__icone tema-switch__lua" aria-hidden="true">☾</span>
      <span className="tema-switch__knob" aria-hidden="true" />
    </button>
  );
}
