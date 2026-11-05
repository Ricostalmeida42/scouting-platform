import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GrelhaConfig from '../components/GrelhaConfig.jsx';
import { api } from '../api.js';
import { dataCurta, posCurto, corVeredito } from '../lib.js';
import CoberturaControlo from './CoberturaControlo.jsx';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const rotuloMes = (ym) => {
  const [a, m] = (ym || '').split('-');
  return m ? `${MESES[Number(m) - 1]}/${a.slice(2)}` : ym;
};
const ICONE = { 'jogo-visto': '👁', observacao: '✎', jogador: '＋' };

// KPI em destaque: número grande + rótulo + linha secundária, com cor de acento.
function Kpi({ n, label, sub, cor }) {
  return (
    <div className="ctrl-kpi" style={cor ? { '--acento': cor } : undefined}>
      <b className="ctrl-kpi__n">{n ?? '—'}</b>
      <span className="ctrl-kpi__l">{label}</span>
      {sub && <span className="ctrl-kpi__sub">{sub}</span>}
    </div>
  );
}

// Gráfico mensal: colunas (jogos vistos) + linha (observações), mesma escala.
function GraficoMensal({ meses }) {
  if (!meses.length) return <p className="ctrl-vazio">Sem atividade registada ainda.</p>;
  const W = 1000, H = 280, pl = 32, pr = 14, pt = 16, pb = 30;
  const iw = W - pl - pr, ih = H - pt - pb;
  const maxV = Math.max(1, ...meses.map((m) => Math.max(m.vistos, m.obs)));
  const slot = iw / meses.length;
  const barW = Math.min(46, slot * 0.46);
  const y = (v) => pt + ih - (v / maxV) * ih;
  const x = (i) => pl + slot * i + slot / 2;
  const linha = meses.map((m, i) => `${x(i)},${y(m.obs)}`).join(' ');
  const ticks = 3;
  const mostraValor = meses.length <= 10;
  return (
    <svg className="ctrl-grafico" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img">
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const gy = pt + (ih / ticks) * i;
        const val = Math.round(maxV * (1 - i / ticks));
        return (
          <g key={'g' + i}>
            <line x1={pl} y1={gy} x2={W - pr} y2={gy} style={{ stroke: 'var(--borda)' }} strokeWidth="1" />
            <text x={pl - 6} y={gy + 4} fontSize="12" textAnchor="end" style={{ fill: 'var(--texto-3)' }}>{val}</text>
          </g>
        );
      })}
      {meses.map((m, i) => (
        <rect key={'b' + i} x={x(i) - barW / 2} y={y(m.vistos)} width={barW} height={pt + ih - y(m.vistos)} style={{ fill: 'var(--amarelo)' }} />
      ))}
      {mostraValor &&
        meses.map((m, i) => (m.vistos > 0 ? (
          <text key={'bv' + i} x={x(i)} y={y(m.vistos) - 5} fontSize="12" fontWeight="700" textAnchor="middle" style={{ fill: 'var(--texto-suave)' }}>{m.vistos}</text>
        ) : null))}
      <polyline points={linha} fill="none" style={{ stroke: 'var(--verde)' }} strokeWidth="2.5" strokeLinejoin="round" />
      {meses.map((m, i) => (
        <circle key={'c' + i} cx={x(i)} cy={y(m.obs)} r="3.6" style={{ fill: 'var(--superficie)', stroke: 'var(--verde)' }} strokeWidth="2.5" />
      ))}
      {meses.map((m, i) => (
        <text key={'t' + i} x={x(i)} y={H - 10} fontSize="12.5" textAnchor="middle" style={{ fill: 'var(--texto-suave)' }}>{rotuloMes(m.mes)}</text>
      ))}
    </svg>
  );
}

// Barra segmentada por veredito (uma linha) + legenda.
const ORDEM_VER = ['Contratar', 'A acompanhar', 'Nova observação', 'Não avança'];
function BarraVeredito({ titulo, dados }) {
  const total = (dados || []).reduce((s, d) => s + d.n, 0);
  const segs = ORDEM_VER.map((v) => ({ v, n: (dados || []).find((d) => d.veredito === v)?.n || 0 })).filter((s) => s.n > 0);
  return (
    <div className="ctrl-ver">
      <div className="ctrl-ver__top">
        <span className="ctrl-ver__tit">{titulo}</span>
        <b className="ctrl-ver__total">{total}</b>
      </div>
      {total === 0 ? (
        <p className="ctrl-vazio">Sem dados.</p>
      ) : (
        <>
          <div className="ctrl-seg">
            {segs.map((s) => (
              <div key={s.v} className="ctrl-seg__part" style={{ width: `${(s.n / total) * 100}%`, background: corVeredito(s.v) }} title={`${s.v}: ${s.n}`} />
            ))}
          </div>
          <div className="ctrl-seg__leg">
            {segs.map((s) => (
              <span key={s.v}>
                <i style={{ background: corVeredito(s.v) }} /> {s.v} <b>{s.n}</b>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Barras horizontais (por competição, etc.).
function BarrasH({ dados, campo, formata, cor = 'var(--verde-ok)' }) {
  if (!dados?.length) return <p className="ctrl-vazio">Sem dados ainda.</p>;
  const max = Math.max(...dados.map((d) => d.n));
  return (
    <div className="ctrl-barras">
      {dados.map((d, i) => (
        <div key={i} className="ctrl-barra">
          <span className="ctrl-barra__l" title={formata ? formata(d[campo]) : d[campo]}>{formata ? formata(d[campo]) : d[campo] || '—'}</span>
          <div className="ctrl-barra__t">
            <div className="ctrl-barra__f" style={{ width: `${Math.max(5, (d.n / max) * 100)}%`, background: cor }} />
          </div>
          <b className="ctrl-barra__n">{d.n}</b>
        </div>
      ))}
    </div>
  );
}

function Card({ titulo, extra, children, className = '' }) {
  return (
    <section className={'card ctrl-card ' + className}>
      {(titulo || extra) && (
        <div className="ctrl-card__cab">
          <h3 className="ctrl-card__tit">{titulo}</h3>
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}

function Resumo({ d }) {
  const [pagAtiv, setPagAtiv] = useState(0);
  const [compVistos, setCompVistos] = useState(''); // filtro de competição do cartão "Jogos vistos"
  const POR_PAGINA = 12;
  const { jogosVistos: jv, observacoesJogador: oj, jogadores: jg, agendamentos: ag, atividade } = d;

  // Série mensal combinada (jogos vistos + observações) por mês, ordenada.
  const meses = useMemo(() => {
    const mapa = new Map();
    (jv.porMes || []).forEach((x) => mapa.set(x.mes, { mes: x.mes, vistos: x.n, obs: 0 }));
    (oj.porMes || []).forEach((x) => {
      const e = mapa.get(x.mes) || { mes: x.mes, vistos: 0, obs: 0 };
      e.obs = x.n;
      mapa.set(x.mes, e);
    });
    return [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  }, [jv.porMes, oj.porMes]);

  const totalPags = Math.ceil(atividade.length / POR_PAGINA);

  return (
    <>
      <div className="ctrl-kpis">
        <Kpi n={jv.epoca} label="Jogos vistos · época" sub={`${jv.semana} esta semana · ${jv.total} no total`} cor="var(--amarelo)" />
        <Kpi n={oj.total} label="Observações de jogador" sub={`${oj.semana} esta semana · ${oj.mes} este mês`} cor="var(--verde)" />
        <Kpi n={jg.totalScouting} label="Jogadores em scouting" sub={`${jg.adicionadosSemana} novos (7 dias)`} cor="var(--azul)" />
        <Kpi n={ag.planeados} label="Jogos agendados" sub={`${ag.concluidos} concluídos · ${ag.cancelados} cancelados`} cor="var(--texto-suave)" />
      </div>

      <Card
        titulo="Atividade por mês"
        extra={
          <div className="ctrl-legenda">
            <span><i className="ctrl-legenda__bar" /> Jogos vistos</span>
            <span><i className="ctrl-legenda__line" /> Observações</span>
          </div>
        }
      >
        <GraficoMensal meses={meses} />
      </Card>

      <div className="ctrl-grid">
        <Card titulo="Distribuição por veredito">
          <BarraVeredito titulo="Jogadores" dados={jg.porVeredito} />
          <div style={{ height: 14 }} />
          <BarraVeredito titulo="Observações" dados={oj.porVeredito} />
        </Card>

        <Card
          titulo="Jogos vistos por competição"
          extra={
            <select className="ctrl-filtro" value={compVistos} onChange={(e) => setCompVistos(e.target.value)}>
              <option value="">Todas as competições</option>
              {(jv.porCompeticao || []).map((c) => (
                <option key={c.competicao} value={c.competicao}>{c.competicao || '—'}</option>
              ))}
            </select>
          }
        >
          <BarrasH
            dados={compVistos ? (jv.porCompeticao || []).filter((c) => c.competicao === compVistos) : jv.porCompeticao}
            campo="competicao"
            cor="var(--amarelo)"
          />
        </Card>
      </div>

      <div className="ctrl-grid">
        <Card titulo="Últimas observações" extra={<Link to="/observacoes" className="ctrl-card__link">Todas →</Link>}>
          {oj.ultimas.length === 0 ? (
            <p className="ctrl-vazio">Ainda sem observações.</p>
          ) : (
            <div className="ctrl-lista">
              {oj.ultimas.map((o, i) => (
                <Link key={i} to={'/jogador/' + o.jogadorId} className="ctrl-lin">
                  <span className="ctrl-lin__data">{dataCurta(o.data)}</span>
                  <span className="ctrl-lin__main"><strong>{o.jogador}</strong> <em>{posCurto(o.posicao)}</em>{o.adversario ? <small> · vs {o.adversario}</small> : null}</span>
                  {o.veredito && <span className="ctrl-lin__vd" style={{ color: corVeredito(o.veredito) }}>{o.veredito}</span>}
                  {o.rating != null && <span className="ctrl-lin__rt">{o.rating.toFixed(1)}<i>/5</i></span>}
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card titulo="Últimos jogos vistos" extra={<Link to="/agenda/vistos" className="ctrl-card__link">Todos →</Link>}>
          {jv.ultimos.length === 0 ? (
            <p className="ctrl-vazio">Ainda sem jogos vistos.</p>
          ) : (
            <div className="ctrl-lista">
              {jv.ultimos.map((v) => (
                <div key={v._id} className="ctrl-lin">
                  <span className="ctrl-lin__data">{dataCurta(v.data)}{v.hora ? ' · ' + v.hora : ''}</span>
                  <span className="ctrl-lin__main"><strong>{v.casa} × {v.fora}</strong></span>
                  <small className="ctrl-lin__comp">{v.competicao}{v.serie ? ' · ' + v.serie : ''}</small>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card titulo="Atividade recente">
        {atividade.length === 0 ? (
          <p className="ctrl-vazio">Sem atividade registada ainda.</p>
        ) : (
          <>
            <div className="ctrl-feed">
              {atividade.slice(pagAtiv * POR_PAGINA, (pagAtiv + 1) * POR_PAGINA).map((a, i) => (
                <div key={i} className={'ctrl-feed__item ctrl-feed__item--' + a.tipo}>
                  <span className="ctrl-feed__ic">{ICONE[a.tipo] || '•'}</span>
                  <div className="ctrl-feed__txt">
                    <strong>{a.texto}</strong>
                    {a.sub && <span className="ctrl-feed__sub">{a.sub}</span>}
                  </div>
                  <span className="ctrl-feed__data">{dataCurta(a.quando)}</span>
                </div>
              ))}
            </div>
            {totalPags > 1 && (
              <div className="ctrl-pag">
                <button className="btn btn--secundario btn--pequeno" disabled={pagAtiv === 0} onClick={() => setPagAtiv((p) => Math.max(0, p - 1))}>‹ Anterior</button>
                <span>Página {pagAtiv + 1} de {totalPags}</span>
                <button className="btn btn--secundario btn--pequeno" disabled={pagAtiv >= totalPags - 1} onClick={() => setPagAtiv((p) => p + 1)}>Seguinte ›</button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}

export default function ControloTrabalho() {
  const navegar = useNavigate();
  const { aba } = useParams();
  const abaAtiva = aba === 'cobertura' || aba === 'grelha' ? aba : 'resumo';
  const [d, setD] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.get('/dashboard/controlo').then(setD).catch((e) => setErro(e.message));
  }, []);

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Controlo</h2>
        </div>
      </div>

      <div className="sub-abas">
        <button className={abaAtiva === 'resumo' ? 'ativo' : ''} onClick={() => navegar('/controlo')}>Resumo</button>
        <button className={abaAtiva === 'cobertura' ? 'ativo' : ''} onClick={() => navegar('/controlo/cobertura')}>Cobertura</button>
        <button className={abaAtiva === 'grelha' ? 'ativo' : ''} onClick={() => navegar('/controlo/grelha')}>Grelha de observação</button>
      </div>

      {abaAtiva === 'grelha' ? (
        <GrelhaConfig />
      ) : abaAtiva === 'cobertura' ? (
        <CoberturaControlo />
      ) : erro ? (
        <div className="carregar">Erro a carregar: {erro}</div>
      ) : !d ? (
        <div className="carregar">A carregar…</div>
      ) : (
        <Resumo d={d} />
      )}
    </div>
  );
}
