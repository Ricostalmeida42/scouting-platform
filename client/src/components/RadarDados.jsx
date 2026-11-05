// Radar de percentis (0-100) por posição, com os NOMES das métricas nos eixos
// (sem tabela/legenda). 1 jogador (cor por banda) ou 2 sobrepostos (Comparar).

function fmtValor(v, fmt) {
  if (v == null) return '—';
  if (fmt === 'pct') return v.toFixed(0) + '%';
  if (fmt === 'delta') return (v > 0 ? '+' : '') + v.toFixed(2);
  return v.toFixed(2);
}
function corPct(p) {
  if (p == null) return 'var(--texto-3)';
  if (p >= 70) return 'var(--verde-ok)';
  if (p >= 40) return 'var(--amarelo, #c9962b)';
  return 'var(--vermelho, #b0322b)';
}
// Divide um rótulo em até 2 linhas, pela palavra mais próxima do meio.
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

export default function RadarDados({ series }) {
  const comparar = series.length > 1;
  const eixos = series[0].eixos;
  const n = eixos.length;
  const cx = 230;
  const cy = 200;
  const R = 120;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const ponto = (i, raio) => [cx + raio * Math.cos(ang(i)), cy + raio * Math.sin(ang(i))];

  const aneis = [25, 50, 75, 100];
  const poligono = (raio) => eixos.map((_, i) => ponto(i, (raio / 100) * R).join(',')).join(' ');
  const formaDe = (s) => s.eixos.map((e, i) => ponto(i, ((e.percentil ?? 0) / 100) * R).join(',')).join(' ');

  return (
    <div className="radar">
      {comparar && (
        <div className="radar__chave">
          {series.map((s) => (
            <span key={s.nome} className="radar__chave-item">
              <span className="radar__chave-cor" style={{ background: s.cor }} />
              {s.nome}
            </span>
          ))}
        </div>
      )}
      <svg className="radar__svg" viewBox="0 0 460 400">
        {aneis.map((a) => (
          <polygon key={a} className="radar__anel" points={poligono(a)} />
        ))}
        {eixos.map((_, i) => {
          const [x, y] = ponto(i, R);
          return <line key={i} className="radar__eixo" x1={cx} y1={cy} x2={x} y2={y} />;
        })}
        {series.map((s) => (
          <polygon
            key={s.nome}
            className="radar__forma"
            points={formaDe(s)}
            style={{ fill: `color-mix(in srgb, ${s.cor} ${comparar ? 13 : 20}%, transparent)`, stroke: s.cor }}
          />
        ))}
        {series.map((s) =>
          s.eixos.map((e, i) => {
            const [x, y] = ponto(i, ((e.percentil ?? 0) / 100) * R);
            return <circle key={s.nome + i} cx={x} cy={y} r={3} style={{ fill: s.cor }} />;
          })
        )}
        {/* rótulos (nome + valor/percentil) nos eixos */}
        {eixos.map((e, i) => {
          const [lx, ly] = ponto(i, R + 14);
          const c = Math.cos(ang(i));
          const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
          const nomeLinhas = duasLinhas(e.label);
          const valLinhas = comparar
            ? series.map((s) => ({ txt: fmtValor(s.eixos[i].valor, s.eixos[i].fmt), cor: s.cor }))
            : [];
          const total = nomeLinhas.length + valLinhas.length;
          const y0 = ly - ((total - 1) * 11) / 2;
          return (
            <text key={i} x={lx} textAnchor={anchor} className="radar__lbl">
              {nomeLinhas.map((ln, k) => (
                <tspan key={'n' + k} x={lx} y={y0 + k * 11}>{ln}</tspan>
              ))}
              {valLinhas.map((v, k) => (
                <tspan key={'v' + k} x={lx} y={y0 + (nomeLinhas.length + k) * 11} className="radar__lbl-v" style={{ fill: v.cor }}>
                  {v.txt}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
