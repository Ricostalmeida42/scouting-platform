import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';
import { useToast } from './Toasts.jsx';
import { dataCurta } from '../lib.js';
import { chaveDia } from './VistaSemana.jsx';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const H0 = 9; // primeira hora
const H1 = 22; // última hora (exclusiva)

// Modos de visionamento: duração e cor do bloco. hj = arranca à hora do jogo.
const MODOS = {
  diferido: { label: 'Diferido', dur: 75, cor: '#1d6fb8', bg: 'rgba(29,111,184,0.14)', hj: false },
  em_direto: { label: 'Em direto', dur: 105, cor: '#b8860b', bg: 'rgba(184,134,11,0.16)', hj: true },
  ao_vivo: { label: 'Ao vivo', dur: 240, cor: '#a5122a', bg: 'rgba(165,18,42,0.14)', hj: true },
};
const modoDe = (a) => MODOS[a.modo] || MODOS.diferido;

// Cor dos jogos "por jogar" (data/hora real ainda no futuro) — distingue-os dos já jogados.
const COR_POR_JOGAR = '#c98f14';
const BG_POR_JOGAR = 'rgba(201,143,20,0.16)';

// Um jogo "já aconteceu" se a sua data+hora real já passou (independente do modo ou
// do horário de visionamento). Sem hora conhecida, só conta como passado no fim do dia.
const jogoRealizado = (a) => {
  if (!a.dataJogo) return true; // sem data (agendamento manual solto) → não marcar como futuro
  const d = new Date(a.dataJogo);
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const m = /^(\d{1,2}):(\d{2})/.exec(a.hora || '');
  if (m) dt.setHours(+m[1], +m[2], 0, 0);
  else dt.setHours(23, 59, 59, 999);
  return dt.getTime() <= Date.now();
};

function inicioSemana(d) {
  const dt = new Date(d);
  const off = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - off);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
const ymd = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
const hm = (d) => {
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};
const minsDia = (dt) => new Date(dt).getHours() * 60 + new Date(dt).getMinutes();

export default function PlanoSemana({ ags, obsPorJogo, aoRecarregar, podeEditar = true }) {
  const toast = useToast();
  const [ref, setRef] = useState(null);
  const [agendar, setAgendar] = useState(null); // { ag, modo, data, hora, duracao }
  const [redim, setRedim] = useState(null); // { id, y0, dur0, dur } — redimensionamento ao vivo
  const [paAberto, setPaAberto] = useState(false); // dropdown "Por agendar" (fechado por omissão)
  const paRef = useRef(null);

  // Tick de 1 min: re-renderiza para os estados mudarem sozinhos de "por jogar" → "por
  // ver" no momento em que a data+hora do jogo passa (jogoRealizado usa Date.now()).
  const [, setTique] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTique((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const base = ref || inicioSemana(new Date());
  const fim = new Date(base);
  fim.setDate(fim.getDate() + 7);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return d;
  });
  const nav = (delta) => {
    const d = new Date(base);
    d.setDate(d.getDate() + delta * 7);
    setRef(d);
  };
  const hojeKey = chaveDia(new Date());

  // Posição por PERCENTAGEM da altura da coluna do dia: o horário (H0→H1) ocupa
  // sempre 100% do espaço disponível → cabe todo, sem scroll, em qualquer ecrã.
  const TOTMIN = (H1 - H0) * 60;
  const topPct = (dt) => Math.max(0, Math.min(100, ((minsDia(dt) - H0 * 60) / TOTMIN) * 100));
  const altPct = (min) => Math.max(2.2, (min / TOTMIN) * 100);

  const alvosDe = (a) => (a.jogador ? [a.jogador] : obsPorJogo?.[a.calendarioJogo]?.jogadores || []);

  const naSemana = (ags || []).filter((a) => {
    if (!a.visionamento) return false;
    const v = new Date(a.visionamento);
    return v >= base && v < fim;
  });
  const porAgendar = (ags || []).filter((a) => !a.visionamento && a.estado === 'Planeado');
  const doDia = (d) => naSemana.filter((a) => chaveDia(a.visionamento) === chaveDia(d));

  // --- redimensionar (arrastar a pega de baixo) ---
  useEffect(() => {
    if (!redim) return;
    const onMove = (e) => {
      const delta = e.clientY - redim.y0;
      const deltaMin = (delta / (redim.colH || 400)) * TOTMIN;
      const dur = Math.max(30, Math.round((redim.dur0 + deltaMin) / 15) * 15);
      setRedim((r) => (r ? { ...r, dur } : r));
    };
    const onUp = () => {
      setRedim((r) => {
        if (r) api.put('/agendamentos/' + r.id, { duracaoMin: r.dur }).then(aoRecarregar).catch(() => {});
        return null;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [redim?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // fechar o dropdown "Por agendar" ao clicar fora
  useEffect(() => {
    if (!paAberto) return;
    const onDoc = (e) => {
      if (paRef.current && !paRef.current.contains(e.target)) setPaAberto(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [paAberto]);

  // --- ações ---
  const definir = (id, campos) => api.put('/agendamentos/' + id, campos).then(aoRecarregar).catch((e) => toast('Erro: ' + e.message, 'erro'));
  const tirar = (a) => api.put('/agendamentos/' + a._id, { visionamento: null }).then(aoRecarregar); // tira do dia → "Por agendar"
  const apagar = (a) => {
    if (!window.confirm('Remover este jogo da agenda?')) return;
    api.del('/agendamentos/' + a._id).then(aoRecarregar).catch((e) => toast('Erro: ' + e.message, 'erro'));
  };
  const marcarVisto = async (a) => {
    const p = (a.adversario || '').split(/\s+x\s+/i);
    try {
      await api.post('/observacoes-jogo', {
        calendarioJogo: a.calendarioJogo || null,
        data: a.dataJogo,
        hora: a.hora || '',
        competicao: a.competicao || '',
        casa: (p[0] || '').trim(),
        fora: (p[1] || '').trim(),
      });
      await api.patch('/agendamentos/' + a._id + '/estado', { estado: 'Concluído' });
      aoRecarregar();
      toast('Jogo visto — registado.', 'ok');
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };

  // largar num dia a uma dada posição vertical → hora (arredonda a 15 min)
  const soltar = (id, dia, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    let mins = H0 * 60 + Math.round((frac * TOTMIN) / 15) * 15;
    mins = Math.max(H0 * 60, Math.min(H1 * 60 - 30, mins));
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    const campos = { visionamento: `${ymd(dia)}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00` };
    // 1º agendamento (ainda por agendar) → aplica a duração default do modo (diferido = 75 min)
    const a = (ags || []).find((x) => String(x._id) === String(id));
    if (a && !a.visionamento) campos.duracaoMin = MODOS[a.modo || 'diferido'].dur;
    definir(id, campos);
  };

  const abrirAgendar = (a) => {
    const modo = a.modo || 'diferido';
    const d = a.visionamento ? new Date(a.visionamento) : new Date(base);
    // Já agendado → mostra a duração guardada; ainda por agendar → sugere o default do modo (diferido = 15 min).
    const duracao = a.visionamento ? a.duracaoMin || MODOS[modo].dur : MODOS[modo].dur;
    setAgendar({ ag: a, modo, data: ymd(d), hora: a.visionamento ? hm(a.visionamento) : '', duracao });
  };
  const mudarModo = (m) => {
    setAgendar((s) => {
      const cfg = MODOS[m];
      if (cfg.hj) return { ...s, modo: m, data: ymd(s.ag.dataJogo), hora: s.ag.hora || '', duracao: cfg.dur };
      return { ...s, modo: m, duracao: cfg.dur };
    });
  };
  const guardarAgendar = async () => {
    const { ag, modo, data, hora, duracao } = agendar;
    if (!data) return toast('Escolhe o dia.', 'erro');
    await definir(ag._id, { visionamento: `${data}T${hora || '12:00'}:00`, modo, duracaoMin: Number(duracao) || MODOS[modo].dur });
    setAgendar(null);
    toast('Adicionado ao teu plano da semana.', 'ok');
  };

  const arrastavel = (a) => ({
    draggable: podeEditar && !redim,
    onDragStart: (e) => {
      e.dataTransfer.setData('text/plain', a._id);
      e.dataTransfer.effectAllowed = 'move';
    },
  });

  const bloco = (a) => {
    const cfg = modoDe(a);
    const inicio = new Date(a.visionamento);
    const dur = redim?.id === a._id ? redim.dur : a.duracaoMin || cfg.dur;
    const fimDt = new Date(inicio.getTime() + dur * 60000);
    const alvos = alvosDe(a);
    const visto = a.estado === 'Concluído';
    const porJogar = !visto && !jogoRealizado(a); // jogo ainda não se realizou
    const mostraAcoes = dur >= 75;
    return (
      <div
        key={a._id}
        {...arrastavel(a)}
        style={{
          position: 'absolute',
          top: `${topPct(inicio)}%`,
          height: `${altPct(dur)}%`,
          left: 2,
          right: 2,
          background: visto ? 'var(--fundo-alt, #eef6f0)' : porJogar ? BG_POR_JOGAR : cfg.bg,
          borderLeft: `3px ${porJogar ? 'dashed' : 'solid'} ${porJogar ? COR_POR_JOGAR : cfg.cor}`,
          borderRadius: 'var(--raio)',
          padding: '2px 4px',
          overflow: 'hidden',
          fontSize: 10.5,
          cursor: 'grab',
          boxSizing: 'border-box',
        }}
        title={`${a.adversario} · ${cfg.label} ${hm(inicio)}–${hm(fimDt)}${porJogar ? ' · ainda por jogar' : ''}`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 3, fontWeight: 700 }}>
          <span style={{ color: porJogar ? COR_POR_JOGAR : cfg.cor }}>
            {porJogar ? '⏳ ' : ''}{hm(inicio)}–{hm(fimDt)}
          </span>
          {alvos.length > 0 && <span style={{ color: 'var(--verde-ok, #2e7d5b)' }}>👤{alvos.length}</span>}
        </div>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.adversario || 'Jogo'}</div>
        {mostraAcoes && podeEditar && (
          <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
            {visto ? (
              <span style={{ color: 'var(--verde-ok, #2e7d5b)', fontWeight: 700 }}>✓ Visto</span>
            ) : (
              <button className="btn btn--secundario btn--pequeno" style={{ padding: '0 5px', fontSize: 10 }} title="Marcar visto" onClick={() => marcarVisto(a)}>
                👁
              </button>
            )}
            <button className="btn btn--secundario btn--pequeno" style={{ padding: '0 5px', fontSize: 10 }} title="Editar dia/hora" onClick={() => abrirAgendar(a)}>
              ⏱
            </button>
            <button className="btn btn--secundario btn--pequeno" style={{ padding: '0 5px', fontSize: 10 }} title="Tirar do dia (volta a Por agendar)" onClick={() => tirar(a)}>
              ↩
            </button>
            <button className="btn btn--perigo btn--pequeno" style={{ padding: '0 5px', fontSize: 10 }} title="Remover da agenda" onClick={() => apagar(a)}>
              ✕
            </button>
          </div>
        )}
        {/* pega de redimensionamento (esticar o bloco, ex.: ao vivo) */}
        {podeEditar && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const colH = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect().height || 400;
              setRedim({ id: a._id, y0: e.clientY, dur0: dur, dur, colH });
            }}
            title="Esticar (duração)"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 7, cursor: 'ns-resize', background: `linear-gradient(${porJogar ? COR_POR_JOGAR : cfg.cor}55, transparent)` }}
          />
        )}
      </div>
    );
  };

  // Exporta o plano da semana como página imprimível (Imprimir → Guardar como PDF).
  const exportarPdf = () => {
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const estadoTxt = (a) => (a.estado === 'Concluído' ? '✓ visto' : jogoRealizado(a) ? 'por ver' : 'por jogar');
    const diasComJogos = dias
      .map((d) => ({ d, jogos: doDia(d).slice().sort((a, b) => new Date(a.visionamento) - new Date(b.visionamento)) }))
      .filter((x) => x.jogos.length);

    // Uma linha da tabela. O dia (ex.: "Ter 25") só aparece no 1.º jogo de cada dia.
    const linha = (a, diaLabel) => {
      const cfg = modoDe(a);
      const inicio = new Date(a.visionamento);
      const fim = new Date(inicio.getTime() + (a.duracaoMin || cfg.dur) * 60000);
      return `<tr class="${diaLabel ? 'novo-dia' : ''}">
        <td class="dia nowrap">${diaLabel}</td>
        <td class="c nowrap">${hm(inicio)}–${hm(fim)}</td>
        <td>${esc(a.adversario || 'Jogo')}</td>
        <td>${esc(a.competicao || '')}</td>
        <td><span class="modo" style="background:${cfg.cor}">${cfg.label}</span></td>
        <td class="nowrap">${estadoTxt(a)}</td>
      </tr>`;
    };

    // UMA só tabela (mais densa → cabe numa página).
    const corpo = diasComJogos
      .map(({ d, jogos }) => {
        const lbl = `${DIAS[(d.getDay() + 6) % 7]} ${d.getDate()}`;
        return jogos.map((a, i) => linha(a, i === 0 ? lbl : '')).join('');
      })
      .join('');

    const tabela = `<table>
      <colgroup><col style="width:16mm"><col style="width:19mm"><col><col style="width:40mm"><col style="width:22mm"><col style="width:18mm"></colgroup>
      <thead><tr><th>Dia</th><th class="c">Ver às</th><th>Jogo</th><th>Competição</th><th>Modo</th><th>Estado</th></tr></thead>
      <tbody>${corpo}</tbody>
    </table>`;

    const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<title>Plano da Semana — ${dataCurta(base)} a ${dataCurta(dias[6])}</title>
<style>
  /* Margem a ZERO de propósito: sem margem de página, o browser não tem onde
     desenhar o cabeçalho/rodapé dele (URL, data, nº de página). As margens reais
     passam a ser o padding de .folha na impressão. */
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #16181d; margin: 0; background: #f2f3f5; }
  .barra { position: sticky; top: 0; background: #16181d; color: #fff; padding: 10px 16px; display: flex; gap: 14px; align-items: center; }
  .barra button { font: inherit; font-weight: 700; background: #a5122a; color: #fff; border: 0; padding: 8px 16px; border-radius: 5px; cursor: pointer; }
  .barra .dica { margin-left: auto; color: #98a0ac; font-size: 12px; }
  @media print { .no-print { display: none !important; } body { background: #fff; } }
  .folha { max-width: 200mm; margin: 12px auto; padding: 18px 22px; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.15); display: flex; flex-direction: column; min-height: 262mm; }
  @media print { .folha { margin: 0; box-shadow: none; max-width: none; padding: 12mm 14mm; height: 297mm; min-height: 0; } }
  header.topo { border-bottom: 3px solid #16181d; padding-bottom: 6px; margin-bottom: 10px; }
  header.topo h1 { margin: 2px 0 0; font-size: 16px; letter-spacing: .02em; }
  header.topo .sub { color: #a5122a; font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: .12em; }
  header.topo .meta { margin-top: 6px; font-size: 12px; color: #555; }
  h2 { font-size: 13.5px; margin: 15px 0 5px; border-bottom: 1px solid #ccc; padding-bottom: 3px; break-after: avoid; }
  /* Larguras fixas: as colunas não se mexem com o tamanho das palavras. */
  table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
  th { text-align: left; background: #f2f3f5; border-bottom: 1.5px solid #16181d; padding: 3px 6px; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
  /* Todas as linhas com a MESMA altura (espaço para 2 linhas de texto); o texto quebra, NÃO corta. */
  td { padding: 2px 6px; height: 10mm; border-bottom: 1px solid #eaecef; vertical-align: middle; line-height: 1.35; overflow-wrap: anywhere; }
  td.c, th.c { text-align: center; }
  td.dia { font-weight: 700; }
  tr.novo-dia td { border-top: 1.4px solid #16181d; }
  tr { break-inside: avoid; }
  .nowrap { white-space: nowrap; }
  .modo { color: #fff; font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 999px; white-space: nowrap; }
  .vazio { color: #777; font-style: italic; margin-top: 20px; }
  footer { margin-top: auto; border-top: 1px solid #ccc; padding-top: 6px; font-size: 10px; color: #777; display: flex; justify-content: space-between; }
</style></head><body>
<div class="barra no-print">
  <strong>Plano da Semana</strong>
  <button onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  <span class="dica">No destino da impressão, escolhe "Guardar como PDF".</span>
</div>
<div class="folha">
  <header class="topo">
    <div class="sub">FC Exemplo · Departamento de Scouting</div>
    <h1>Plano de Observação — Semana ${dataCurta(base)} a ${dataCurta(dias[6])}</h1>
  </header>
  ${corpo ? tabela : '<p class="vazio">Sem jogos agendados nesta semana.</p>'}
  <footer><span>FC Exemplo · Scouting</span><span>Plano da semana</span></footer>
</div>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) return toast('Permite pop-ups neste site para exportar o PDF.', 'erro');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="vsem__nav">
        <button className="vsem__seta" onClick={() => nav(-1)} aria-label="Semana anterior">
          ‹
        </button>
        <span className="vsem__titulo">
          {dataCurta(base)} — {dataCurta(dias[6])}
        </span>
        <button className="vsem__seta" onClick={() => nav(1)} aria-label="Semana seguinte">
          ›
        </button>

        {/* Dropdown "Por agendar" — lista flutuante; cada jogo é arrastável para o horário */}
        <div ref={paRef} style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            className="btn btn--secundario btn--pequeno"
            onClick={() => setPaAberto((v) => !v)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              if (id) api.put('/agendamentos/' + id, { visionamento: null }).then(aoRecarregar);
            }}
            title="Jogos por agendar (larga aqui um bloco para o tirar do dia)"
          >
            Por agendar ({porAgendar.length}) {paAberto ? '▴' : '▾'}
          </button>
          {paAberto && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                zIndex: 60,
                width: 320,
                maxHeight: 360,
                overflowY: 'auto',
                background: 'var(--superficie)',
                border: '1px solid var(--borda)',
                borderRadius: 'var(--raio)',
                boxShadow: '0 10px 28px rgba(0,0,0,0.22)',
                padding: 6,
              }}
            >
              {porAgendar.length === 0 ? (
                <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--texto-suave)' }}>Nada por agendar. Adiciona jogos pelo Calendário.</div>
              ) : (
                porAgendar.map((a) => {
                  const arr = arrastavel(a);
                  return (
                    <div
                      key={a._id}
                      draggable={arr.draggable}
                      onDragStart={(e) => {
                        arr.onDragStart(e);
                        setPaAberto(false); // fecha para poderes largar no horário
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '1px solid var(--borda)',
                        borderLeft: `3px ${jogoRealizado(a) ? 'solid var(--borda)' : `dashed ${COR_POR_JOGAR}`}`,
                        borderRadius: 'var(--raio)',
                        padding: '5px 6px 5px 10px',
                        marginBottom: 5,
                        cursor: 'grab',
                        background: jogoRealizado(a) ? 'var(--superficie)' : BG_POR_JOGAR,
                      }}
                      title={jogoRealizado(a) ? 'Arrasta para o horário ou usa Agendar' : 'Ainda por jogar — arrasta ou usa Agendar'}
                    >
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {jogoRealizado(a) ? '' : '⏳ '}
                        {a.adversario || 'Jogo'}
                        {alvosDe(a).length ? ` · 👤${alvosDe(a).length}` : ''}
                      </span>
                      {podeEditar && (
                        <>
                          <button className="btn btn--secundario btn--pequeno" onClick={() => abrirAgendar(a)}>
                            Agendar
                          </button>
                          <button className="btn btn--perigo btn--pequeno" style={{ padding: '2px 7px' }} title="Remover da agenda" onClick={() => apagar(a)}>
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <button className="btn btn--secundario btn--pequeno" style={{ marginLeft: 8 }} onClick={() => setRef(inicioSemana(new Date()))}>
          Esta semana
        </button>
        <button
          className="btn btn--pequeno"
          style={{ marginLeft: 8 }}
          onClick={exportarPdf}
          title="Exportar o plano da semana em PDF (para enviar ao Diretor Desportivo)"
        >
          📄 Exportar PDF
        </button>
      </div>

      {/* Legenda das cores — por jogar vs já jogado vs visto */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', fontSize: 11, color: 'var(--texto-suave)', margin: '0 2px 6px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: BG_POR_JOGAR, borderLeft: `3px dashed ${COR_POR_JOGAR}`, boxSizing: 'border-box' }} />
          ⏳ Por jogar
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: MODOS.diferido.bg, borderLeft: `3px solid ${MODOS.diferido.cor}`, boxSizing: 'border-box' }} />
          Já jogado (podes ver)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--fundo-alt, #eef6f0)', borderLeft: '3px solid var(--verde-ok, #2e7d5b)', boxSizing: 'border-box' }} />
          ✓ Visto
        </span>
      </div>

      {/* Horário (dias × horas), blocos com duração — cabe todo, sem scroll */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--borda)', borderRadius: 'var(--raio)', overflow: 'hidden' }}>
        {/* cabeçalho fixo */}
        <div style={{ display: 'grid', gridTemplateColumns: '46px repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--borda)', flexShrink: 0 }}>
          <div />
          {dias.map((d, i) => (
            <div
              key={'hd' + i}
              style={{
                textAlign: 'center',
                padding: '3px 0',
                borderLeft: '1px solid var(--borda)',
                background: chaveDia(d) === hojeKey ? 'var(--fundo-alt, #eef2ef)' : 'var(--superficie)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--texto-suave)' }}>{DIAS[i]}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{d.getDate()}</div>
            </div>
          ))}
        </div>
        {/* corpo — colunas a 100% da altura; horas/blocos em % → cabe todo, sem scroll */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
          {/* coluna das horas */}
          <div style={{ width: 46, flexShrink: 0, position: 'relative' }}>
            {Array.from({ length: H1 - H0 }, (_, k) => (
              <div
                key={k}
                style={{ position: 'absolute', top: `${(k / (H1 - H0)) * 100}%`, right: 5, marginTop: 1, fontSize: 10.5, color: 'var(--texto-suave)' }}
              >
                {String(H0 + k).padStart(2, '0')}h
              </div>
            ))}
          </div>
          {/* colunas dos dias */}
          {dias.map((d, i) => (
            <div
              key={'col' + i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) soltar(id, d, e);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                position: 'relative',
                borderLeft: '1px solid var(--borda)',
                backgroundColor: chaveDia(d) === hojeKey ? 'var(--fundo-alt, #f5f8f6)' : 'transparent',
              }}
            >
              {Array.from({ length: H1 - H0 }, (_, k) => (
                <div
                  key={'g' + k}
                  style={{ position: 'absolute', top: `${(k / (H1 - H0)) * 100}%`, left: 0, right: 0, borderTop: '1px solid var(--borda)', opacity: 0.55, pointerEvents: 'none' }}
                />
              ))}
              {doDia(d).map(bloco)}
            </div>
          ))}
        </div>
      </div>

      {agendar && (
        <Modal titulo="Quando (e como) vais ver?" aoFechar={() => setAgendar(null)}>
          <p className="dia-item__sub" style={{ marginTop: 0 }}>
            {agendar.ag.adversario} · {agendar.ag.competicao}
            {agendar.ag.hora ? ` · jogo às ${agendar.ag.hora}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {Object.entries(MODOS).map(([k, m]) => (
              <button
                key={k}
                className={'btn btn--pequeno ' + (agendar.modo === k ? 'btn' : 'btn--secundario')}
                style={agendar.modo === k ? { background: m.cor, borderColor: m.cor } : { borderLeft: `3px solid ${m.cor}` }}
                onClick={() => mudarModo(k)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {MODOS[agendar.modo].hj && (
            <button className="btn btn--secundario btn--pequeno" style={{ marginBottom: 12 }} onClick={() => setAgendar((s) => ({ ...s, data: ymd(s.ag.dataJogo), hora: s.ag.hora || '' }))}>
              ▶ Pôr à hora do jogo ({dataCurta(agendar.ag.dataJogo)}{agendar.ag.hora ? ` · ${agendar.ag.hora}` : ''})
            </button>
          )}
          <div className="form-grelha">
            <div className="campo">
              <label>Dia</label>
              <input type="date" value={agendar.data} onChange={(e) => setAgendar((s) => ({ ...s, data: e.target.value }))} />
            </div>
            <div className="campo">
              <label>Início</label>
              <input type="time" value={agendar.hora} onChange={(e) => setAgendar((s) => ({ ...s, hora: e.target.value }))} />
            </div>
            <div className="campo">
              <label>Duração (min)</label>
              <input type="number" min="30" step="15" value={agendar.duracao} onChange={(e) => setAgendar((s) => ({ ...s, duracao: e.target.value }))} />
            </div>
          </div>
          <div className="modal__rodape" style={{ padding: '18px 0 0', border: 'none' }}>
            <button className="btn btn--secundario" onClick={() => setAgendar(null)}>
              Cancelar
            </button>
            <button className="btn" onClick={guardarAgendar}>
              Agendar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
