import { api } from './api.js';
import { CATALOGO_POSICAO, GRELHA_PADRAO } from './grelhaPosicao.js';

const CATS = ['tecnica', 'tatica', 'fisica', 'mental'];

// Constrói a grelha ATIVA a partir da config guardada (seleção {k,p} por
// posição/dimensão), buscando os rótulos ao catálogo. Sem config (ou dimensão
// não definida) → usa GRELHA_PADRAO (os itens marcados `d`).
export function construirGrelha(config) {
  if (!config) return GRELHA_PADRAO;
  const rotulo = (pos, cat, k) => (CATALOGO_POSICAO[pos]?.[cat] || []).find((a) => a.k === k)?.l || k;
  const g = {};
  for (const pos of Object.keys(CATALOGO_POSICAO)) {
    g[pos] = {};
    for (const cat of CATS) {
      const sel = config?.[pos]?.[cat];
      if (sel !== undefined) {
        g[pos][cat] = (sel || []).map((it) => ({ k: it.k, l: rotulo(pos, cat, it.k), p: it.p || 2 }));
      } else {
        g[pos][cat] = GRELHA_PADRAO[pos]?.[cat] || [];
      }
    }
  }
  return g;
}

let cache = null;
let aDecorrer = null;

// Carrega a grelha ativa uma vez e guarda em cache (o formulário usa isto).
export async function obterGrelha() {
  if (cache) return cache;
  if (aDecorrer) return aDecorrer;
  aDecorrer = api
    .get('/config-grelha', { silencioso: true })
    .then((cfg) => {
      cache = construirGrelha(cfg);
      return cache;
    })
    .catch(() => {
      cache = GRELHA_PADRAO;
      return cache;
    })
    .finally(() => {
      aDecorrer = null;
    });
  return aDecorrer;
}

export function invalidarGrelha() {
  cache = null;
}
