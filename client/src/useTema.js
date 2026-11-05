import { useState, useEffect, useCallback } from 'react';

// Tema: 'light' | 'dark' | null (segue o sistema). Guardado em localStorage.
// O `data-theme` no <html> sobrepõe-se ao `prefers-color-scheme` (ver index.css).
const CHAVE = 'scouting.tema';
const sistemaEscuro = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

const lerGuardado = () => {
  try {
    const t = localStorage.getItem(CHAVE);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
};

export function useTema() {
  const [tema, setTema] = useState(lerGuardado);

  // Tema efetivo atualmente aplicado.
  const escuro = tema ? tema === 'dark' : sistemaEscuro();

  useEffect(() => {
    const el = document.documentElement;
    if (tema === 'light' || tema === 'dark') el.setAttribute('data-theme', tema);
    else el.removeAttribute('data-theme');
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((atual) => {
      const estaEscuro = atual ? atual === 'dark' : sistemaEscuro();
      const novo = estaEscuro ? 'light' : 'dark';
      try {
        localStorage.setItem(CHAVE, novo);
      } catch {
        /* ignora */
      }
      return novo;
    });
  }, []);

  return { escuro, alternar };
}
