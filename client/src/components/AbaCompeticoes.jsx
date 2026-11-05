import { Fragment, useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { dataCurta, CLUBE_PROPRIO as CLUBE, CLUBE_PROPRIO_TOKEN } from '../lib.js';
import { useToast } from './Toasts.jsx';

const EPOCA = '2026/27';
// Normaliza nomes para detetar o clube próprio na tabela (grafias diferentes zerozero/FPF).
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const ehProprio = (nome) => norm(nome).includes(CLUBE_PROPRIO_TOKEN);

export default function AbaCompeticoes({ aoAbrirJogo, calAlvos = {}, vistoIdDoJogo, idsNaAgenda }) {
  const toast = useToast();
  const { podeEditar, ehTecnico } = useAuth();
  const [competicoes, setCompeticoes] = useState([]);
  const [compSel, setCompSel] = useState('');
  const [jogos, setJogos] = useState([]);
  const [serieSel, setSerieSel] = useState('');
  const [classif, setClassif] = useState(null);
  const [temFonte, setTemFonte] = useState(false);
  const [atualizado, setAtualizado] = useState(null);
  const [aImportar, setAImportar] = useState(false);

  useEffect(() => {
    api.get('/calendario/meta').then((m) => {
      const cs = m.competicoes || [];
      setCompeticoes(cs);
      if (cs.length && !compSel) setCompSel(cs.includes('Campeonato de Portugal') ? 'Campeonato de Portugal' : cs[0]);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ao mudar de competição: carrega os jogos todos dessa competição.
  useEffect(() => {
    if (!compSel) return;
    api.get('/calendario?competicao=' + encodeURIComponent(compSel)).then((js) => {
      setJogos(js || []);
      const series = [...new Set((js || []).map((j) => j.serie).filter(Boolean))].sort();
      setSerieSel((s) => (series.includes(s) ? s : series[0] || ''));
    }).catch(() => setJogos([]));
  }, [compSel]);

  const series = useMemo(() => [...new Set(jogos.map((j) => j.serie).filter(Boolean))].sort(), [jogos]);
  // Competições por eliminatórias (Taça, play-offs) não têm classificação.
  const semClassif = /ta[cç]a|elimin|play-?off/i.test(compSel);

  const carregarClassif = useCallback(() => {
    if (!compSel) return;
    const p = new URLSearchParams({ competicao: compSel });
    if (serieSel) p.set('serie', serieSel);
    api.get('/classificacao?' + p.toString()).then((r) => {
      setClassif(r.classificacao);
      setTemFonte(r.temFonte);
      setAtualizado(r.classificacao?.atualizadoEm || null);
    }).catch(() => { setClassif(null); setTemFonte(false); });
  }, [compSel, serieSel]);

  useEffect(carregarClassif, [carregarClassif]);

  const atualizar = async () => {
    setAImportar(true);
    const body = { competicao: compSel, serie: serieSel, epoca: EPOCA };
    try {
      let res;
      try {
        res = await api.post('/classificacao/importar', body);
      } catch (e) {
        if (e.status === 409 && e.corpo?.semFonte) {
          const url = window.prompt(
            'Não tenho o link desta competição no zerozero. Cola aqui o link da edição (classificação):',
            ''
          );
          if (!url) { setAImportar(false); return; }
          res = await api.post('/classificacao/importar', { ...body, url: url.trim() });
        } else {
          throw e;
        }
      }
      setClassif(res.classificacao);
      setTemFonte(true);
      setAtualizado(res.classificacao?.atualizadoEm || new Date().toISOString());
      toast(`Classificação atualizada (${res.inseridas} equipas).`, 'ok');
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    } finally {
      setAImportar(false);
    }
  };

  const jogosSerie = useMemo(
    () => jogos.filter((j) => (serieSel ? j.serie === serieSel : true)).sort((a, b) => new Date(a.data) - new Date(b.data)),
    [jogos, serieSel]
  );

  // Agrupa por jornada (jornadas numéricas por ordem; sem jornada no fim).
  const porJornada = useMemo(() => {
    const mapa = new Map();
    for (const j of jogosSerie) {
      const k = j.jornada != null && j.jornada !== '' ? Number(j.jornada) : null;
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k).push(j);
    }
    const chaves = [...mapa.keys()].sort((a, b) => (a == null ? 1 : b == null ? -1 : a - b));
    return chaves.map((k) => ({ jornada: k, jogos: mapa.get(k) }));
  }, [jogosSerie]);

  // Mostrar só DUAS jornadas de cada vez: por omissão, a última jogada + a próxima.
  // (Com setas ‹ › navega-se as restantes. Competições sem jornadas → mostra tudo.)
  const jornadasNum = useMemo(() => porJornada.filter((p) => p.jornada != null), [porJornada]);
  const maxInicio = Math.max(0, jornadasNum.length - 2);
  const defInicio = useMemo(() => {
    if (!jornadasNum.length) return 0;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const concluida = (p) => p.jogos.every((g) => new Date(g.data) < hoje);
    let idx = jornadasNum.findIndex((p) => !concluida(p)); // 1ª não concluída = a próxima
    if (idx === -1) idx = jornadasNum.length - 1; // época terminada → últimas duas
    return Math.max(0, Math.min(idx - 1, maxInicio));
  }, [jornadasNum, maxInicio]);

  const [janelaInicio, setJanelaInicio] = useState(null); // null = usar o default
  useEffect(() => { setJanelaInicio(null); }, [compSel, serieSel]);
  const inicio = Math.max(0, Math.min(janelaInicio ?? defInicio, maxInicio));
  const janela = jornadasNum.length ? jornadasNum.slice(inicio, inicio + 2) : porJornada;

  return (
    <div className="comp-pagina">
      <div className="filtros">
        <select value={compSel} onChange={(e) => setCompSel(e.target.value)}>
          {competicoes.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
        {series.length > 0 && (
          <select value={serieSel} onChange={(e) => setSerieSel(e.target.value)}>
            {series.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        )}
        {!semClassif && (
          <>
            {podeEditar && (
              <button className="btn btn--secundario btn--pequeno" onClick={atualizar} disabled={aImportar}>
                {aImportar ? 'A atualizar…' : '↻ Atualizar classificação'}
              </button>
            )}
            {atualizado && (
              <span style={{ fontSize: 12, color: 'var(--texto-suave)', alignSelf: 'center' }}>
                atualizada {dataCurta(atualizado)}
              </span>
            )}
          </>
        )}
      </div>

      <div className={semClassif ? '' : 'comp-grid'}>
        {!semClassif && (
        <div>
          <h3 className="seccao-titulo">Classificação</h3>
          {!classif || !classif.linhas?.length ? (
            <div className="tabela-wrap">
              <div className="tabela-vazia" style={{ padding: 16 }}>
                {temFonte
                  ? 'Sem classificação guardada — clica em “↻ Atualizar classificação”.'
                  : 'Classificação por configurar — clica em “↻ Atualizar classificação” e cola o link do zerozero.'}
              </div>
            </div>
          ) : (
            <div className="tabela-wrap">
              <table className="comp-tabela">
                <thead>
                  <tr>
                    <th className="c">#</th>
                    <th>Equipa</th>
                    <th className="c">J</th>
                    <th className="c">V</th>
                    <th className="c">E</th>
                    <th className="c">D</th>
                    <th className="c">GM</th>
                    <th className="c">GS</th>
                    <th className="c">DG</th>
                    <th className="c">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {classif.linhas.map((l) => (
                    <tr key={(l.posicao ?? '') + l.equipa} className={ehProprio(l.equipa) ? 'comp-tabela__proprio' : ''}>
                      <td className="c num">{l.posicao ?? '—'}</td>
                      <td>{l.equipa}</td>
                      <td className="c num">{l.jogos ?? '—'}</td>
                      <td className="c num">{l.vitorias ?? '—'}</td>
                      <td className="c num">{l.empates ?? '—'}</td>
                      <td className="c num">{l.derrotas ?? '—'}</td>
                      <td className="c num">{l.golosMarcados ?? '—'}</td>
                      <td className="c num">{l.golosSofridos ?? '—'}</td>
                      <td className="c num">{l.diferenca != null ? (l.diferenca > 0 ? '+' + l.diferenca : l.diferenca) : '—'}</td>
                      <td className="c num"><strong>{l.pontos ?? '—'}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        <div>
          {semClassif && (
            <div className="obs-vazio" style={{ marginBottom: 10 }}>
              Competição por eliminatórias — sem classificação.
            </div>
          )}
          <div className="comp-cal-cab">
            <h3 className="seccao-titulo" style={{ margin: 0 }}>Calendário</h3>
            {jornadasNum.length > 0 && (
              <div className="comp-jornada-nav">
                <button
                  type="button"
                  className="comp-jornada-nav__btn"
                  disabled={inicio <= 0}
                  onClick={() => setJanelaInicio(inicio - 1)}
                  title="Jornadas anteriores"
                >
                  ‹
                </button>
                <span className="comp-jornada-nav__rot">
                  {janela.length > 1 ? `Jornadas ${janela[0].jornada}–${janela[janela.length - 1].jornada}` : `Jornada ${janela[0]?.jornada ?? '—'}`}
                </span>
                <button
                  type="button"
                  className="comp-jornada-nav__btn"
                  disabled={inicio >= maxInicio}
                  onClick={() => setJanelaInicio(inicio + 1)}
                  title="Jornadas seguintes"
                >
                  ›
                </button>
              </div>
            )}
          </div>
          <div className="tabela-wrap">
            <table className="comp-calendario">
              <tbody>
                {janela.length === 0 ? (
                  <tr><td className="tabela-vazia">Sem jogos.</td></tr>
                ) : (
                  janela.map(({ jornada, jogos }) => (
                    <Fragment key={jornada ?? 'sem'}>
                      <tr className="comp-jornada">
                        <td colSpan={2}>{jornada != null ? `Jornada ${jornada}` : 'Sem jornada'}</td>
                      </tr>
                      {jogos.map((j) => {
                        const ehProprioJogo = j.casa === CLUBE || j.fora === CLUBE;
                        const nObs = calAlvos[j._id]?.nObservaveis || 0;
                        const visto = vistoIdDoJogo?.(j._id);
                        const naAgenda = idsNaAgenda?.has(String(j._id));
                        return (
                          <tr
                            key={j._id}
                            className={'comp-jogo' + (ehProprioJogo ? ' comp-tabela__proprio' : '')}
                            onClick={() => aoAbrirJogo?.(j)}
                            title="Abrir ações do jogo (jogadores, observar, agenda)"
                          >
                            <td className="num comp-jogo__data">
                              {dataCurta(j.data)}
                              {j.hora ? ' · ' + j.hora : ''}
                            </td>
                            <td>
                              <span className={j.casa === CLUBE ? 'forte' : ''}>{j.casa}</span>
                              {' × '}
                              <span className={j.fora === CLUBE ? 'forte' : ''}>{j.fora}</span>
                              {nObs > 0 && !ehTecnico && <span className="comp-jogo__tag comp-jogo__tag--alvo">👤 {nObs}</span>}
                              {visto && <span className="comp-jogo__tag comp-jogo__tag--visto">✓ visto</span>}
                              {naAgenda && <span className="comp-jogo__tag comp-jogo__tag--agd">📅 agenda</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
