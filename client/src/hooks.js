import { useState, useEffect } from 'react';

// Devolve true quando o ecrã é estreito (telemóvel). Reage a mudanças de tamanho.
export function useEhTelemovel(larguraMax = 560) {
  const consulta = `(max-width: ${larguraMax}px)`;
  const [eh, setEh] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(consulta).matches
      : false
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(consulta);
    const aoMudar = (e) => setEh(e.matches);
    setEh(mq.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, [consulta]);
  return eh;
}
