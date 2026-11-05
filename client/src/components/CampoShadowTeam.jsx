import { useMemo } from 'react';

// Campo horizontal (GR à esquerda, ataque à direita). Cada posição é uma box
// com os melhores jogadores (por rating) ATRIBUÍDOS a essa posição no 11-sombra
// (campo `shadowPos`, definido pelo botão do Ranking — independente da posição de
// perfil do jogador); clicar abre todos.
// Formação do clube = 3-4-3: defesa a 3 (DC ×3), 4 no meio (2 alas DD/DE + 2
// médios MDF/MC) e 3 na frente (EE/PL/ED).
// Linha de 3 centrais: topo = esquerdo, meio = centro, baixo = direito
// (mesma convenção dos alas DE/DD e dos extremos EE/ED).
const POS_XY = {
  GR: [[9, 50]],
  DCE: [[24, 25]], // central esquerdo
  DCC: [[24, 50]], // central (meio)
  DCD: [[24, 75]], // central direito
  DE: [[46, 14]], // ala esquerdo (wing-back)
  DD: [[46, 86]], // ala direito (wing-back)
  MDF: [[44, 40]],
  MC: [[44, 60]],
  EE: [[73, 18]],
  ED: [[73, 82]],
  PL: [[89, 50]],
};

const POSICOES_CAMPO = [
  { key: 'GR', label: 'Guarda-redes' },
  { key: 'DCE', label: 'Central esquerdo', curto: 'DC' },
  { key: 'DCC', label: 'Central (centro)', curto: 'DC' },
  { key: 'DCD', label: 'Central direito', curto: 'DC' },
  { key: 'DE', label: 'Ala esquerdo' },
  { key: 'DD', label: 'Ala direito' },
  { key: 'MDF', label: 'Médio defensivo' },
  { key: 'MC', label: 'Médio centro' },
  { key: 'EE', label: 'Extremo esquerdo' },
  { key: 'ED', label: 'Extremo direito' },
  { key: 'PL', label: 'Ponta de lança' },
];

const rating = (j) => j.ratingFinal ?? j.ratingRCA ?? null;

function Relva() {
  const L = 'var(--grelha-forte)';
  return (
    <svg className="cs-campo__svg" viewBox="0 0 1050 680" preserveAspectRatio="none" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={i * 150} y="0" width="150" height="680" fill={i % 2 ? 'var(--superficie-2)' : 'var(--superficie)'} />
      ))}
      <g fill="none" stroke={L} strokeWidth="2">
        <rect x="20" y="20" width="1010" height="640" />
        <line x1="525" y1="20" x2="525" y2="660" />
        <circle cx="525" cy="340" r="88" />
        <rect x="20" y="139" width="165" height="402" />
        <rect x="20" y="249" width="55" height="182" />
        <path d="M185 271 A88 88 0 0 1 185 409" />
        <rect x="865" y="139" width="165" height="402" />
        <rect x="975" y="249" width="55" height="182" />
        <path d="M865 271 A88 88 0 0 0 865 409" />
      </g>
      <g fill={L}>
        <circle cx="525" cy="340" r="4" />
        <circle cx="130" cy="340" r="4" />
        <circle cx="920" cy="340" r="4" />
      </g>
    </svg>
  );
}

function RelvaVertical() {
  const L = 'var(--grelha-forte)';
  return (
    <svg className="cs-campo__svg" viewBox="0 0 680 1050" preserveAspectRatio="none" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x="0" y={i * 150} width="680" height="150" fill={i % 2 ? 'var(--superficie-2)' : 'var(--superficie)'} />
      ))}
      <g fill="none" stroke={L} strokeWidth="2">
        <rect x="20" y="20" width="640" height="1010" />
        <line x1="20" y1="525" x2="660" y2="525" />
        <circle cx="340" cy="525" r="88" />
        <rect x="139" y="20" width="402" height="165" />
        <rect x="249" y="20" width="182" height="55" />
        <rect x="139" y="865" width="402" height="165" />
        <rect x="249" y="975" width="182" height="55" />
      </g>
      <g fill={L}>
        <circle cx="340" cy="525" r="4" />
        <circle cx="340" cy="130" r="4" />
        <circle cx="340" cy="920" r="4" />
      </g>
    </svg>
  );
}

export default function CampoShadowTeam({ jogadores, aoAbrir, resumo = false, contagens = {}, vertical = false }) {
  const porPos = useMemo(() => {
    const mapa = {};
    (jogadores || []).forEach((j) => {
      const poss = Array.isArray(j.shadowPos) ? j.shadowPos : j.shadowPos ? [j.shadowPos] : [];
      poss.forEach((pos) => {
        (mapa[pos] = mapa[pos] || []).push(j);
      });
    });
    Object.values(mapa).forEach((lista) =>
      lista.sort((a, b) => (rating(b) ?? -1) - (rating(a) ?? -1))
    );
    return mapa;
  }, [jogadores]);

  // Modo vertical (telemóvel): campo ao alto, só o nº por posição, clicável.
  if (vertical) {
    return (
      <div className="cs-campo cs-campo--vertical">
        <RelvaVertical />
        {POSICOES_CAMPO.flatMap((pos) => {
          const lugares = POS_XY[pos.key] || [[50, 50]];
          const lista = porPos[pos.key] || [];
          const n = lista.length;
          return lugares.map(([x, y], i) => (
            <div
              key={`${pos.key}-${i}`}
              className={'cs-box cs-box--resumo' + (n ? ' cs-box--clicavel' : ' cs-box--vazio')}
              style={{ left: y + '%', top: 100 - x + '%' }}
              title={pos.label}
              onClick={n ? () => aoAbrir(pos, lista) : undefined}
            >
              <span className="cs-box__pos">{pos.curto || pos.key}</span>
              <b className="cs-box__num">{n}</b>
            </div>
          ));
        })}
      </div>
    );
  }

  // Modo resumo (Home): só o nº de jogadores por posição, mesmo design do campo.
  if (resumo) {
    return (
      <div className="cs-campo cs-campo--resumo">
        <Relva />
        {POSICOES_CAMPO.flatMap((pos) => {
          const lugares = POS_XY[pos.key] || [[50, 50]];
          const n = contagens[pos.key] || 0;
          return lugares.map(([x, y], i) => (
            <div
              key={`${pos.key}-${i}`}
              className={'cs-box cs-box--resumo' + (n ? '' : ' cs-box--vazio')}
              style={{ left: x + '%', top: y + '%' }}
              title={pos.label}
            >
              <span className="cs-box__pos">{pos.curto || pos.key}</span>
              <b className="cs-box__num">{n}</b>
            </div>
          ));
        })}
      </div>
    );
  }

  return (
    <div className="cs-campo">
      <Relva />
      {POSICOES_CAMPO.flatMap((pos) => {
        const lugares = POS_XY[pos.key] || [[50, 50]];
        const lista = porPos[pos.key] || [];
        const temJogadores = lista.length > 0;
        return lugares.map(([x, y], i) => (
          <div
            key={`${pos.key}-${i}`}
            className={'cs-box' + (temJogadores ? ' cs-box--clicavel' : ' cs-box--vazio')}
            style={{ left: x + '%', top: y + '%' }}
            title={pos.label}
            onClick={temJogadores ? () => aoAbrir(pos, lista) : undefined}
          >
            <div className="cs-box__hd">
              <span>{pos.curto || pos.key}</span>
              <span className="cs-box__n">{lista.length}</span>
            </div>
            {temJogadores ? (
              lista.slice(0, 3).map((j) => (
                <div className="cs-box__jog" key={j._id}>
                  <span className="cs-box__nome">{j.nomeCompleto}</span>
                  <b className="cs-box__rt">{rating(j) ?? '—'}</b>
                </div>
              ))
            ) : (
              <div className="cs-box__vazio">—</div>
            )}
            {lista.length > 3 && <div className="cs-box__mais">+{lista.length - 3} · ver todos</div>}
          </div>
        ));
      })}
    </div>
  );
}
