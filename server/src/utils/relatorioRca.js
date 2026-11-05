// Relatório de scouting do jogador — HTML imprimível (guardar como PDF).
// Condensado: cabeçalho + ficha compacta (bio + classificação numa faixa, sem
// grelhas grandes nem código repetido), perfil por dimensão (observações),
// PERFIL DE DADOS (radar Wyscout com valores do jogador + percentis da liga),
// e os campos editáveis (estilo, pontos, conclusão) + lista de observações.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  POSICOES,
  RENDIMENTO_LABEL,
  POTENCIAL_LABEL,
  PERFIL_LABEL,
  AVALIACAO_NIVEL_LABEL,
  IDADE_MAX_POTENCIAL,
  CLUBE_PROPRIO,
} from '../constants.js';

const PASTA_TEMPLATES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../templates');
const MIMES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

export function escudoDataUrl() {
  let imagens;
  try {
    imagens = fs.readdirSync(PASTA_TEMPLATES).filter((f) => MIMES[path.extname(f).toLowerCase()]);
  } catch {
    return null;
  }
  if (imagens.length === 0) return null;
  const preferida = imagens.find((f) => /escudo|logo|emblema|clube/i.test(f)) || imagens.sort()[0];
  const ficheiro = path.join(PASTA_TEMPLATES, preferida);
  const mime = MIMES[path.extname(preferida).toLowerCase()];
  return `data:${mime};base64,${fs.readFileSync(ficheiro).toString('base64')}`;
}

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escMulti = (s) => esc(s).replace(/\n/g, '<br>');
const POS = Object.fromEntries(POSICOES.map((p) => [p.key, p]));
const posCurto = (k) => POS[k]?.curto || k || '—';
const posLabel = (k) => POS[k]?.label || k || '';
const anosDe = (d) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000));
};
const dataPT = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-PT');
};
const VER_COR = { Contratar: '#2e7d5b', 'A acompanhar': '#2b6cb0', 'Nova observação': '#b7791f', 'Não avança': '#a5122a' };
const VER_ABBR = { Contratar: 'C', 'A acompanhar': 'A', 'Nova observação': 'NO', 'Não avança': 'NA' };
const PERFIL_NUM = { tecnico: 1, fisico: 2, misto: 3 };
const DIMS = [['tecnica', 'Técnica'], ['tatica', 'Tática'], ['fisica', 'Física'], ['mental', 'Mental']];

function fmtVal(v, fmt) {
  if (v == null) return '—';
  if (fmt === 'pct') return Math.round(v) + '%';
  if (fmt === 'delta') return (v > 0 ? '+' : '') + Number(v).toFixed(2);
  return Number(v).toFixed(2);
}

const corPct = (p) => (p == null ? '#999' : p >= 70 ? '#2e7d5b' : p >= 40 ? '#b7791f' : '#a5122a');
function duasLinhas(txt) {
  if (txt.length <= 15) return [txt];
  const pals = txt.split(' ');
  if (pals.length < 2) return [txt];
  let melhor = 1, difMin = Infinity;
  for (let i = 1; i < pals.length; i++) {
    const a = pals.slice(0, i).join(' ').length;
    const b = pals.slice(i).join(' ').length;
    if (Math.abs(a - b) < difMin) { difMin = Math.abs(a - b); melhor = i; }
  }
  return [pals.slice(0, melhor).join(' '), pals.slice(melhor).join(' ')];
}

// Radar SVG: percentil do jogador por métrica, só com os NOMES nos eixos.
function radarSvg(eixos) {
  const n = eixos.length;
  const cx = 230;
  const cy = 200;
  const R = 120;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const f = (x) => x.toFixed(1);
  const poly = (r) => eixos.map((_, i) => pt(i, (r / 100) * R).map(f).join(',')).join(' ');
  const shape = eixos.map((e, i) => pt(i, ((e.percentil ?? 0) / 100) * R).map(f).join(',')).join(' ');
  const rings = [25, 50, 75, 100].map((a) => `<polygon points="${poly(a)}" fill="none" stroke="#e3e3e3" stroke-width="1"/>`).join('');
  const axes = eixos.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}" stroke="#e3e3e3"/>`; }).join('');
  const dots = eixos.map((e, i) => { const [x, y] = pt(i, ((e.percentil ?? 0) / 100) * R); return `<circle cx="${f(x)}" cy="${f(y)}" r="2.5" fill="#a5122a"/>`; }).join('');
  const LH = 13; // altura de linha dos rótulos
  const labels = eixos
    .map((e, i) => {
      const [lx, ly] = pt(i, R + 13);
      const c = Math.cos(ang(i));
      const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
      const nomeLinhas = duasLinhas(e.label);
      const y0 = ly - ((nomeLinhas.length - 1) * LH) / 2;
      const tsNome = nomeLinhas.map((ln, k) => `<tspan x="${f(lx)}" y="${f(y0 + k * LH)}">${esc(ln)}</tspan>`).join('');
      return `<text text-anchor="${anchor}" font-size="12.5" font-weight="600" fill="#555">${tsNome}</text>`;
    })
    .join('');
  return `<svg class="rad-svg" viewBox="0 0 460 400">${rings}${axes}` +
    `<polygon points="${shape}" fill="rgba(165,18,42,.18)" stroke="#a5122a" stroke-width="2"/>${dots}${labels}</svg>`;
}

export function gerarRelatorioRca(dados = {}) {
  const j = dados || {};
  const observacoes = Array.isArray(j.observacoes) ? j.observacoes : [];
  const perfis = Array.isArray(j.perfisDados) ? j.perfisDados : [];
  const escudo = escudoDataUrl();
  const idade = anosDe(j.dataNascimento);
  const potOk = idade == null || idade <= IDADE_MAX_POTENCIAL;

  const obsOrd = [...observacoes].sort(
    (a, b) => new Date(b.dataObservacao || b.dataJogo || 0) - new Date(a.dataObservacao || a.dataJogo || 0)
  );

  const aggLinhas = (campo) => {
    const set = new Set();
    obsOrd.forEach((o) =>
      String(o[campo] || '')
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((l) => set.add(l))
    );
    return [...set];
  };
  const fortes = aggLinhas('fortes');
  const fracos = aggLinhas('fracos');
  const estilo = obsOrd.find((o) => o.estiloJogo && o.estiloJogo.trim())?.estiloJogo || '';

  const mediaDim = (key) => {
    const vals = obsOrd.map((o) => o.avaliacao?.[key]).filter((v) => typeof v === 'number' && !Number.isNaN(v));
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };

  const posSec = Array.isArray(j.posicoesSecundarias) ? j.posicoesSecundarias.map(posCurto).join(', ') : '';
  const verCor = VER_COR[j.veredito] || '#666';
  const nivelTxt = (n) => (n != null ? `${n} · ${AVALIACAO_NIVEL_LABEL[n]}` : '—');
  const rating = j.ratingFinal;

  // Ficha compacta: bio + classificação, em chips (sem grelhas grandes).
  const bio = [
    ['Nascimento', j.dataNascimento ? `${dataPT(j.dataNascimento)}${idade != null ? ` (${idade})` : ''}` : '—'],
    ['Nacionalidade', esc(j.nacionalidade) || '—'],
    ['Altura', esc(j.altura) || '—'],
    ['Pé', esc(j.pePreferencial) || '—'],
    ['Liga', esc(j.liga) || '—'],
    ['Fim contrato', j.fimContrato ? dataPT(j.fimContrato) : '—'],
    ['Agente', esc(j.agente) || '—'],
  ];
  const bioList = (arr) => arr.map(([k, v]) => `<div class="bio-item"><span class="bio-k">${k}</span><span class="bio-v">${v}</span></div>`).join('');

  // Código (identificador compacto): Veredito · Rend · Pot · Perfil (1/2/3) · Imed · Médio · Longo
  const codigo = [
    VER_ABBR[j.veredito] || '–',
    j.rendimento || '–',
    potOk ? j.potencialClass || '–' : '–',
    PERFIL_NUM[j.perfil] ?? '–',
    j.avaliacaoImediata ?? '–',
    j.avaliacaoMedioPrazo ?? '–',
    j.avaliacaoLongoPrazo ?? '–',
  ].join(' ');

  // Perfil por dimensão — inline compacto.
  const dimInline = DIMS.map(([k, l]) => {
    const v = mediaDim(k);
    return `<span class="dimc"><b>${l}</b> ${v != null ? v.toFixed(1) : '—'}</span>`;
  }).join('');

  const dadosHtml = perfis.length
    ? perfis.map((p) => `<div class="rad-bloco"><div class="rad-wrap">${radarSvg(p.eixos)}</div></div>`).join('')
    : '';

  const fichaBloco = `<div class="bio">${bioList(bio)}</div>
    <div class="dimrow"><span class="dimrow-l">Perfil por dimensão <span class="dimrow-obs">· ${obsOrd.length} obs.</span></span>${dimInline}</div>`;

  const listaPts = (arr, sinal) =>
    arr.length
      ? `<ul class="pts">${arr.map((l) => `<li><span class="sin">${sinal}</span>${esc(l)}</li>`).join('')}</ul>`
      : '<span class="ph">—</span>';

  return `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório · ${esc(j.nomeCompleto) || 'Jogador'}</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; background:#f3f4f6; color:#1a1a1a; font-family:'Segoe UI',Arial,sans-serif; font-size:13px; line-height:1.5; }
  .btn-pdf { position:fixed; top:16px; right:16px; z-index:10; background:#a5122a; color:#fff; border:none; padding:9px 16px; font-size:13px; font-weight:700; cursor:pointer; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,.2); }
  .btn-pdf:hover { background:#86101f; }
  .folha { position:relative; max-width:820px; min-height:1160px; margin:24px auto; background:#fff; padding:28px 34px; box-shadow:0 2px 14px rgba(0,0,0,.12); }

  /* Marcador de fim da página A4 (só no ecrã, guia de edição) */
  .a4-marca { position:absolute; left:0; right:0; top:1131px; border-top:2px dashed #c9302c; pointer-events:none; }
  .a4-marca span { position:absolute; right:8px; top:-9px; background:#fff; padding:0 8px; font-size:9.5px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#c9302c; }
  .a4-marca small { position:absolute; left:8px; top:-8px; background:#fff; padding:0 8px; font-size:9px; color:#bbb; }

  .topo { display:flex; align-items:center; gap:14px; border-bottom:3px solid #a5122a; padding-bottom:10px; }
  .escudo { height:46px; width:auto; }
  .clube { font-weight:800; font-size:15px; letter-spacing:.4px; }
  .tipo { color:#a5122a; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:1.4px; }
  .data { color:#777; font-size:12px; }
  .topo-txt { flex:1; }

  .ident { display:flex; gap:16px; align-items:center; margin:16px 0 14px; }
  .foto { width:72px; height:72px; object-fit:cover; border-radius:6px; border:1px solid #ddd; flex:0 0 auto; }
  .foto--v { background:#eee; }
  .ident-main { flex:1; min-width:0; }
  .ident-main h1 { margin:0; font-size:26px; line-height:1.08; }
  .sub { color:#555; font-size:13.5px; margin-top:3px; }
  .veredito-box { text-align:right; flex:0 0 auto; }
  .veredito { display:inline-block; background:var(--c); color:#fff; font-weight:700; font-size:12px; padding:4px 13px; border-radius:999px; white-space:nowrap; }
  .rating { margin-top:10px; line-height:1; }
  .rating b { font-size:30px; font-weight:800; }
  .rating span { font-size:14px; color:#999; }
  .rating small { display:block; font-size:9px; text-transform:uppercase; letter-spacing:1.2px; color:#aaa; margin-top:2px; }

  /* Bio — pares etiqueta/valor, sem caixa */
  .bio { display:grid; grid-template-columns:1fr 1fr; gap:8px 22px; }
  .bio-item { display:flex; flex-direction:column; gap:1px; border-bottom:1px solid #eee; padding-bottom:5px; }
  .bio-k { color:#9a9a9a; font-weight:600; font-size:9.5px; text-transform:uppercase; letter-spacing:.4px; }
  .bio-v { font-weight:600; font-size:13px; }

  .codigo { margin-top:6px; font-family:'Consolas','Courier New',monospace; font-weight:700; letter-spacing:1.5px; font-size:13px; color:#a5122a; }

  h2 { font-size:11.5px; text-transform:uppercase; letter-spacing:.7px; color:#a5122a; border-bottom:1px solid #eee; padding-bottom:4px; margin:16px 0 9px; }
  h2 small { color:#aaa; font-weight:400; text-transform:none; letter-spacing:0; }

  .dimrow { display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 14px; margin-top:12px; padding-top:10px; border-top:1px solid #eee; }
  .dimrow-l { font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#a5122a; font-weight:700; }
  .dimrow-obs { color:#aaa; font-weight:400; text-transform:none; letter-spacing:0; }
  .dimc { font-size:12.5px; }
  .dimc b { color:#999; font-weight:600; margin-right:2px; }

  /* Corpo: bio (esq.) + perfil de dados (dir.) lado a lado */
  .corpo2 { display:grid; grid-template-columns:1fr 1fr; gap:22px; align-items:center; margin:16px 0 4px; }
  .corpo2-r { min-width:0; }

  /* Perfil de dados */
  .rad-bloco { margin-bottom:6px; }
  .rad-wrap { text-align:center; }
  .rad-svg { width:100%; max-width:360px; height:auto; display:block; margin:0 auto; }

  .edit { border:1px dashed #cbced3; min-height:38px; padding:8px 11px; border-radius:4px; }
  .edit--alta { min-height:54px; }
  .edit:focus { outline:none; border:1px solid #a5122a; box-shadow:0 0 0 3px #a5122a22; }
  .ph { color:#b5b5b5; }
  .pts { margin:0; padding:0; list-style:none; }
  .pts li { padding:2px 0; }
  .sin { display:inline-block; width:16px; font-weight:800; color:#a5122a; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .grid2 > div > h2 { margin-top:0; }

  @media print {
    body { background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .folha { box-shadow:none; margin:0; max-width:none; min-height:0; padding:0; }
    .noprint { display:none !important; }
    .edit { border-color:#ddd; min-height:0; }
    .edit:focus { box-shadow:none; }
    h2 { margin-top:14px; }
    section, .rad-bloco { page-break-inside:avoid; }
    @page { margin:12mm; }
  }
</style>
</head><body>
<button class="btn-pdf noprint" onclick="window.print()">Imprimir / Guardar PDF</button>
<div class="folha">
  <div class="a4-marca noprint" aria-hidden="true"><small>↑ cabe numa página A4</small><span>fim da página A4</span></div>
  <header class="topo">
    ${escudo ? `<img class="escudo" src="${escudo}" alt="">` : ''}
    <div class="topo-txt"><div class="clube">${CLUBE_PROPRIO}</div><div class="tipo">Relatório de Scouting</div></div>
    <div class="data">${new Date().toLocaleDateString('pt-PT')}</div>
  </header>

  <section class="ident">
    ${j.foto && /^https?:\/\//i.test(j.foto) ? `<img class="foto" src="${esc(j.foto)}" alt="">` : '<div class="foto foto--v"></div>'}
    <div class="ident-main">
      <h1>${esc(j.nomeCompleto) || '—'}</h1>
      <div class="sub">${posLabel(j.posicaoPrincipal)}${posSec ? ` · ${posSec}` : ''}${j.clubeAtual ? ` · ${esc(j.clubeAtual)}` : ''}${idade != null ? ` · ${idade} anos` : ''}</div>
      <div class="codigo" title="Veredito · Rendimento · Potencial · Perfil (1 téc/2 fís/3 misto) · Aval. imediata/médio/longo">${esc(codigo)}</div>
    </div>
    <div class="veredito-box">
      <span class="veredito" style="--c:${verCor}">${esc(j.veredito) || 'Sem veredito'}</span>
      <div class="rating"><b>${rating != null ? Number(rating).toFixed(1) : '—'}</b><span> / 5</span><small>rating médio</small></div>
    </div>
  </section>

  ${dadosHtml
    ? `<section class="corpo2">
    <div class="corpo2-l">${fichaBloco}</div>
    <div class="corpo2-r">${dadosHtml}</div>
  </section>`
    : `<section>${fichaBloco}</section>`}

  <section>
    <h2>Estilo de jogo</h2>
    <div class="edit" contenteditable="true">${estilo ? escMulti(estilo) : '<span class="ph">Como joga o atleta…</span>'}</div>
  </section>

  <section class="grid2">
    <div><h2>Pontos fortes</h2><div class="edit" contenteditable="true">${listaPts(fortes, '+')}</div></div>
    <div><h2>Pontos fracos</h2><div class="edit" contenteditable="true">${listaPts(fracos, '−')}</div></div>
  </section>

  <section>
    <h2>Conclusão / Recomendação</h2>
    <div class="edit edit--alta" contenteditable="true"><span class="ph">Síntese e recomendação final…</span></div>
  </section>
</div>
</body></html>`;
}
