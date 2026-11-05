// Cliente HTTP mínimo para a API. Usa o proxy do Vite (/api -> :4000).
const BASE = '/api';

async function pedido(caminho, opcoes = {}) {
  const resp = await fetch(BASE + caminho, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin', // envia o cookie de sessão
    ...opcoes,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
  if (!resp.ok) {
    // 401 → sessão caiu/expirou. Avisa a aplicação para voltar ao login.
    if (resp.status === 401 && !opcoes.silencioso) {
      window.dispatchEvent(new CustomEvent('scouting:sem-sessao'));
    }
    let msg = 'Erro no pedido';
    let corpo = null;
    try {
      corpo = await resp.json();
      msg = corpo.erro || corpo.detalhes || msg;
    } catch {
      /* ignore */
    }
    const erro = new Error(msg);
    erro.status = resp.status;
    erro.corpo = corpo;
    throw erro;
  }
  if (resp.status === 204) return null;
  return resp.json();
}

export const api = {
  get: (c, opcoes) => pedido(c, opcoes),
  post: (c, body) => pedido(c, { method: 'POST', body }),
  put: (c, body) => pedido(c, { method: 'PUT', body }),
  patch: (c, body) => pedido(c, { method: 'PATCH', body }),
  del: (c) => pedido(c, { method: 'DELETE' }),
};
