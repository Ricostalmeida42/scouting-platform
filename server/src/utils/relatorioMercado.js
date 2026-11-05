// Relatório de MERCADO (pré-janela) — HTML imprimível (A4 landscape, guardar como PDF).
//
// Documento para a direção desportiva: os alvos de recrutamento organizados POR
// POSIÇÃO, com a avaliação (rendimento/potencial/perfil/nível projetado/rating),
// a situação contratual, a informação financeira conhecida e o estado da
// informação (nº de observações + última). Lê os dados que já existem na base —
// não pede nada de novo. É a "Etapa 6/8" da proposta, em papel.
import { escudoDataUrl } from './relatorioRca.js';
import {
  POSICOES,
  RENDIMENTO_LABEL,
  POTENCIAL_LABEL,
  PERFIL_LABEL,
  CLUBE_PROPRIO,
} from '../constants.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const pad = (n) => String(n).padStart(2, '0');
const dataPT = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};
const anosDe = (d) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000));
};

// Situação contratual compacta: data + "livre" / "<6m" quando relevante.
function sitContrato(fim) {
  if (!fim) return { txt: '—', classe: '' };
  const d = new Date(fim);
  if (Number.isNaN(d.getTime())) return { txt: '—', classe: '' };
  const meses = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.4);
  const ds = dataPT(fim);
  if (meses <= 0) return { txt: ds + ' · livre', classe: 'c-livre' };
  if (meses <= 6) return { txt: ds + ' · <6m', classe: 'c-curto' };
  return { txt: ds, classe: '' };
}

const valorFmt = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-PT') + ' €');
const nivel = (v) => (v == null || v === '' ? '·' : String(v));

// Prioridade do veredito para ordenar dentro da posição.
const PRIOR = { Contratar: 0, 'A acompanhar': 1, 'Nova observação': 2 };
const VER_CLASSE = {
  Contratar: 'v-contratar',
  'A acompanhar': 'v-acompanhar',
  'Nova observação': 'v-nova',
};

const POS = Object.fromEntries(POSICOES.map((p) => [p.key, p]));

// jogadores: array de Player (JSON). obsPorJogador: { [id]: { n, ultima } }.
export function gerarRelatorioMercado({ jogadores = [], obsPorJogador = {}, geradoEm = new Date() } = {}) {
  const escudo = escudoDataUrl();

  // Agrupa por posição principal, na ordem do modelo (POSICOES).
  const porPos = new Map(POSICOES.map((p) => [p.key, []]));
  for (const j of jogadores) {
    const k = j.posicaoPrincipal;
    if (!porPos.has(k)) porPos.set(k, []);
    porPos.get(k).push(j);
  }
  // Ordena cada posição: veredito (Contratar→) e depois rating desc.
  for (const lista of porPos.values()) {
    lista.sort((a, b) => {
      const pa = PRIOR[a.veredito] ?? 9;
      const pb = PRIOR[b.veredito] ?? 9;
      if (pa !== pb) return pa - pb;
      return (b.ratingFinal ?? 0) - (a.ratingFinal ?? 0);
    });
  }

  const total = jogadores.length;
  const nPorVer = (v) => jogadores.filter((j) => j.veredito === v).length;

  const linhaJogador = (j) => {
    const idade = anosDe(j.dataNascimento);
    const sc = sitContrato(j.fimContrato);
    const o = obsPorJogador[String(j._id)] || {};
    const cond = (j.condicoesContratuais || '').trim();
    const nivelTxt = `${nivel(j.avaliacaoImediata)} · ${nivel(j.avaliacaoMedioPrazo)} · ${nivel(j.avaliacaoLongoPrazo)}`;
    return `
    <tr>
      <td class="nome">
        <b>${esc(j.nomeCompleto)}</b>${idade != null ? ` <span class="idade">${idade}a</span>` : ''}
        ${cond ? `<div class="cond">${esc(cond)}</div>` : ''}
      </td>
      <td>${esc(j.clubeAtual || '—')}${j.liga ? `<div class="sub">${esc(j.liga)}</div>` : ''}</td>
      <td class="c"><span class="ver ${VER_CLASSE[j.veredito] || ''}">${esc(j.veredito || '—')}</span></td>
      <td class="c">${esc(RENDIMENTO_LABEL[j.rendimento] || '—')}</td>
      <td class="c">${esc(POTENCIAL_LABEL[j.potencialClass] || '—')}</td>
      <td class="c">${esc(PERFIL_LABEL[j.perfil] || '—')}</td>
      <td class="c nivel" title="Imediato · Médio · Longo prazo (1 Distrital … 5 Profissionais)">${nivelTxt}</td>
      <td class="c forte">${j.ratingFinal != null ? j.ratingFinal.toFixed(1) : '—'}</td>
      <td class="c ${sc.classe}">${sc.txt}</td>
      <td class="c forte">${valorFmt(j.valorEstimado)}</td>
      <td class="c">${esc(j.potencialValorizacao || '—')}</td>
      <td class="c obs">${o.n ? `${o.n}${o.ultima ? `<div class="sub">últ. ${dataPT(o.ultima)}</div>` : ''}` : '<span class="semobs">0</span>'}</td>
    </tr>`;
  };

  const secoes = [...porPos.entries()]
    .filter(([, lista]) => lista.length > 0)
    .map(([k, lista]) => {
      const nContr = lista.filter((j) => j.veredito === 'Contratar').length;
      return `
      <section class="pos">
        <div class="pos-hd">${esc((POS[k] && POS[k].label) || k)}
          <span>${lista.length} alvo${lista.length === 1 ? '' : 's'}${nContr ? ` · ${nContr} a contratar` : ''}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Jogador</th><th>Clube</th><th class="c">Veredito</th>
              <th class="c">Rend.</th><th class="c">Pot.</th><th class="c">Perfil</th>
              <th class="c">Nível I·M·L</th><th class="c">Rating</th>
              <th class="c">Fim contrato</th><th class="c">Valor est.</th><th class="c">Valoriz.</th><th class="c">Obs.</th>
            </tr>
          </thead>
          <tbody>${lista.map(linhaJogador).join('')}</tbody>
        </table>
      </section>`;
    })
    .join('');

  const corpo = total
    ? secoes
    : `<div class="vazio">Sem alvos com veredito definido (Contratar, A acompanhar ou Nova observação).</div>`;

  return `<!doctype html>
<html lang="pt"><head><meta charset="utf-8">
<title>Relatório de mercado — ${CLUBE_PROPRIO}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; }
  body { font-family: Arial, Helvetica, sans-serif; color:#000; font-size:9.5px; line-height:1.3; background:#f2f3f5; }

  .barra { position:sticky; top:0; z-index:5; background:#16181d; color:#fff;
    padding:10px 14px; display:flex; align-items:center; gap:14px; flex-wrap:wrap; font-size:12.5px; }
  .barra strong { font-size:13px; letter-spacing:0.03em; }
  .barra button { font:inherit; background:#a5122a; color:#fff; border:0; padding:7px 16px; border-radius:5px; cursor:pointer; font-weight:700; }
  .barra .dica { margin-left:auto; color:#98a0ac; font-size:11.5px; }
  @media print { body { background:#fff; } .barra { display:none; } .pg { margin:0; box-shadow:none; } }

  .pg { width:297mm; min-height:210mm; padding:9mm 11mm; margin:10px auto; background:#fff;
    box-shadow:0 2px 10px rgba(0,0,0,0.18); }

  .topo { display:flex; align-items:center; gap:12px; border-bottom:2.5px solid #000; padding-bottom:6px; margin-bottom:8px; }
  .topo img { width:40px; height:40px; object-fit:contain; }
  .topo h1 { font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif; font-size:24px; font-weight:800;
    margin:0; letter-spacing:0.04em; text-transform:uppercase; line-height:1; }
  .topo-sub { font-size:8px; letter-spacing:0.14em; text-transform:uppercase; color:#5a5a5a; margin-top:3px; }
  .topo-dir { margin-left:auto; text-align:right; font-size:8px; letter-spacing:0.12em; text-transform:uppercase; color:#5a5a5a; }
  .topo-dir b { display:block; font-family:'Barlow Condensed',Arial,sans-serif; font-size:12px; letter-spacing:0.06em; color:#000; }

  .resumo { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:10px; font-size:10px; }
  .resumo .tot { font-weight:700; font-size:11px; }
  .resumo .legenda { margin-left:auto; color:#6a6a6a; font-size:8.5px; letter-spacing:0.03em; }

  section.pos { margin-bottom:12px; break-inside:avoid; }
  .pos-hd { font-family:'Barlow Condensed',Arial,sans-serif; font-weight:700; font-size:13px; text-transform:uppercase;
    letter-spacing:0.04em; border-bottom:1.5px solid #000; padding-bottom:2px; margin-bottom:4px; }
  .pos-hd span { font-family:Arial,sans-serif; font-weight:400; font-size:9px; text-transform:none; color:#6a6a6a; margin-left:8px; }

  table { width:100%; border-collapse:collapse; }
  th { text-align:left; font-size:7.5px; text-transform:uppercase; letter-spacing:0.04em; color:#5a5a5a;
    border-bottom:1px solid #cfcfcf; padding:3px 5px; white-space:nowrap; }
  td { padding:4px 5px; border-bottom:1px solid #e7e7e7; vertical-align:top; }
  td.c, th.c { text-align:center; }
  td.nome b { font-size:10.5px; }
  td .idade { color:#6a6a6a; font-weight:400; }
  td .sub { font-size:7.5px; color:#8a8a8a; }
  td .cond { font-size:8px; color:#555; font-style:italic; margin-top:1px; max-width:230px; }
  td.forte { font-weight:700; }
  td.nivel { font-variant-numeric:tabular-nums; white-space:nowrap; }
  td.c-livre { color:#1b7f3b; font-weight:700; }
  td.c-curto { color:#b8860b; font-weight:700; }
  td.obs .semobs { color:#b23; font-weight:700; }

  .ver { display:inline-block; font-size:8px; font-weight:700; padding:1px 6px; border-radius:10px; white-space:nowrap; }
  .v-contratar { background:#e4f4ea; color:#1b7f3b; }
  .v-acompanhar { background:#e6effd; color:#1f6feb; }
  .v-nova { background:#fbf2dd; color:#9a6b00; }

  .vazio { padding:40px; text-align:center; color:#8a8a8a; font-size:12px; }
  .rodape { margin-top:14px; border-top:1px solid #cfcfcf; padding-top:5px; font-size:8px; color:#8a8a8a; letter-spacing:0.04em; }
</style>
</head>
<body>
  <div class="barra">
    <strong>Relatório de mercado</strong>
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
    <span class="dica">Documento confidencial · dados do momento</span>
  </div>
  <div class="pg">
    <div class="topo">
      ${escudo ? `<img src="${escudo}" alt="">` : ''}
      <div>
        <h1>Relatório de mercado</h1>
        <div class="topo-sub">${CLUBE_PROPRIO} · Scouting · Alvos por posição</div>
      </div>
      <div class="topo-dir"><b>${dataPT(geradoEm)}</b>Confidencial</div>
    </div>
    <div class="resumo">
      <span class="tot">${total} alvo${total === 1 ? '' : 's'}</span>
      <span>${nPorVer('Contratar')} a contratar</span>
      <span>${nPorVer('A acompanhar')} a acompanhar</span>
      <span>${nPorVer('Nova observação')} nova observação</span>
      <span class="legenda">Nível projetado 1 Distrital · 2 CP baixo · 3 Nível do clube · 4 Liga 3 · 5 Profissionais (Imediato · Médio · Longo prazo)</span>
    </div>
    ${corpo}
    <div class="rodape">Gerado pela plataforma de scouting do ${CLUBE_PROPRIO} · Informação financeira e contratual estimada, a confirmar · Confidencial</div>
  </div>
</body></html>`;
}
