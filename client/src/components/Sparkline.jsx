// Mini-gráfico de linha (SVG) para a evolução do rating ao longo das observações.
// `responsivo` = ocupa 100% da largura do contentor (mantém a espessura do traço).
// `auto` = escala vertical ao intervalo real dos dados (amplia a variação, em vez
//          da escala fixa 1–10 que faz pequenas diferenças parecerem planas).
export default function Sparkline({
  valores = [],
  largura = 120,
  altura = 34,
  min = 1,
  max = 10,
  responsivo = false,
  auto = false,
}) {
  if (valores.length < 2) return null;

  let lo = min;
  let hi = max;
  if (auto) {
    const vmin = Math.min(...valores);
    const vmax = Math.max(...valores);
    const pad = (vmax - vmin) * 0.18 || 0.5; // margem; se for tudo igual, 0.5
    lo = vmin - pad;
    hi = vmax + pad;
  }

  // Denominador mínimo 2: com só 2 observações a linha ocupa metade da largura e
  // deixa espaço livre à direita (3+ observações já enchem).
  const passo = largura / Math.max(valores.length - 1, 2);
  const y = (v) => altura - ((v - lo) / (hi - lo)) * altura;
  const pontos = valores.map((v, i) => `${i * passo},${y(v)}`).join(' ');
  const ultimo = valores.length - 1;

  return (
    <svg
      width={responsivo ? '100%' : largura}
      height={altura}
      viewBox={`0 0 ${largura} ${altura}`}
      preserveAspectRatio={responsivo ? 'none' : 'xMidYMid meet'}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <polyline
        points={pontos}
        fill="none"
        stroke="var(--vermelho)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
