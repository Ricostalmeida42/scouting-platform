import { createContext, useCallback, useContext, useState } from 'react';

const ToastCtx = createContext(() => {});

// useToast() -> toast(mensagem, tipo) com tipo: 'ok' | 'erro' | 'info'
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [lista, setLista] = useState([]);

  const remover = useCallback((id) => setLista((l) => l.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (mensagem, tipo = 'info') => {
      const id = Math.random().toString(36).slice(2);
      setLista((l) => [...l, { id, mensagem, tipo }]);
      setTimeout(() => remover(id), tipo === 'erro' ? 6000 : 4000);
    },
    [remover]
  );

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts">
        {lista.map((t) => (
          <div
            key={t.id}
            className={'toast toast--' + t.tipo}
            onClick={() => remover(t.id)}
            role="status"
            title="Clica para fechar"
          >
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
