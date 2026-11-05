import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useEhTelemovel } from '../hooks.js';
import FichaJogador from './FichaJogador.jsx';
import {
  POSICOES,
  RENDIMENTOS,
  POTENCIAIS,
  PERFIS,
  PERFIL_LABEL,
  VEREDITOS,
  AVALIACAO_NIVEIS,
  AVALIACAO_NIVEL_LABEL,
  RENDIMENTO_LABEL,
  POTENCIAL_LABEL,
  PERFIL_NUM,
  IDADE_MAX_POTENCIAL,
  OPCOES_CONTRATO,
  corVeredito,
  posCurto,
  idade,
  estadoContrato,
  codigoJogador,
} from '../lib.js';

// Ordenação da lista — cliente, estável (só muda ao escolher no cabeçalho).
const POS_INDICE = Object.fromEntries(POSICOES.map((p, i) => [p.key, i]));
const valorOrdem = (j, campo) => {
  switch (campo) {
    case 'adicao': return j.createdAt ? new Date(j.createdAt).getTime() : null;
    case 'pos': return POS_INDICE[j.posicaoPrincipal] ?? 99;
    case 'clube': return (j.clubeAtual || '').toLowerCase();
    case 'rating': return j.ratingFinal ?? j.ratingRCA ?? null;
    case 'obs': return j.nObservacoes ?? 0;
    case 'veredito': { const i = VEREDITOS.indexOf(j.veredito); return i < 0 ? 99 : i; }
    case 'rend': { const i = RENDIMENTOS.indexOf(j.rendimento); return i < 0 ? 99 : i; }
    case 'pot': { const i = POTENCIAIS.indexOf(j.potencialClass); return i < 0 ? 99 : i; }
    case 'perfil': return (j.perfil || '~');
    case 'imed': return j.avaliacaoImediata ?? null;
    case 'mp': return j.avaliacaoMedioPrazo ?? null;
    case 'lp': return j.avaliacaoLongoPrazo ?? null;
    case 'tecnica': return j.avaliacao?.tecnica ?? null;
    case 'tatica': return j.avaliacao?.tatica ?? null;
    case 'fisica': return j.avaliacao?.fisica ?? null;
    case 'mental': return j.avaliacao?.mental ?? null;
    case 'altura': return j.altura || '';
    case 'idade': return j.dataNascimento ? new Date(j.dataNascimento).getTime() : null;
    case 'nome':
    default: return (j.nomeCompleto || '').toLowerCase();
  }
};

const FILTROS_VAZIOS = {
  q: '', posicao: '', rendimento: '', potencial: '', perfil: '', veredito: '',
  avImediata: '', avMedio: '', avLongo: '', mercado: '', contrato: '', liga: '',
};

// Cor do nível de avaliação (1-5): quanto mais alto, melhor.
const corNivel = (n) =>
  n == null ? 'var(--texto-3)' : n >= 4 ? 'var(--verde-ok)' : n === 3 ? 'var(--texto)' : n === 2 ? 'var(--amarelo)' : 'var(--vermelho)';
// Igual, mas aceita valores decimais (dimensões do plantel: 1-5 com 1 casa).
const corNivelDec = (n) =>
  n == null ? 'var(--texto-3)' : n >= 4 ? 'var(--verde-ok)' : n >= 3 ? 'var(--texto)' : n >= 2 ? 'var(--amarelo)' : 'var(--vermelho)';

const anoContr = (d) => (d ? new Date(d).getFullYear() : null);
const PE_CURTO = { Esquerdo: 'Esq', Direito: 'Dir', Ambidestro: 'Amb' };
const nacCurta = (s) => (s ? s.split('/')[0].trim() : '');

// Célula de uma dimensão do plantel (1-5, 1 casa decimal).
function CelDim({ n }) {
  return (
    <span className="num" style={{ fontWeight: 700, color: corNivelDec(n) }}>
      {typeof n === 'number' ? n.toFixed(1) : '–'}
    </span>
  );
}

function Veredito({ v }) {
  if (!v) return <span className="jog-muted">–</span>;
  const cor = corVeredito(v);
  return (
    <span
      className="badge"
      style={{ color: cor, background: `color-mix(in srgb, ${cor} 14%, transparent)`, borderColor: `color-mix(in srgb, ${cor} 36%, transparent)`, whiteSpace: 'nowrap' }}
    >
      {v}
    </span>
  );
}

function CelNivel({ n }) {
  return (
    <span className="num" style={{ fontWeight: 700, color: corNivel(n) }} title={n ? AVALIACAO_NIVEL_LABEL[n] : 'sem avaliação'}>
      {n ?? '–'}
    </span>
  );
}

export default function Jogadores({ plantel = false, rotaBase = '/jogadores' }) {
  const navegar = useNavigate();
  const { id: selId } = useParams();
  const ehTelemovel = useEhTelemovel();
  const detalheRef = useRef(null);
  const [jogadores, setJogadores] = useState([]);
  const [contadores, setContadores] = useState(null); // nº por veredito (painel de referência)
  const [carregar, setCarregar] = useState(true);
  const [maisFiltros, setMaisFiltros] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const CHAVE_ORDEM = plantel ? 'plantel.ordem' : 'basedados.ordem';
  const ORDEM_PADRAO = plantel ? { campo: 'pos', dir: 'asc' } : { campo: 'veredito', dir: 'asc' };
  const [ordem, setOrdem] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE_ORDEM) || 'null');
      if (s && s.campo) return s;
    } catch { /* ignora */ }
    return ORDEM_PADRAO;
  });

  const mudarOrdem = (nova) => {
    try { localStorage.setItem(CHAVE_ORDEM, JSON.stringify(nova)); } catch { /* ignora */ }
    setOrdem(nova);
  };
  const DESC_POR_OMISSAO = new Set(['adicao', 'rating', 'obs', 'imed', 'mp', 'lp', 'tecnica', 'tatica', 'fisica', 'mental']);
  const ordenarPor = (campo) =>
    mudarOrdem(
      ordem.campo === campo
        ? { campo, dir: ordem.dir === 'asc' ? 'desc' : 'asc' }
        : { campo, dir: DESC_POR_OMISSAO.has(campo) ? 'desc' : 'asc' }
    );
  const caret = (campo) => (ordem.campo === campo ? (ordem.dir === 'asc' ? ' ▲' : ' ▼') : '');

  const ordenados = useMemo(() => {
    const { campo, dir } = ordem;
    const mult = dir === 'asc' ? 1 : -1;
    const nome = (j) => (j.nomeCompleto || '').toLowerCase();
    return [...jogadores].sort((a, b) => {
      const va = valorOrdem(a, campo);
      const vb = valorOrdem(b, campo);
      const na = va === null || va === undefined || va === '' || (typeof va === 'number' && Number.isNaN(va));
      const nb = vb === null || vb === undefined || vb === '' || (typeof vb === 'number' && Number.isNaN(vb));
      if (na && nb) return nome(a).localeCompare(nome(b), 'pt');
      if (na) return 1;
      if (nb) return -1;
      const c = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt');
      return c !== 0 ? c * mult : nome(a).localeCompare(nome(b), 'pt');
    });
  }, [jogadores, ordem]);

  const carregarLista = useCallback(async () => {
    setCarregar(true);
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => v && params.set(k, v));
    params.set('incluirArquivo', 'true'); // o veredito classifica — não esconder nada por estado
    if (plantel) params.set('plantel', 'true'); // aba Plantel: só jogadores do clube
    try {
      const lista = await api.get('/players?' + params.toString());
      setJogadores(lista);
    } finally {
      setCarregar(false);
    }
    // Painel de referência (contagem por veredito) — só na Base de dados.
    if (!plantel) {
      api.get('/players/contadores', { silencioso: true }).then(setContadores).catch(() => {});
    }
  }, [filtros, plantel]);

  useEffect(() => {
    const t = setTimeout(carregarLista, 250); // debounce pesquisa
    return () => clearTimeout(t);
  }, [carregarLista]);

  // Ao selecionar, mantém a linha à vista sem atirar a lista para o topo
  // (o detalhe abre inline na própria lista — nunca reiniciar o scroll).
  useEffect(() => {
    if (!selId) return;
    const sel = detalheRef.current?.querySelector('.sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }, [selId]);

  const setFiltro = (campo) => (e) => setFiltros((s) => ({ ...s, [campo]: e.target.value }));

  const urlExportCSV = () => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => v && params.set(k, v));
    params.set('incluirArquivo', 'true');
    if (plantel) params.set('plantel', 'true');
    return '/api/export/players.csv?' + params.toString();
  };

  const NCOLS = plantel ? 13 : 15;

  return (
    <div className="jog-pagina">
      <div className="pagina-cabecalho jog-cabecalho">
        <div>
          <h2>{plantel ? 'Plantel' : 'Base de dados'}</h2>
        </div>
        <div className="linha-acoes">
          <a className="btn btn--secundario" href={urlExportCSV()}>⬇ Exportar CSV</a>
        </div>
      </div>

      {!plantel && contadores && (
        <div className="jog-contadores">
          {VEREDITOS.map((v) => (
            <div key={v} className="jog-contador" style={{ '--cor': corVeredito(v) }}>
              <b className="jog-contador__n">{contadores.porVeredito?.[v] || 0}</b>
              <span className="jog-contador__l">{v}</span>
            </div>
          ))}
          <div className="jog-contador jog-contador--total">
            <b className="jog-contador__n">{contadores.total ?? 0}</b>
            <span className="jog-contador__l">Total</span>
          </div>
        </div>
      )}

      <div className="jog-toolbar">
        <input className="jog-busca" type="search" placeholder="Pesquisar por nome…" value={filtros.q} onChange={setFiltro('q')} />
        <select value={filtros.posicao} onChange={setFiltro('posicao')}>
          <option value="">Posição (todas)</option>
          {POSICOES.map((p) => (<option key={p.key} value={p.key}>{p.curto}</option>))}
        </select>
        {!plantel && (
          <>
            <select value={filtros.veredito} onChange={setFiltro('veredito')}>
              <option value="">Veredito (todos)</option>
              {VEREDITOS.map((v) => (<option key={v} value={v}>{v}</option>))}
            </select>
            <select value={filtros.rendimento} onChange={setFiltro('rendimento')}>
              <option value="">Rendimento (todos)</option>
              {RENDIMENTOS.map((r) => (<option key={r} value={r}>{r} · {RENDIMENTO_LABEL[r]}</option>))}
            </select>
            <select value={filtros.potencial} onChange={setFiltro('potencial')}>
              <option value="">Potencial (todos)</option>
              {POTENCIAIS.map((p) => (<option key={p} value={p}>{p} · {POTENCIAL_LABEL[p]}</option>))}
            </select>
            <select value={filtros.perfil} onChange={setFiltro('perfil')}>
              <option value="">Perfil (todos)</option>
              {PERFIS.map((p) => (<option key={p} value={p}>{PERFIL_NUM[p]} · {PERFIL_LABEL[p]}</option>))}
            </select>
            <button type="button" className="btn btn--secundario btn--pequeno" onClick={() => setMaisFiltros((v) => !v)}>
              Filtros {maisFiltros ? '▴' : '▾'}
            </button>
          </>
        )}
        {!plantel && maisFiltros && (
          <>
            <select value={filtros.avImediata} onChange={setFiltro('avImediata')}>
              <option value="">Aval. imediata (todas)</option>
              {AVALIACAO_NIVEIS.map((n) => (<option key={n} value={n}>{n} · {AVALIACAO_NIVEL_LABEL[n]}</option>))}
            </select>
            <select value={filtros.avMedio} onChange={setFiltro('avMedio')}>
              <option value="">Aval. médio prazo (todas)</option>
              {AVALIACAO_NIVEIS.map((n) => (<option key={n} value={n}>{n} · {AVALIACAO_NIVEL_LABEL[n]}</option>))}
            </select>
            <select value={filtros.avLongo} onChange={setFiltro('avLongo')}>
              <option value="">Aval. longo prazo (todas)</option>
              {AVALIACAO_NIVEIS.map((n) => (<option key={n} value={n}>{n} · {AVALIACAO_NIVEL_LABEL[n]}</option>))}
            </select>
            <select value={filtros.contrato} onChange={setFiltro('contrato')}>
              <option value="">Contrato (todos)</option>
              {OPCOES_CONTRATO.map((c) => (<option key={c.valor} value={c.valor}>{c.label}</option>))}
            </select>
            <input placeholder="Liga…" value={filtros.liga} onChange={setFiltro('liga')} />
            <button type="button" className="btn btn--secundario btn--pequeno" onClick={() => setFiltros(FILTROS_VAZIOS)}>
              Limpar filtros
            </button>
          </>
        )}
      </div>

      {ehTelemovel ? (
        <div className="jog-movel" ref={detalheRef}>
          {carregar ? (
            <p className="jog-sheet__vazio">A carregar…</p>
          ) : ordenados.length === 0 ? (
            <p className="jog-sheet__vazio">Sem jogadores para estes filtros.</p>
          ) : (
            ordenados.map((j) => {
              const sel = j._id === selId;
              return (
                <div key={j._id} className="jog-movel__item">
                  <button
                    className={'jog-movel__lin' + (sel ? ' sel' : '')}
                    onClick={() => navegar(sel ? rotaBase : rotaBase + '/' + j._id)}
                  >
                    <span className="jog-movel__nome">{j.nomeCompleto}</span>
                    <span className="jog-movel__cod">
                      {plantel
                        ? posCurto(j.posicaoPrincipal) + (j.ratingFinal != null ? ' · ' + j.ratingFinal.toFixed(1) : '')
                        : codigoJogador(j)}
                    </span>
                  </button>
                  {sel && (
                    <div className="jog-detalhe-inner">
                      <FichaJogador key={selId} id={selId} embutido aoMudar={carregarLista} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
      <div className="jog-folha" ref={detalheRef}>
        <table className="jog-sheet">
          <thead>
            <tr>
              <th className="sortable rownum" title="Ordem de adição (mais antigo = 1)" onClick={() => ordenarPor('adicao')}>#</th>
              <th className="sortable" onClick={() => ordenarPor('nome')}>Nome{caret('nome')}</th>
              <th className="sortable c" onClick={() => ordenarPor('pos')}>Pos{caret('pos')}</th>
              {plantel ? (
                <>
                  <th className="sortable c" onClick={() => ordenarPor('idade')}>Idade{caret('idade')}</th>
                  <th className="c">Nac.</th>
                  <th className="sortable c" onClick={() => ordenarPor('altura')}>Alt.{caret('altura')}</th>
                  <th className="c">Pé</th>
                  <th className="sortable c" title="Rating da avaliação mais recente" onClick={() => ordenarPor('rating')}>Rating{caret('rating')}</th>
                  <th className="sortable c" title="Técnica" onClick={() => ordenarPor('tecnica')}>Téc{caret('tecnica')}</th>
                  <th className="sortable c" title="Tática" onClick={() => ordenarPor('tatica')}>Tát{caret('tatica')}</th>
                  <th className="sortable c" title="Física" onClick={() => ordenarPor('fisica')}>Fís{caret('fisica')}</th>
                  <th className="sortable c" title="Mental" onClick={() => ordenarPor('mental')}>Men{caret('mental')}</th>
                  <th className="c">Fim contr.</th>
                </>
              ) : (
                <>
                  <th className="sortable" onClick={() => ordenarPor('clube')}>Clube{caret('clube')}</th>
                  <th className="sortable c" onClick={() => ordenarPor('idade')}>Idade{caret('idade')}</th>
                  <th className="sortable" onClick={() => ordenarPor('veredito')}>Veredito{caret('veredito')}</th>
                  <th className="sortable c" title="Rendimento" onClick={() => ordenarPor('rend')}>Rend{caret('rend')}</th>
                  <th className="sortable c" title="Potencial (só ≤22 anos)" onClick={() => ordenarPor('pot')}>Pot{caret('pot')}</th>
                  <th className="sortable c" onClick={() => ordenarPor('perfil')}>Perfil{caret('perfil')}</th>
                  <th className="sortable c" title="Avaliação imediata (nível de liga)" onClick={() => ordenarPor('imed')}>Imed{caret('imed')}</th>
                  <th className="sortable c" title="Avaliação médio prazo" onClick={() => ordenarPor('mp')}>MP{caret('mp')}</th>
                  <th className="sortable c" title="Avaliação longo prazo" onClick={() => ordenarPor('lp')}>LP{caret('lp')}</th>
                  <th className="sortable c" onClick={() => ordenarPor('obs')}>Obs{caret('obs')}</th>
                  <th className="sortable c" title="Rating (secundário)" onClick={() => ordenarPor('rating')}>Rating{caret('rating')}</th>
                  <th className="c">Fim contr.</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {carregar ? (
              <tr><td colSpan={NCOLS} className="jog-sheet__vazio">A carregar…</td></tr>
            ) : ordenados.length === 0 ? (
              <tr><td colSpan={NCOLS} className="jog-sheet__vazio">Sem jogadores para estes filtros.</td></tr>
            ) : (
              ordenados.map((j, i) => {
                const r = j.ratingFinal ?? j.ratingRCA ?? null;
                const id = idade(j.dataNascimento);
                const podePot = id == null || id <= IDADE_MAX_POTENCIAL;
                const sel = j._id === selId;
                const linha = (
                  <tr
                    key={j._id}
                    className={'clicavel' + (i % 2 ? ' par' : '') + (sel ? ' sel' : '')}
                    onClick={() => navegar(sel ? rotaBase : rotaBase + '/' + j._id)}
                  >
                    <td className="rownum">{j.seq ?? i + 1}</td>
                    <td>
                      <span className="jog-nome-cell">
                        {j.foto ? (
                          <img className="jog-thumb-sm" src={j.foto} alt="" loading="lazy" />
                        ) : (
                          <span className="jog-thumb-sm sem-foto" aria-hidden="true" />
                        )}
                        <span className="jog-nome-txt">{j.nomeCompleto}</span>
                      </span>
                    </td>
                    <td className="c"><span className="badge badge--pos">{posCurto(j.posicaoPrincipal)}</span></td>
                    {plantel ? (
                      <>
                        <td className="c num">{id ?? '—'}</td>
                        <td className="c" title={j.nacionalidade || ''}>{j.nacionalidade ? nacCurta(j.nacionalidade) : <span className="jog-muted">—</span>}</td>
                        <td className="c num">{j.altura ? j.altura.replace(/\s*m$/, '') : '—'}</td>
                        <td className="c" title={j.pePreferencial || ''}>{j.pePreferencial ? (PE_CURTO[j.pePreferencial] || j.pePreferencial) : <span className="jog-muted">—</span>}</td>
                        <td className="c num">{r != null ? <span className="rating-pill">{r.toFixed(1)}</span> : <span className="jog-muted">—</span>}</td>
                        <td className="c"><CelDim n={j.avaliacao?.tecnica} /></td>
                        <td className="c"><CelDim n={j.avaliacao?.tatica} /></td>
                        <td className="c"><CelDim n={j.avaliacao?.fisica} /></td>
                        <td className="c"><CelDim n={j.avaliacao?.mental} /></td>
                        <td className={'c num ' + (j.fimContrato ? estadoContrato(j.fimContrato).classe : 'jog-muted')} title={j.fimContrato ? estadoContrato(j.fimContrato).label : ''}>
                          {anoContr(j.fimContrato) || '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{j.clubeAtual || <span className="jog-muted">sem clube</span>}</td>
                        <td className="c num">{id ?? '—'}</td>
                        <td><Veredito v={j.veredito} /></td>
                        <td className="c"><b className={'badge-rp' + (j.rendimento ? '' : ' vazio')} title={j.rendimento ? RENDIMENTO_LABEL[j.rendimento] : 'Rendimento'}>{j.rendimento || '–'}</b></td>
                        <td className="c">{podePot ? (<b className={'badge-rp' + (j.potencialClass ? '' : ' vazio')} title={j.potencialClass ? POTENCIAL_LABEL[j.potencialClass] : 'Potencial'}>{j.potencialClass || '–'}</b>) : (<span className="jog-muted" title="Potencial só até 22 anos">—</span>)}</td>
                        <td className="c">{j.perfil ? <span className="badge badge--pos" title={PERFIL_LABEL[j.perfil]}>{PERFIL_NUM[j.perfil]}</span> : <span className="jog-muted">–</span>}</td>
                        <td className="c"><CelNivel n={j.avaliacaoImediata} /></td>
                        <td className="c"><CelNivel n={j.avaliacaoMedioPrazo} /></td>
                        <td className="c"><CelNivel n={j.avaliacaoLongoPrazo} /></td>
                        <td className="c num">{j.nObservacoes ?? 0}</td>
                        <td className="c num jog-muted">{r != null ? r.toFixed(1) : '—'}</td>
                        <td className={'c num ' + (j.fimContrato ? estadoContrato(j.fimContrato).classe : 'jog-muted')} title={j.fimContrato ? estadoContrato(j.fimContrato).label : ''}>
                          {anoContr(j.fimContrato) || '—'}
                        </td>
                      </>
                    )}
                  </tr>
                );
                if (!sel) return linha;
                return [
                  linha,
                  <tr key={j._id + '-d'} className="jog-detalhe-row">
                    <td colSpan={NCOLS}>
                      <div className="jog-detalhe-inner">
                        <FichaJogador key={selId} id={selId} embutido aoMudar={carregarLista} />
                      </div>
                    </td>
                  </tr>,
                ];
              })
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
