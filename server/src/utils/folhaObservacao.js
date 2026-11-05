// Folha de OBSERVAÇÃO para preencher à MÃO ao vivo no jogo (imprimível, A4, P&B).
//
// UMA página. É um bloco de NOTAS, não uma avaliação: não tem notas 1-10, nem
// síntese, nem decisão — isso é trabalho de casa, feito depois na plataforma.
// O que tem é toda a matéria-prima que o relatório depois precisa, já arrumada
// pela linguagem do modelo de jogo (momentos) para a passagem a relatório ser
// direta: contexto → registo ao vivo → estilo por momentos → técnica/física/mental.
import { escudoDataUrl } from './relatorioRca.js';
import { CLUBE_PROPRIO } from '../constants.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const rotuloPos = (keys) => (Array.isArray(keys) && keys.length ? keys.join(' / ') : '');

// n linhas em branco para escrever à mão.
const linhas = (n) => Array.from({ length: n }, () => '<div class="wl"></div>').join('');

// Escala numérica para circular à mão (nível do adversário, 1-5 como no modelo).
const escala = (max) =>
  '<span class="escala">' +
  Array.from({ length: max }, (_, i) => `<b>${i + 1}</b>`).join('') +
  '</span>';

// Quadrado para assinalar.
const chk = (txt) => `<span class="chk"></span>${txt}`;

// Posições da plataforma (POSICAO_KEYS) — circula-se a que ele fez NO JOGO.
const POS_CURTAS = ['GR', 'DD', 'DC', 'DE', 'MDF', 'MC', 'MOF', 'EE', 'ED', 'PL'];

// Fases do jogo para descrever o estilo ao vivo — simplificado para o essencial:
// o que faz COM bola e o que faz SEM bola (mais direto que os 4 momentos táticos).
const FASES = ['Com bola', 'Sem bola'];

// O que sobra do jogo e não é tático — sem nota, só o que se viu.
const OUTRAS = ['Técnica', 'Física', 'Mental'];

// Caixa de notas: título e linhas para escrever à mão. Com `duas`, o corpo
// parte-se em duas colunas — o que jogou a favor (+) e o que ficou por resolver (−).
function bloco(nome, n, duas = false) {
  const corpo = duas
    ? `<div class="bl-2col">
        <div><div class="bl-sinal">+</div>${linhas(n)}</div>
        <div><div class="bl-sinal">−</div>${linhas(n)}</div>
      </div>`
    : linhas(n);
  return `
  <div class="bl">
    <div class="bl-hd">${nome}</div>
    ${corpo}
  </div>`;
}

// Coluna do registo ao vivo: minuto | o que aconteceu.
function colunaAoVivo(titulo, n) {
  const linha = '<div class="av-l"><span class="av-min"></span><span class="av-txt"></span></div>';
  return (
    `<div class="av-col"><div class="av-hd"><span>${titulo}</span><em>min.</em></div>` +
    Array.from({ length: n }, () => linha).join('') +
    '</div>'
  );
}

// dd/mm/aaaa a partir de uma data (Date/string) — vazio se não houver.
const dataPT = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
};

export function gerarFolhaObservacao(jogador = null, jogo = null) {
  const escudo = escudoDataUrl();
  const nome = jogador ? esc(jogador.nomeCompleto) : '';
  const secundarias = jogador ? rotuloPos(jogador.posicoesSecundarias) : '';
  const pos = jogador
    ? esc(secundarias ? `${jogador.posicaoPrincipal} (${secundarias})` : jogador.posicaoPrincipal || '')
    : '';
  const clube = jogador ? esc([jogador.clubeAtual, jogador.liga].filter(Boolean).join(' — ')) : '';
  const nasc = jogador?.dataNascimento ? esc(new Date(jogador.dataNascimento).getFullYear()) : '';
  const pe = jogador ? esc(jogador.pePreferencial || '') : '';
  const num = jogador ? esc(jogador.numero || '') : '';
  const altura = jogador ? esc(jogador.altura || '') : '';

  // Dados do JOGO (pré-preenchidos quando vêm da Agenda; senão ficam em branco).
  const jData = jogo ? esc([dataPT(jogo.data), jogo.hora].filter(Boolean).join(' · ')) : '';
  const jComp = jogo ? esc(jogo.competicao || '') : '';
  const jJogo = jogo ? esc(jogo.jogo || '') : '';
  const jAdv = jogo ? esc(jogo.adversario || '') : '';

  // Campo do cabeçalho: valor pré-preenchido OU linha em branco para a mão.
  const campo = (valor, largura = '30mm') =>
    valor ? `<span class="v">${valor}</span>` : `<span class="v vazio" style="min-width:${largura}"></span>`;

  return `<!doctype html>
<html lang="pt"><head><meta charset="utf-8">
<title>Folha de Observação${nome ? ' — ' + nome : ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  /* Margem da página a ZERO de propósito: sem margem, o browser não tem onde
     desenhar o cabeçalho/rodapé dele (data, título, caminho, n.º de página).
     As margens reais da folha passam a ser o padding de .pg. */
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  :root {
    --risco: #9a9a9a;      /* linhas de escrita — cinzento leve em papel */
    --fraco: #5a5a5a;      /* rótulos e pistas */
  }
  html, body { margin:0; padding:0; }
  body { font-family: Arial, Helvetica, sans-serif; color:#000;
    font-size:10.5px; line-height:1.3; background:#f2f3f5; }

  /* ---------- barra de impressão (nunca sai no papel) ---------- */
  .barra { position:sticky; top:0; z-index:5; background:#16181d; color:#fff;
    padding:10px 14px; display:flex; align-items:center; gap:14px; flex-wrap:wrap; font-size:12.5px; }
  .barra strong { font-size:13px; letter-spacing:0.03em; }
  .barra input { width:62px; font:inherit; padding:5px 7px; border:1px solid #444;
    background:#0f1115; color:#fff; border-radius:4px; text-align:center; }
  .barra button { font:inherit; background:#a5122a; color:#fff; border:0; padding:7px 16px;
    border-radius:5px; cursor:pointer; font-weight:700; }
  .barra button.sec { background:#2a2e37; }
  .barra .dica { margin-left:auto; color:#98a0ac; font-size:11.5px; }

  /* ---------- página ---------- */
  .pg { width:210mm; min-height:297mm; padding:8mm 11mm; margin:10px auto; background:#fff;
    display:flex; flex-direction:column; box-shadow:0 2px 10px rgba(0,0,0,0.18); }
  @media print {
    body { background:#fff; }
    .barra { display:none; }
    .pg { margin:0; box-shadow:none; min-height:0; height:297mm; break-after:page; }
    #folhas > .pg:last-child { break-after:auto; }
  }

  /* ---------- cabeçalho ---------- */
  .topo { display:flex; align-items:center; gap:11px; border-bottom:2.5px solid #000;
    padding-bottom:5px; margin-bottom:5px; }
  .topo img { width:38px; height:38px; object-fit:contain; }
  .topo h1 { font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif; font-size:22px;
    font-weight:800; margin:0; letter-spacing:0.05em; text-transform:uppercase; line-height:1; }
  .topo-sub { font-size:8px; letter-spacing:0.14em; text-transform:uppercase; color:var(--fraco); margin-top:3px; }
  .topo-dir { margin-left:auto; text-align:right; font-size:8px; letter-spacing:0.12em;
    text-transform:uppercase; color:var(--fraco); }
  .topo-dir b { display:block; font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;
    font-size:12px; letter-spacing:0.06em; color:#000; }

  /* ---------- campos ---------- */
  .rot { font-size:8px; text-transform:uppercase; letter-spacing:0.09em; color:var(--fraco);
    margin-right:4px; white-space:nowrap; }
  .v { display:inline-block; font-weight:700; font-size:11px; }
  .v.vazio { border-bottom:1px solid #000; height:12px; }
  .chk { display:inline-block; width:10px; height:10px; border:1.3px solid #000;
    margin-right:3px; vertical-align:-1px; }
  .escala b { display:inline-block; width:13.5px; height:13.5px; line-height:12px; text-align:center;
    font-weight:700; font-size:9.5px; border:1px solid #888; border-radius:50%; margin-left:1.5px; }
  .wl { border-bottom:1px solid var(--risco); height:19px; }
  .caixa { border:1.5px solid #000; padding:6px 9px; }
  .linhaf { display:flex; gap:12px; flex-wrap:wrap; align-items:baseline; }
  .linhaf + .linhaf { margin-top:6px; }
  .linhaf > div { display:flex; align-items:baseline; }
  .cresce { flex:1; }
  .cresce .v.vazio { flex:1; }
  .ident-nome { display:flex; align-items:baseline; gap:9px; margin-bottom:6px; }
  .ident-nome .nome { font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;
    font-size:19px; font-weight:800; letter-spacing:0.02em; flex:1; }
  .ident-nome .nome.vazio { border-bottom:1px solid #000; height:19px; }
  .pos-chips b { display:inline-block; min-width:21px; padding:1px 3px; text-align:center;
    font-size:9px; font-weight:700; border:1px solid #888; border-radius:9px; margin-left:2px; }

  /* ---------- registo ao vivo ---------- */
  .aovivo { display:grid; grid-template-columns:1fr 1fr; gap:0 12px; }
  .av-hd { font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em;
    color:var(--fraco); border-bottom:1px solid #000; padding-bottom:2px; margin-bottom:2px;
    display:flex; justify-content:space-between; }
  .av-hd em { font-style:normal; font-weight:700; letter-spacing:0.06em; }
  .av-l { display:flex; height:19px; }
  .av-min { width:10mm; border-bottom:1px solid var(--risco); border-right:1px solid var(--risco); }
  .av-txt { flex:1; border-bottom:1px solid var(--risco); }

  /* ---------- blocos de notas (momentos e restantes) ---------- */
  .blocos { display:grid; grid-template-columns:1fr 1fr; gap:6px 10px; margin-top:6px; }
  .blocos--3 { grid-template-columns:1fr 1fr 1fr; }
  .bl { border:1px solid #000; padding:3px 7px 5px; }
  .bl-2col { display:grid; grid-template-columns:1fr 1fr; gap:0 9px; }
  .bl-sinal { font-size:11px; font-weight:800; line-height:1; height:11px; }
  .bl-hd { font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif; font-size:13.5px;
    font-weight:800; letter-spacing:0.03em; text-transform:uppercase;
    border-bottom:1px solid #000; padding-bottom:2px; }

  /* ---------- fecho ---------- */
  .bl--solo { margin-top:6px; }
  .rodape { margin-top:auto; border-top:1.5px solid #000; padding-top:4px; display:flex;
    justify-content:space-between; font-size:7.5px; letter-spacing:0.1em;
    text-transform:uppercase; color:var(--fraco); }
</style></head>
<body>
  <div class="barra">
    <strong>Folha de observação</strong>
    <label>Folhas: <input id="qtd" type="number" min="1" max="60" value="1"></label>
    <button class="sec" onclick="aplicar()">Aplicar</button>
    <button onclick="window.print()">Imprimir / PDF</button>
    <span class="dica">Uma página por folha — bloco de notas para levar para o jogo.</span>
  </div>

<div id="folhas">
  <div class="pg">
    <header class="topo">
      ${escudo ? `<img src="${escudo}" alt="">` : ''}
      <div>
        <h1>Folha de Observação</h1>
        <div class="topo-sub">${CLUBE_PROPRIO} · Departamento de Scouting</div>
      </div>
      <div class="topo-dir"><b>Notas de jogo</b></div>
    </header>

    <div class="caixa">
      <div class="ident-nome">
        <span class="rot">Jogador</span>
        ${nome ? `<span class="nome">${nome}</span>` : '<span class="nome vazio"></span>'}
        <span class="rot">Nº</span>${campo(num, '11mm')}
        <span class="rot">Posição</span>${campo(pos, '22mm')}
      </div>
      <div class="linhaf">
        <div class="cresce"><span class="rot">Clube / Liga</span>${campo(clube, '40mm')}</div>
        <div><span class="rot">Ano nasc.</span>${campo(nasc, '13mm')}</div>
        <div><span class="rot">Pé</span>${campo(pe, '14mm')}</div>
        <div><span class="rot">Altura</span>${campo(altura, '13mm')}</div>
      </div>
      <div class="linhaf">
        <div><span class="rot">Data</span>${campo(jData, '22mm')}</div>
        <div class="cresce"><span class="rot">Competição</span>${campo(jComp, '30mm')}</div>
        <div class="cresce"><span class="rot">Jogo</span>${campo(jJogo, '34mm')}</div>
        <div><span class="rot">Resultado</span>${campo('', '14mm')}</div>
      </div>
      <div class="linhaf">
        <div class="cresce"><span class="rot">Adversário</span>${campo(jAdv, '44mm')}</div>
        <div><span class="rot">Meio</span>${chk('Estádio')} &nbsp;${chk('Transmissão')} &nbsp;${chk('Vídeo')}</div>
      </div>
      <div class="linhaf">
        <div><span class="rot">Minutos</span>${campo('', '14mm')}</div>
        <div>${chk('Titular')} &nbsp;${chk('Suplente')}</div>
        <div class="cresce pos-chips"><span class="rot">Posição no jogo</span>${POS_CURTAS.map((p) => `<b>${p}</b>`).join('')}</div>
        <div><span class="rot">Sistema</span>${campo('', '18mm')}</div>
      </div>
    </div>

    <div class="bl bl--solo">
      <div class="aovivo">
        ${colunaAoVivo('1.ª parte', 6)}
        ${colunaAoVivo('2.ª parte', 6)}
      </div>
    </div>

    <div class="blocos">
      ${FASES.map((m) => bloco(m, 18)).join('')}
    </div>

    <div class="blocos blocos--3">
      ${OUTRAS.map((o) => bloco(o, 6, true)).join('')}
    </div>

    <div class="bl bl--solo">
      <div class="bl-hd">A confirmar na próxima observação</div>
      ${linhas(4)}
    </div>

    <footer class="rodape">
      <span>${CLUBE_PROPRIO} · Scouting</span>
      <span>Notas do jogo</span>
    </footer>
  </div>
</div>

<script>
  // Impressão em série: duplica a folha N vezes.
  var MODELO = document.querySelector('.pg').outerHTML;
  function aplicar() {
    var campo = document.getElementById('qtd');
    var n = Math.max(1, Math.min(60, parseInt(campo.value, 10) || 1));
    campo.value = n;
    document.getElementById('folhas').innerHTML = new Array(n + 1).join(MODELO);
  }
  document.getElementById('qtd').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); aplicar(); }
  });
</script>
</body></html>`;
}
