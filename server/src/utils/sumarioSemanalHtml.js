// Página HTML imprimível do sumário semanal (Relatório Semanal de Scouting).
// Segue a mesma lógica do relatório do jogador: o utilizador abre a página e
// usa "Guardar PDF / Imprimir" do browser — sem biblioteca de PDF no servidor.
import { POSICOES, CLUBE_PROPRIO } from '../constants.js';

const POS = Object.fromEntries(POSICOES.map((p) => [p.key, p.curto || p.key]));
const pos = (k) => POS[k] || k || '—';
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const dataPT = (d) => (d ? new Date(d).toLocaleDateString('pt-PT') : '');
const dataLonga = (d) =>
  d ? new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

function seccao(titulo, n, linhasHtml, vazio) {
  return (
    `<section class="sec"><h2>${esc(titulo)} <span class="n">${n}</span></h2>` +
    (linhasHtml || `<p class="vazio">${esc(vazio)}</p>`) +
    `</section>`
  );
}

export function sumarioSemanalHtml(s, escudo) {
  const observados = s.observados.length
    ? '<ul class="lista">' +
      s.observados
        .map((o) => {
          const extra = [
            o.adversario ? `vs ${esc(o.adversario)}` : null,
            o.competicao ? esc(o.competicao) : null,
            dataPT(o.dataJogo),
            o.rating != null ? `Rating ${o.rating}` : null,
            o.veredito ? esc(o.veredito) : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return `<li><b>${esc(o.jogador)}</b> <span class="pos">${esc(pos(o.posicao))}</span> — ${extra}</li>`;
        })
        .join('') +
      '</ul>'
    : null;

  const novos = s.novosAlvos.length
    ? '<ul class="lista">' +
      s.novosAlvos
        .map(
          (p) =>
            `<li><b>${esc(p.jogador)}</b> <span class="pos">${esc(pos(p.posicao))}</span>${p.veredito ? ' · ' + esc(p.veredito) : ''}</li>`
        )
        .join('') +
      '</ul>'
    : null;

  const jogos = s.jogos.length
    ? '<ul class="lista">' +
      s.jogos
        .map((j) => {
          const t = [j.jogador || j.adversario || 'Jogo', j.competicao ? esc(j.competicao) : null, dataPT(j.dataJogo)]
            .filter(Boolean)
            .join(' · ');
          return `<li>${esc(t)}</li>`;
        })
        .join('') +
      '</ul>'
    : null;

  return `<!doctype html>
<html lang="pt"><head><meta charset="utf-8">
<title>Relatório Semanal de Scouting — ${CLUBE_PROPRIO}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;background:#e7ebf0;}
  .toolbar{position:sticky;top:0;background:#0d1b2a;padding:10px 20px;display:flex;justify-content:flex-end;gap:10px;z-index:10;}
  .toolbar button{font:inherit;font-weight:600;font-size:13px;border:none;border-radius:5px;padding:8px 16px;cursor:pointer;background:#a5122a;color:#fff;}
  .page{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:22mm 18mm;box-shadow:0 4px 24px rgba(0,0,0,.12);}
  .topo{display:flex;align-items:center;gap:14px;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:6px;}
  .topo img{width:52px;height:52px;object-fit:contain;}
  .topo .clube{font-weight:800;font-size:16px;letter-spacing:.04em;text-transform:uppercase;}
  .topo .dep{font-size:11px;color:#555;}
  .topo .dir{margin-left:auto;text-align:right;}
  .topo .dir .tit{font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.03em;}
  .topo .dir .per{font-size:11px;color:#555;}
  .resumo{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:#333;margin:12px 0 18px;padding:8px 0;border-bottom:1px solid #ccc;}
  .resumo b{font-size:16px;color:#000;margin-right:4px;}
  .sec{margin-bottom:16px;break-inside:avoid;}
  .sec h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:6px;}
  .sec h2 .n{float:right;color:#777;font-weight:600;}
  .lista{list-style:none;}
  .lista li{font-size:12.5px;line-height:1.6;padding:2px 0 2px 12px;position:relative;border-bottom:1px solid #f0f0f0;}
  .lista li::before{content:'•';position:absolute;left:0;color:#a5122a;}
  .pos{display:inline-block;font-size:10px;font-weight:700;color:#a5122a;border:1px solid #a5122a;border-radius:3px;padding:0 4px;margin:0 2px;}
  .quando{color:#777;font-size:11px;}
  .vazio{font-size:12px;color:#999;font-style:italic;padding:2px 0;}
  .rodape{margin-top:22px;padding-top:8px;border-top:1px solid #000;font-size:10px;color:#777;display:flex;justify-content:space-between;}
  @page{size:A4;margin:0;}
  @media print{
    body{background:#fff;}
    .toolbar{display:none;}
    .page{margin:0;box-shadow:none;width:auto;min-height:auto;}
  }
</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">🖨 Guardar PDF / Imprimir</button></div>
  <div class="page">
    <div class="topo">
      ${escudo ? `<img src="${escudo}" alt="${CLUBE_PROPRIO}">` : ''}
      <div><div class="clube">${CLUBE_PROPRIO}</div><div class="dep">Departamento de Scouting</div></div>
      <div class="dir"><div class="tit">Relatório Semanal</div>
      <div class="per">${dataLonga(s.periodo.de)} a ${dataLonga(s.periodo.a)}</div></div>
    </div>
    <div class="resumo">
      <span><b>${s.totais.jogadoresObservados}</b>observados</span>
      <span><b>${s.totais.novosAlvos}</b>novos alvos</span>
      <span><b>${s.totais.jogosProximos}</b>jogos a observar</span>
    </div>
    ${seccao('Observados', `${s.totais.observacoes} jogo(s)`, observados, 'Nenhum jogo observado esta semana.')}
    ${seccao('Novos alvos', s.totais.novosAlvos, novos, 'Nenhum alvo novo esta semana.')}
    ${seccao('Jogos a observar (próximos 7 dias)', s.totais.jogosProximos, jogos, 'Nenhum jogo agendado.')}
    <div class="rodape"><span>${CLUBE_PROPRIO} · Departamento de Scouting</span><span>Gerado em ${dataLonga(s.periodo.a)}</span></div>
  </div>
</body></html>`;
}
