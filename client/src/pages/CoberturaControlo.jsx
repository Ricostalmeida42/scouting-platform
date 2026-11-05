import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { dataCurta, CLUBE_PROPRIO } from '../lib.js';

// Espelha o norm() do servidor (routes/calendario.js) para casar nomes de equipa.
const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[."'`]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mondayOf = (d) => {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0 = segunda
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
};
const dm = (d) => {
  const x = new Date(d);
  return `${x.getDate()} ${MES[x.getMonth()]}`;
};
// YYYY-MM-DD em hora LOCAL (não UTC) — senão a segunda-feira à meia-noite local
// recua um dia no toISOString e a etiqueta da semana fica desalinhada.
const ymdLocal = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// Etiqueta curta + cor por competição (para a lista de check).
const TAGS = {
  'Liga Principal': { t: 'Liga', c: '#0e7a43' },
  'Liga Regional — 1ª Divisão': { t: 'Regional', c: '#1d6fb8' },
  'Liga Sub-23': { t: 'Sub-23', c: '#7a4bd0' },
  'Liga Sub-19': { t: 'Sub-19', c: '#a5122a' },
};

const cartao = {
  background: 'var(--superficie)',
  border: '1px solid var(--borda)',
  borderRadius: 'var(--raio)',
  boxShadow: 'var(--sombra)',
  padding: '16px 18px',
  marginBottom: 18,
};
const hTit = { margin: '0 0 10px', fontSize: 15 };
const hSub = { margin: '0 0 6px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--texto-suave)' };

function Chip({ valor, label }) {
  return (
    <div className="chip">
      <b>{valor}</b>
      <span>{label}</span>
    </div>
  );
}

// O próprio clube do scout (CLUBE_PROPRIO). Destaca-se a outra cor porque não é
// um alvo de scouting como os rivais — já o conhece de sobra (amigáveis + oficiais).
const tokenProprio = norm(CLUBE_PROPRIO);
const ehProprio = (equipa) => norm(equipa).includes(tokenProprio);

const badgePill = {
  marginLeft: 8,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
  color: 'var(--branco)',
  padding: '2px 6px',
  borderRadius: 999,
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
};

const AZUL = '#1d6fb8'; // destaque dos clubes que já vi jogos (distinto do verde/vermelho)
const AZUL_FUNDO = 'rgba(29,111,184,0.12)';

function LinhaEquipa({ l, obj, contador, sinaliza }) {
  const proprio = ehProprio(l.equipa);
  const flag = sinaliza && !proprio && l.nAlvos > 0; // clube com jogadores da zona
  const mostrarAlvos = sinaliza && !proprio; // nº de jogadores da zona SEMPRE à frente do nome (mesmo 0)
  const visto = sinaliza && !proprio && l.vistos > 0; // já vi jogos deste clube
  const cor = proprio
    ? 'var(--verde)'
    : !contador && l.vistos >= obj
      ? 'var(--verde-ok, #2e7d5b)'
      : l.vistos > 0
        ? 'var(--verde-ok, #2e7d5b)'
        : 'var(--texto-suave)';
  const destaque = proprio || flag || visto;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px',
        margin: destaque ? '0 -6px' : 0,
        borderRadius: destaque ? 6 : 0,
        // já vi (azul) tem prioridade no fundo; o "tem alvos" fica no badge verde.
        background: proprio ? 'var(--vermelho-fundo)' : visto ? AZUL_FUNDO : flag ? 'rgba(46,125,91,0.10)' : 'transparent',
        borderLeft: visto ? `3px solid ${AZUL}` : '3px solid transparent',
        borderBottom: '1px solid var(--borda)',
      }}
    >
      {mostrarAlvos && (
        <span
          style={{
            flex: '0 0 auto',
            minWidth: 34,
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: l.nAlvos > 0 ? 'var(--verde-ok, #2e7d5b)' : 'var(--texto-3)',
          }}
          title={`${l.nAlvos} jogador(es) da zona neste clube`}
        >
          👤 {l.nAlvos}
        </span>
      )}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: proprio ? 'var(--verde)' : 'inherit',
          fontWeight: destaque ? 700 : 400,
        }}
      >
        {l.equipa}
        {proprio && <span style={{ ...badgePill, background: 'var(--verde)' }}>o teu clube</span>}
      </span>
      {proprio || contador ? (
        <span
          style={{
            flex: '0 0 auto',
            fontSize: 11.5,
            fontWeight: 600,
            ...(visto
              ? { background: AZUL, color: 'var(--branco)', padding: '2px 7px', borderRadius: 999 }
              : { color: proprio && l.vistos > 0 ? 'var(--verde)' : 'var(--texto-suave)' }),
          }}
        >
          visto {l.vistos}×
        </span>
      ) : (
        <>
          <span style={{ display: 'flex', gap: 3, flex: '0 0 auto' }}>
            {Array.from({ length: obj }).map((_, i) => (
              <i
                key={i}
                style={{ width: 8, height: 8, borderRadius: '50%', background: i < l.vistos ? cor : 'var(--borda)' }}
              />
            ))}
          </span>
          <b style={{ flex: '0 0 34px', textAlign: 'right', fontSize: 12.5, color: cor, fontVariantNumeric: 'tabular-nums' }}>
            {l.vistos}/{obj}
          </b>
        </>
      )}
    </div>
  );
}

function LinhaJogo({ j, visto, guardando, onToggle, podeEditar = true }) {
  const mapa = TAGS[j.competicao];
  // Competições fora das metas (Liga 3, Taça…) já trazem a série no nome — mostra-as
  // limpas, sem repetir; as das metas usam a etiqueta curta + série abreviada.
  const tag = mapa || { t: (j.competicao || '—').replace(/ · .*/, ''), c: 'var(--texto-suave)' };
  const serieCurta = mapa && j.serie ? ' ' + j.serie.replace('Série', 'S').replace('érie', '') : '';
  const modo = j.modo === 'ao_vivo' ? 'ao vivo' : j.modo === 'em_direto' ? 'direto' : 'diferido';
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
        borderBottom: '1px solid var(--borda)',
        cursor: podeEditar ? 'pointer' : 'default',
        opacity: guardando ? 0.5 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={visto}
        onChange={podeEditar ? onToggle : undefined}
        disabled={guardando || !podeEditar}
        style={{ width: 17, height: 17, accentColor: 'var(--verde)', flex: '0 0 auto', cursor: podeEditar ? 'pointer' : 'default' }}
      />
      <span style={{ flex: '0 0 70px', fontSize: 12, color: 'var(--texto-suave)' }}>
        {dataCurta(j.visionamento || j.data)}
      </span>
      <span style={{ flex: '0 0 66px', fontSize: 11, fontWeight: 700, color: tag.c, whiteSpace: 'nowrap' }}>
        {tag.t}
        {serieCurta}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 13,
          textDecoration: visto ? 'line-through' : 'none',
          color: visto ? 'var(--texto-suave)' : 'var(--texto)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {j.casa} <span style={{ color: 'var(--texto-suave)' }}>×</span> {j.fora}
      </span>
      <span style={{ flex: '0 0 auto', fontSize: 11, color: 'var(--texto-suave)' }}>{modo}</span>
    </label>
  );
}

export default function CoberturaControlo() {
  const { podeEditar } = useAuth();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [filtro, setFiltro] = useState('todos'); // todos | porver | vistos
  const [guardando, setGuardando] = useState({});
  const [semanaKey, setSemanaKey] = useState(null); // wk (segunda-feira ISO) da semana mostrada; null = semana atual

  useEffect(() => {
    api.get('/dashboard/cobertura').then(setDados).catch((e) => setErro(e.message));
  }, []);

  // Um jogo da agenda está "visto" se existe um registo de jogo visto
  // (ObservacaoJogo) para o mesmo jogo do calendário (ou, em manuais, mesma
  // data + equipas).
  const vistoDoJogo = (jogo) => {
    const vs = dados?.vistos || [];
    if (jogo.calendarioJogo) {
      const byCal = vs.find((v) => v.calendarioJogo && String(v.calendarioJogo) === String(jogo.calendarioJogo));
      if (byCal) return byCal;
    }
    const k = ymdLocal(jogo.data) + '|' + norm(jogo.casa) + '|' + norm(jogo.fora);
    return vs.find((v) => ymdLocal(v.data) + '|' + norm(v.casa) + '|' + norm(v.fora) === k) || null;
  };

  // Marcar/desmarcar "vi o jogo": a fonte é o registo de jogo visto
  // (ObservacaoJogo). Cria/remove esse registo E conclui/reabre o agendamento
  // ligado — igual ao "Vi este jogo" da Agenda, para tudo ficar sincronizado.
  const alternar = async (jogo) => {
    const visto = vistoDoJogo(jogo);
    setGuardando((g) => ({ ...g, [jogo._id]: true }));
    try {
      if (visto) {
        await api.del('/observacoes-jogo/' + visto._id);
        await api.patch(`/agendamentos/${jogo._id}/estado`, { estado: 'Planeado' });
        setDados((d) => ({
          ...d,
          vistos: d.vistos.filter((v) => v._id !== visto._id),
          jogos: d.jogos.map((j) => (j._id === jogo._id ? { ...j, estado: 'Planeado' } : j)),
        }));
      } else {
        const novo = await api.post('/observacoes-jogo', {
          calendarioJogo: jogo.calendarioJogo || null,
          data: jogo.data,
          hora: jogo.hora || '',
          competicao: jogo.competicao || '',
          serie: jogo.serie || '',
          casa: jogo.casa,
          fora: jogo.fora,
        });
        await api.patch(`/agendamentos/${jogo._id}/estado`, { estado: 'Concluído' });
        setDados((d) => ({
          ...d,
          vistos: [
            ...d.vistos,
            {
              _id: novo._id,
              calendarioJogo: jogo.calendarioJogo || null,
              data: jogo.data,
              casa: jogo.casa,
              fora: jogo.fora,
              competicao: jogo.competicao || '',
              serie: jogo.serie || '',
            },
          ],
          jogos: d.jogos.map((j) => (j._id === jogo._id ? { ...j, estado: 'Concluído' } : j)),
        }));
      }
    } catch (e) {
      alert('Não deu para guardar: ' + e.message);
    } finally {
      setGuardando((g) => {
        const n = { ...g };
        delete n[jogo._id];
        return n;
      });
    }
  };

  // Ids dos jogos da agenda que já têm jogo visto (para o check e os filtros).
  const idsVistos = useMemo(() => {
    if (!dados) return new Set();
    const cal = new Set(dados.vistos.filter((v) => v.calendarioJogo).map((v) => String(v.calendarioJogo)));
    const keys = new Set(dados.vistos.map((v) => ymdLocal(v.data) + '|' + norm(v.casa) + '|' + norm(v.fora)));
    const s = new Set();
    for (const j of dados.jogos) {
      if (
        (j.calendarioJogo && cal.has(String(j.calendarioJogo))) ||
        keys.has(ymdLocal(j.data) + '|' + norm(j.casa) + '|' + norm(j.fora))
      ) {
        s.add(j._id);
      }
    }
    return s;
  }, [dados]);

  const matriz = useMemo(() => {
    if (!dados) return [];
    const cont = {};
    for (const v of dados.vistos) {
      for (const t of [v.casa, v.fora]) {
        const k = norm(t);
        if (k) cont[k] = (cont[k] || 0) + 1;
      }
    }
    return dados.secoes.map((s) => {
      const contador = !!s.contador;
      const linhas = s.equipas
        .map((eq) => {
          const v = cont[norm(eq)] || 0;
          const nAlvos = (s.alvos && s.alvos[eq]) || 0;
          return { equipa: eq, vistos: v, nAlvos, cumprido: !contador && s.objetivo ? v >= s.objetivo : false };
        })
        // O próprio clube (Clube) fica sempre no topo — é a âncora da secção.
        // Secções com objetivo: por fazer primeiro. Secções-contador (outras séries
        // do CP): os clubes COM jogadores da zona primeiro (mais alvos no topo).
        .sort((a, b) => {
          const la = ehProprio(a.equipa);
          const lb = ehProprio(b.equipa);
          if (la !== lb) return la ? -1 : 1;
          if (contador) {
            if ((a.nAlvos > 0) !== (b.nAlvos > 0)) return a.nAlvos > 0 ? -1 : 1;
            if (a.nAlvos !== b.nAlvos) return b.nAlvos - a.nAlvos;
            if (a.vistos !== b.vistos) return b.vistos - a.vistos;
            return a.equipa.localeCompare(b.equipa, 'pt');
          }
          return a.cumprido !== b.cumprido
            ? a.cumprido - b.cumprido
            : a.vistos !== b.vistos
              ? a.vistos - b.vistos
              : a.equipa.localeCompare(b.equipa, 'pt');
        });
      // O clube não entra nos contadores da secção.
      const semProprio = linhas.filter((l) => !ehProprio(l.equipa));
      const jogosVistos = dados.vistos.filter(
        (v) => v.competicao === s.comp && (s.serie ? v.serie === s.serie : true)
      ).length;
      return {
        ...s,
        contador,
        linhas,
        cumpridas: semProprio.filter((l) => l.cumprido).length,
        totalEq: semProprio.length,
        nClubesAlvo: semProprio.filter((l) => l.nAlvos > 0).length,
        jogosVistos,
      };
    });
  }, [dados]);

  const semanas = useMemo(() => {
    if (!dados) return [];
    // A checklist é a agenda de visionamento: só entram jogos COM horário marcado.
    // Os que estão "por agendar" (sem visionamento) não aparecem — são geridos na Agenda.
    let js = dados.jogos.filter((j) => j.visionamento);
    if (filtro === 'porver') js = js.filter((j) => !idsVistos.has(j._id));
    if (filtro === 'vistos') js = js.filter((j) => idsVistos.has(j._id));
    const grupos = {};
    for (const j of js) {
      const mon = mondayOf(j.visionamento);
      const wk = ymdLocal(mon);
      if (!grupos[wk]) grupos[wk] = { mon, jogos: [] };
      grupos[wk].jogos.push(j);
    }
    return Object.keys(grupos)
      .sort()
      .map((wk) => {
        if (wk === 'sem-data') return { wk, rotulo: 'Sem data', jogos: grupos[wk].jogos };
        const mon = grupos[wk].mon;
        const dom = new Date(mon);
        dom.setDate(dom.getDate() + 6);
        return { wk, rotulo: `${dm(mon)} – ${dm(dom)}`, jogos: grupos[wk].jogos };
      });
  }, [dados, filtro, idsVistos]);

  // Navegação por semana: índice da semana a mostrar. Se a semana escolhida deixar
  // de existir (mudou o filtro / marcou o último jogo), volta à semana atual.
  const hojeWk = useMemo(() => ymdLocal(mondayOf(new Date())), []);
  const idxSemana = useMemo(() => {
    if (!semanas.length) return -1;
    const i = semanas.findIndex((w) => w.wk === semanaKey);
    if (i >= 0) return i;
    const f = semanas.findIndex((w) => w.wk >= hojeWk);
    return f >= 0 ? f : semanas.length - 1;
  }, [semanas, semanaKey, hojeWk]);

  if (erro) return <div className="carregar">Erro a carregar: {erro}</div>;
  if (!dados) return <div className="carregar">A carregar…</div>;

  const totalVistos = dados.vistos.length; // fonte única = jogos vistos (= Resumo)

  return (
    <div>
      <section style={cartao}>
        <h3 style={hTit}>Como está a correr</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--texto-suave)' }}>
          Cada jogo que marcas como visto conta <b>+1 para as duas equipas</b>. Os jogos vêm da tua agenda — muda-a à
          vontade que isto acompanha.
        </p>
        <div className="chips-linha">
          <Chip valor={totalVistos} label="Jogos vistos" />
          {matriz.map((s) => (
            <Chip
              key={s.label}
              valor={s.contador ? `${s.jogosVistos}` : `${s.cumpridas}/${s.totalEq}`}
              label={s.contador ? `${s.label} · vistos` : s.label}
            />
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 18 }}>
        {matriz.map((s) => (
          <section key={s.label} style={{ ...cartao, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <h3 style={{ ...hTit, margin: 0 }}>{s.label}</h3>
              <span style={{ fontSize: 12, color: 'var(--texto-suave)', whiteSpace: 'nowrap' }}>
                {s.contador
                  ? `${s.jogosVistos} vistos · ${s.nClubesAlvo} c/ alvos`
                  : `obj ${s.objetivo}× · ${s.cumpridas}/${s.totalEq}`}
              </span>
            </div>
            {s.linhas.map((l) => (
              <LinhaEquipa key={l.equipa} l={l} obj={s.objetivo} contador={s.contador} sinaliza={s.sinaliza} />
            ))}
          </section>
        ))}
      </div>

      <section style={cartao}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ ...hTit, margin: 0 }}>Jogos na agenda — marca os que já viste</h3>
          <div className="sub-abas" style={{ border: 'none', margin: 0 }}>
            {[
              ['todos', 'Todos'],
              ['porver', 'Por ver'],
              ['vistos', 'Vistos'],
            ].map(([f, lbl]) => (
              <button key={f} className={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        {semanas.length === 0 || idxSemana < 0 ? (
          <p style={{ color: 'var(--texto-suave)', fontSize: 13, margin: 0 }}>Nenhum jogo na agenda para mostrar.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <button
                className="btn btn--secundario btn--pequeno"
                disabled={idxSemana <= 0}
                onClick={() => setSemanaKey(semanas[idxSemana - 1].wk)}
              >
                ‹ Anterior
              </button>
              <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{semanas[idxSemana].rotulo}</div>
                <div style={{ fontSize: 11.5, color: 'var(--texto-suave)' }}>
                  Semana {idxSemana + 1} de {semanas.length} · {semanas[idxSemana].jogos.length} jogo
                  {semanas[idxSemana].jogos.length === 1 ? '' : 's'}
                  {semanaKey && (
                    <>
                      {' · '}
                      <button
                        onClick={() => setSemanaKey(null)}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--verde)', cursor: 'pointer', font: 'inherit', fontSize: 11.5 }}
                      >
                        ir para agora
                      </button>
                    </>
                  )}
                </div>
              </div>
              <button
                className="btn btn--secundario btn--pequeno"
                disabled={idxSemana >= semanas.length - 1}
                onClick={() => setSemanaKey(semanas[idxSemana + 1].wk)}
              >
                Seguinte ›
              </button>
            </div>
            {semanas[idxSemana].jogos.map((j) => (
              <LinhaJogo
                key={j._id}
                j={j}
                visto={idsVistos.has(j._id)}
                guardando={!!guardando[j._id]}
                onToggle={() => alternar(j)}
                podeEditar={podeEditar}
              />
            ))}
          </>
        )}
      </section>
    </div>
  );
}
