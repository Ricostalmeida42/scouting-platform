import { useEffect } from 'react';

export default function Modal({ titulo, aoFechar, children, rodape, largo }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  return (
    <div className="modal-fundo" onMouseDown={aoFechar}>
      <div
        className={'modal' + (largo ? ' modal--largo' : '')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__cabecalho">
          <h3>{titulo}</h3>
          <button className="modal__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal__corpo">{children}</div>
        {rodape && <div className="modal__rodape">{rodape}</div>}
      </div>
    </div>
  );
}
