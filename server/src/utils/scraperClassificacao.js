import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

// Mapa do rótulo da coluna → campo. (P=pontos, J=jogos, GM/GF=marcados, GS/GC=sofridos.)
const COL = {
  P: 'pontos', PTS: 'pontos',
  J: 'jogos', PJ: 'jogos',
  V: 'vitorias', E: 'empates', D: 'derrotas',
  GM: 'golosMarcados', GF: 'golosMarcados', GP: 'golosMarcados',
  GS: 'golosSofridos', GC: 'golosSofridos',
  DG: 'diferenca', DIF: 'diferenca',
};
const num = (s) => {
  const n = parseInt(String(s).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

// Vai buscar a classificação a uma página de edição do zerozero e devolve as linhas.
export async function scraperClassificacao(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt' } });
  if (!res.ok) throw new Error('zerozero devolveu ' + res.status);
  const html = await res.text();
  const $ = cheerio.load(html);

  // A tabela de classificação é a que tem mais linhas com link de equipa E cujas
  // linhas de dados têm ≥ 11 células (as tabelas de jogos têm ~10).
  let melhor = null;
  let melhorN = 0;
  $('table').each((_, t) => {
    const linhasEq = $(t).find('tr').filter((_, tr) => $(tr).find('a[href*="/equipa/"]').length);
    if (linhasEq.length < 3) return;
    const nTd = linhasEq.first().find('td').length;
    if (nTd < 11) return;
    if (linhasEq.length > melhorN) {
      melhorN = linhasEq.length;
      melhor = t;
    }
  });
  if (!melhor) throw new Error('Não encontrei a tabela de classificação na página.');

  // Mapa de colunas a partir do cabeçalho (th/td com os rótulos P/J/V/E/D/GM/GS/DG).
  const mapaCol = {}; // índice da célula → campo
  $(melhor)
    .find('tr')
    .each((_, tr) => {
      if (Object.keys(mapaCol).length) return; // já tenho o cabeçalho
      const cels = $(tr).find('th,td');
      if (!cels.length) return;
      let achou = false;
      cels.each((i, c) => {
        const k = $(c).text().replace(/\s+/g, '').toUpperCase();
        if (COL[k]) {
          mapaCol[i] = COL[k];
          achou = true;
        }
      });
      if (!achou) Object.keys(mapaCol).forEach((k) => delete mapaCol[k]); // não era o cabeçalho
    });

  const linhas = [];
  $(melhor)
    .find('tr')
    .each((_, tr) => {
      // Cada linha tem 2 links de equipa (logo sem texto + nome). Fica com o que tem texto.
      const eq = $(tr)
        .find('a[href*="/equipa/"]')
        .map((_, a) => $(a).text().replace(/\s+/g, ' ').trim())
        .get()
        .find(Boolean) || '';
      if (!eq) return;
      const tds = $(tr).find('td');
      const cells = tds.map((_, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();
      const linha = { equipa: eq, posicao: num(cells[0]) };
      if (Object.keys(mapaCol).length) {
        for (const [i, campo] of Object.entries(mapaCol)) linha[campo] = num(cells[i]);
      } else {
        // Fallback para a ordem observada: pos, logo, nome, P, J, V, E, D, GM, GS, DG.
        Object.assign(linha, {
          pontos: num(cells[3]), jogos: num(cells[4]), vitorias: num(cells[5]),
          empates: num(cells[6]), derrotas: num(cells[7]), golosMarcados: num(cells[8]),
          golosSofridos: num(cells[9]), diferenca: num(cells[10]),
        });
      }
      linhas.push(linha);
    });

  if (!linhas.length) throw new Error('Tabela encontrada mas sem linhas válidas.');
  return linhas;
}
