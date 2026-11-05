import { useMemo, useState } from 'react';
import { idade, planoCor } from '../lib.js';

// Campo vertical (ataque em cima, GR em baixo) — sistema 1-3-4-3. São SLOTS do
// onze (vazios por omissão). Os jogadores arrastam-se dos tiers para cá; cada um
// fica no slot (campo `planoPos`), independente da posição de perfil.
// 11 slots: GR · 3 centrais (DCE/DCC/DCD) · 4 (DE/MDF/MC/DD) · 3 (EE/PL/ED).
// Linhas RETAS (mesma altura por linha): frente EE/PL/ED, meio DE/MDF/MC/DD,
// defesa DCE/DCC/DCD, GR. O label serve só de tooltip (não se mostra no campo).
const CAMPO_SLOTS = [
  { key: 'EE', label: 'Extremo esquerdo', x: 24, y: 13 },
  { key: 'PL', label: 'Ponta de lança', x: 50, y: 13 },
  { key: 'ED', label: 'Extremo direito', x: 76, y: 13 },
  { key: 'DE', label: 'Ala esquerdo', x: 13, y: 42 },
  { key: 'MDF', label: 'Médio defensivo', x: 38, y: 42 },
  { key: 'MC', label: 'Médio centro', x: 62, y: 42 },
  { key: 'DD', label: 'Ala direito', x: 87, y: 42 },
  { key: 'DCE', label: 'Central esquerdo', x: 27, y: 67 },
  { key: 'DCC', label: 'Central', x: 50, y: 67 },
  { key: 'DCD', label: 'Central direito', x: 73, y: 67 },
  { key: 'GR', label: 'Guarda-redes', x: 50, y: 85 },
];

const rating = (j) => j.ratingFinal ?? j.ratingRCA ?? null;

// Caixa com cor "subtil": fundo neutro (como as caixas sem cor), com a cor apenas
// a iluminar os 4 cantos (brilho radial) e no bordo. Texto na cor normal.
const estiloCaixaCor = (cor) => {
  const brilho = `color-mix(in srgb, ${cor} 45%, transparent)`;
  return {
    background:
      `radial-gradient(circle at top left, ${brilho}, transparent 58%),` +
      `radial-gradient(circle at top right, ${brilho}, transparent 58%),` +
      `radial-gradient(circle at bottom left, ${brilho}, transparent 58%),` +
      `radial-gradient(circle at bottom right, ${brilho}, transparent 58%),` +
      `var(--superficie)`,
    borderColor: `color-mix(in srgb, ${cor} 55%, var(--borda-forte))`,
    color: 'var(--texto)',
  };
};

// Ordem por defeito dentro de uma posição = pelo TIER (Top → Core → Back-Up →
// Jovens). planoOrdem (setas) afina dentro do mesmo tier.
const TIER_ORDEM = { A: 0, B: 1, C: 2, D: 3 };
const anoContrato = (j) => (j.fimContrato ? new Date(j.fimContrato).getFullYear() : null);

function Relva() {
  const L = 'var(--grelha-forte)';
  return (
    <svg className="cp-campo__svg" viewBox="0 0 1040 1050" preserveAspectRatio="none" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x="0" y={i * 175} width="1040" height="175" fill={i % 2 ? 'var(--superficie-2)' : 'var(--superficie)'} />
      ))}
      <g fill="none" stroke={L} strokeWidth="2">
        <rect x="18" y="18" width="1004" height="1014" />
        <line x1="18" y1="525" x2="1022" y2="525" />
        <circle cx="520" cy="525" r="96" />
        <rect x="310" y="18" width="420" height="155" />
        <rect x="415" y="18" width="210" height="60" />
        <rect x="310" y="877" width="420" height="155" />
        <rect x="415" y="972" width="210" height="60" />
      </g>
    </svg>
  );
}

export default function CampoPlaneamento({
  jogadores,
  alvos = [],
  aoClicar,
  aoColocar,
  aoRemover,
  aoReordenar,
  aoAddAlvo,
  aoEditarAlvo,
  aoRemoverAlvo,
  aoMoverAlvo,
  podeEditar = true,
}) {
  const [sobre, setSobre] = useState(null);
  // Jogadores + alvos juntos por slot, numa só lista ordenada. O alvo entra na
  // ordem pelo seu TIER (como um jogador). Ordem manual (setas/arrastar) manda;
  // por defeito (todos "auto") desempata pelo TIER (Top→Core→Back-Up→Jovens) e
  // depois rating. Cada item tem `dragId` (id do jogador, ou 'alvo:'+id).
  const itensPorSlot = useMemo(() => {
    const mapa = {};
    const push = (slot, item) => {
      if (!slot) return;
      (mapa[slot] = mapa[slot] || []).push(item);
    };
    (jogadores || []).forEach((j) =>
      push(j.planoPos, {
        tipo: 'jog',
        dragId: j._id,
        ordem: j.planoOrdem ?? 0,
        tier: j.planoTier,
        rating: rating(j) ?? -1,
        j,
      })
    );
    (alvos || []).forEach((a) =>
      push(a.planoPos, {
        tipo: 'alvo',
        dragId: 'alvo:' + a._id,
        ordem: a.planoOrdem ?? 0,
        tier: a.planoTier,
        rating: -1,
        a,
      })
    );
    Object.values(mapa).forEach((lista) =>
      lista.sort(
        (x, y) =>
          (x.ordem ?? 0) - (y.ordem ?? 0) ||
          (TIER_ORDEM[x.tier] ?? 9) - (TIER_ORDEM[y.tier] ?? 9) ||
          y.rating - x.rating
      )
    );
    return mapa;
  }, [jogadores, alvos]);

  // Troca dois itens de ordem no slot e grava a nova ordem completa (jogadores
  // e alvos misturados — ver `reordenar` na página, que distingue 'alvo:').
  const trocar = (slotKey, itens, i, k) => {
    if (k < 0 || k >= itens.length) return;
    const ids = itens.map((x) => x.dragId);
    [ids[i], ids[k]] = [ids[k], ids[i]];
    aoReordenar && aoReordenar(slotKey, ids);
  };

  // Largar um item (jogador OU alvo) em cima de outro → reordenar na posição.
  // Para baixo (from < alvo) insere DEPOIS do alvo-alvo; para cima, ANTES.
  const largarEm = (e, slotKey, itens, alvoItem) => {
    const dragId = e.dataTransfer.getData('text/plain');
    if (!dragId) return;
    e.preventDefault();
    e.stopPropagation();
    setSobre(null);
    const ids = itens.map((x) => x.dragId);
    const from = ids.indexOf(dragId);
    if (from < 0) {
      // Vem de outra posição (ou dos tiers): coloca aqui.
      if (dragId.startsWith('alvo:')) aoMoverAlvo && aoMoverAlvo(dragId.slice(5), slotKey);
      else aoColocar && aoColocar(dragId, slotKey);
      return;
    }
    const toOrig = ids.indexOf(alvoItem.dragId);
    ids.splice(from, 1);
    let insertAt = ids.indexOf(alvoItem.dragId);
    if (from < toOrig) insertAt += 1;
    ids.splice(insertAt, 0, dragId);
    aoReordenar && aoReordenar(slotKey, ids);
  };

  return (
    <div className="cp-campo">
      <Relva />
      {CAMPO_SLOTS.map((s) => {
        const itens = itensPorSlot[s.key] || [];
        const vazio = itens.length === 0;
        return (
          <div
            key={s.key}
            className={'cp-slot' + (sobre === s.key ? ' cp-slot--sobre' : '') + (vazio ? ' cp-slot--vazio' : '')}
            style={{ left: s.x + '%', top: s.y + '%' }}
            title={s.label}
            onDragOver={(e) => {
              e.preventDefault();
              if (sobre !== s.key) setSobre(s.key);
            }}
            onDragLeave={() => setSobre((v) => (v === s.key ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              setSobre(null);
              const id = e.dataTransfer.getData('text/plain');
              if (!id) return;
              if (id.startsWith('alvo:')) aoMoverAlvo && aoMoverAlvo(id.slice(5), s.key);
              else if (aoColocar) aoColocar(id, s.key);
            }}
          >
            {vazio && <span className="cp-slot__ghost" aria-hidden="true" />}
            {itens.map((it, i) => {
              // Setas ▲▼ (aparecem quando há mais que um item na posição).
              const ord = podeEditar && itens.length > 1 && (
                <span className="cp-chip__ord" onClick={(e) => e.stopPropagation()}>
                  <button type="button" title="Subir" disabled={i === 0} onClick={() => trocar(s.key, itens, i, i - 1)}>
                    ▲
                  </button>
                  <button
                    type="button"
                    title="Descer"
                    disabled={i === itens.length - 1}
                    onClick={() => trocar(s.key, itens, i, i + 1)}
                  >
                    ▼
                  </button>
                </span>
              );
              if (it.tipo === 'alvo') {
                const a = it.a;
                const cor = planoCor(a.planoEstatuto) || '#8a8f98'; // cor sólida (neutro sem prioridade)
                return (
                  <div
                    key={it.dragId}
                    className="cp-alvo"
                    style={estiloCaixaCor(cor)}
                    draggable={podeEditar}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', it.dragId);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => largarEm(e, s.key, itens, it)}
                    onClick={() => aoEditarAlvo && aoEditarAlvo(a)}
                    title={podeEditar ? 'Alvo de recrutamento — arrasta p/ mudar de posição ou ordem · clica p/ editar' : 'Alvo de recrutamento'}
                  >
                    {ord}
                    {podeEditar && (
                      <button
                        type="button"
                        className="cp-chip__x"
                        title="Remover alvo"
                        onClick={(e) => {
                          e.stopPropagation();
                          aoRemoverAlvo && aoRemoverAlvo(a);
                        }}
                      >
                        ×
                      </button>
                    )}
                    <span className="cp-alvo__txt">{a.planoTier || 'Alvo'}</span>
                  </div>
                );
              }
              const j = it.j;
              const cor = planoCor(j.planoEstatuto);
              const ano = anoContrato(j);
              const id = idade(j.dataNascimento);
              const extra = [id != null ? id + ' anos' : null, ano ? 'fim ' + ano : null].filter(Boolean).join(' · ');
              return (
                <div
                  key={it.dragId}
                  className={'cp-chip' + (cor ? ' cp-chip--cor' : '')}
                  style={cor ? estiloCaixaCor(cor) : undefined}
                  draggable={podeEditar}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', it.dragId);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => largarEm(e, s.key, itens, it)}
                  onClick={() => aoClicar && aoClicar(j)}
                  title={
                    j.nomeCompleto +
                    (extra ? ' · ' + extra : '') +
                    (j.planoTier ? ' · Tier ' + j.planoTier : '') +
                    (podeEditar ? '\n(arrasta p/ mover · clica p/ ação · × p/ tirar)' : '')
                  }
                >
                  {j.planoTier && <span className="cp-chip__tier">{j.planoTier}</span>}
                  {ord}
                  {podeEditar && (
                    <button
                      type="button"
                      className="cp-chip__x"
                      title="Tirar do onze"
                      onClick={(e) => {
                        e.stopPropagation();
                        aoRemover && aoRemover(j);
                      }}
                    >
                      ×
                    </button>
                  )}
                  <span className="cp-chip__nome">{j.nomeCompleto}</span>
                  <span className="cp-chip__idade">{id}</span>
                </div>
              );
            })}
            {podeEditar && aoAddAlvo && (
              <button
                type="button"
                className="cp-slot__addalvo"
                title="Adicionar um alvo nesta posição"
                onClick={() => aoAddAlvo(s.key)}
              >
                + alvo
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
