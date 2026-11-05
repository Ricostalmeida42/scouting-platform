import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Modal from '../components/Modal.jsx';
import CampoShadowTeam from '../components/CampoShadowTeam.jsx';
import { useToast } from '../components/Toasts.jsx';
import { dataCurta, posCurto, codigoJogador, corVeredito } from '../lib.js';

// Texto do sumário semanal (copiar/enviar). Mantido da versão anterior.
function formatarSumario(s) {
  const L = [];
  L.push('SUMÁRIO SEMANAL DE SCOUTING');
  L.push(`Semana de ${dataCurta(s.periodo.de)} a ${dataCurta(s.periodo.a)}`);
  L.push('');
  L.push(`OBSERVADOS — ${s.totais.observacoes} jogo(s), ${s.totais.jogadoresObservados} jogador(es)`);
  s.observados.length
    ? s.observados.forEach((o) =>
        L.push(
          `• ${o.jogador} (${posCurto(o.posicao)}) — ${[
            o.adversario ? `vs ${o.adversario}` : null,
            o.competicao,
            dataCurta(o.dataJogo),
            o.rating != null ? `Rating ${o.rating.toFixed(1)}` : null,
            o.veredito,
          ]
            .filter(Boolean)
            .join(' · ')}`
        )
      )
    : L.push('• (nenhum jogo observado)');
  L.push('');
  L.push(`NOVOS ALVOS — ${s.totais.novosAlvos}`);
  s.novosAlvos.length
    ? s.novosAlvos.forEach((p) => L.push(`• ${p.jogador} (${posCurto(p.posicao)})${p.veredito ? ' · ' + p.veredito : ''}`))
    : L.push('• (nenhum)');
  L.push('');
  L.push(`JOGOS A OBSERVAR (próximos 7 dias) — ${s.totais.jogosProximos}`);
  s.jogos.length
    ? s.jogos.forEach((j) =>
        L.push(`• ${[j.jogador || j.adversario || 'Jogo', j.competicao, dataCurta(j.dataJogo)].filter(Boolean).join(' · ')}`)
      )
    : L.push('• (nenhum agendado)');
  return L.join('\n');
}

// KPI clicável com meta opcional (vermelho quando abaixo) e cor de destaque.
function Kpi({ n, label, para, meta, cor, ajuda }) {
  const temMeta = typeof meta === 'number';
  const abaixo = temMeta && typeof n === 'number' && n < meta;
  const corpo = (
    <>
      <b className={abaixo ? 'abaixo' : ''} style={cor ? { color: cor } : undefined}>
        {n ?? '—'}
        {temMeta && <i>/{meta}</i>}
      </b>
      <span>{label}</span>
    </>
  );
  return para ? (
    <Link to={para} className="home-kpi" title={ajuda}>
      {corpo}
    </Link>
  ) : (
    <div className="home-kpi" title={ajuda}>
      {corpo}
    </div>
  );
}

function Avatar({ foto, nome }) {
  const ini = (nome || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
  return foto ? (
    <img className="home-av" src={foto} alt="" loading="lazy" />
  ) : (
    <span className="home-av home-av--ini" aria-hidden="true">
      {ini}
    </span>
  );
}

// Uma linha de alvo (veredito Contratar / A acompanhar) com o código do jogador.
function LinhaAlvo({ a }) {
  return (
    <Link to={'/jogador/' + a._id} className="home-alvo">
      <Avatar foto={a.foto} nome={a.nome} />
      <span className="home-alvo__id">
        <strong>{a.nome}</strong>
        <small>
          {posCurto(a.pos)}
          {a.idade != null ? ` · ${a.idade}a` : ''}
          {a.clube ? ` · ${a.clube}` : ''}
        </small>
      </span>
      <code className="home-cod" style={{ borderColor: corVeredito(a.veredito) }} title="Veredito · Rend · Pot · Perfil · Imediata · Médio · Longo">
        {codigoJogador(a)}
      </code>
      <span className="home-alvo__rt">{a.rating != null ? a.rating.toFixed(1) : '—'}</span>
    </Link>
  );
}

export default function Home() {
  const [d, setD] = useState(null);
  const [extra, setExtra] = useState(null);
  const [erro, setErro] = useState(null);
  const [sumario, setSumario] = useState(null);
  const toast = useToast();
  const { podeEditar, veObsRecentesHome, soContratar } = useAuth();

  const carregar = () => {
    api.get('/dashboard').then(setD).catch((e) => setErro(e.message));
    api.get('/dashboard/home-extra').then(setExtra).catch(() => {});
  };
  useEffect(carregar, []);

  const abrirSumario = async () => {
    try {
      setSumario(await api.get('/dashboard/sumario-semanal'));
    } catch (e) {
      toast('Erro a gerar o sumário: ' + e.message, 'erro');
    }
  };
  const copiarSumario = async () => {
    try {
      await navigator.clipboard.writeText(formatarSumario(sumario));
      toast('Sumário copiado — pronto a enviar.', 'ok');
    } catch {
      toast('Não consegui copiar. Seleciona e copia o texto.', 'erro');
    }
  };
  if (erro) return <div className="carregar">Erro a carregar: {erro}</div>;
  if (!d) return <div className="carregar">A carregar…</div>;

  const contratar = extra?.contratar || [];
  const acompanhar = extra?.acompanhar || [];
  const obsRec = extra?.observacoesRecentes || [];
  const proximos = extra?.proximosJogos || [];

  return (
    <div className="home">
      <div className="pagina-cabecalho home-cab">
        <div>
          <h2>Página inicial</h2>
        </div>
        <div className="home-cab__acoes">
          {podeEditar && <Link to="/observacoes" className="btn">+ Observação</Link>}
          <button className="btn btn--secundario" onClick={abrirSumario}>Sumário semanal</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="home-kpis">
        <Kpi n={extra?.totalObservados} label="Jogadores na base de dados" para="/jogadores" ajuda="Jogadores com pelo menos uma observação" />
        <Kpi n={d.emNegociacao} label="Contratar" para="/recrutamento" cor="var(--verde-ok)" ajuda="Veredito: Contratar" />
        {!soContratar && (
          <Kpi n={d.emShortlist} label="A acompanhar" para="/recrutamento" cor="var(--azul)" ajuda="Veredito: A acompanhar" />
        )}
        <Kpi n={d.totalObservacoes} label="Observações" para={podeEditar ? '/observacoes' : undefined} ajuda="Total de observações registadas" />
        <Kpi n={extra?.jogosVistosEpoca} label="Jogos vistos" para="/agenda/vistos" ajuda={`Total na época: ${extra?.jogosVistosTotal ?? '—'} jogos vistos`} />
        <Kpi n={d.ligasAtivas} label="Ligas acompanhadas" para={podeEditar ? '/ligas' : undefined} />
      </div>

      <div className="home-grid">
        {/* Coluna principal */}
        <div className="home-col">
          <section className="card home-card">
            <div className="home-card__cab">
              <h3 className="home-card__tit">
                11 Sombra <span className="home-card__n">{extra?.shadowTotal ?? 0}</span>
              </h3>
              <Link to="/recrutamento" className="home-card__link">Shadow team →</Link>
            </div>
            <CampoShadowTeam resumo contagens={extra?.shadow || {}} />
          </section>

          <section className="card home-card">
            <div className="home-card__cab">
              <h3 className="home-card__tit">Alvos a contratar <span className="home-card__n">{contratar.length}</span></h3>
              <Link to="/recrutamento" className="home-card__link">Ranking →</Link>
            </div>
            {contratar.length === 0 ? (
              <p className="home-vazio">Ainda sem alvos com veredito “Contratar”.</p>
            ) : (
              <div className="home-alvos">{contratar.map((a) => <LinhaAlvo key={a._id} a={a} />)}</div>
            )}
            {acompanhar.length > 0 && !soContratar && (
              <>
                <div className="home-sub">A acompanhar <span className="home-card__n">{acompanhar.length}</span></div>
                <div className="home-alvos">{acompanhar.slice(0, 6).map((a) => <LinhaAlvo key={a._id} a={a} />)}</div>
              </>
            )}
          </section>
        </div>

        {/* Coluna lateral */}
        <div className="home-col">
          {veObsRecentesHome && (
          <section className="card home-card">
            <div className="home-card__cab">
              <h3 className="home-card__tit">Observações recentes</h3>
              <Link to="/observacoes" className="home-card__link">Todas →</Link>
            </div>
            {obsRec.length === 0 ? (
              <p className="home-vazio">Ainda sem observações.</p>
            ) : (
              <div className="home-linhas">
                {obsRec.map((o, i) => (
                  <Link key={i} to={'/jogador/' + o.jogadorId} className="home-lin">
                    <span className="home-lin__data">{dataCurta(o.data)}</span>
                    <span className="home-lin__main">
                      <strong>{o.jogador}</strong> <em>{posCurto(o.pos)}</em>
                      {o.adversario ? <small> · vs {o.adversario}</small> : null}
                    </span>
                    {o.veredito && <span className="home-vd" style={{ color: corVeredito(o.veredito) }}>{o.veredito}</span>}
                    <span className="home-lin__rt">{o.rating != null ? o.rating.toFixed(1) : '—'}<i>/5</i></span>
                  </Link>
                ))}
              </div>
            )}
          </section>
          )}

          <section className="card home-card">
            <div className="home-card__cab">
              <h3 className="home-card__tit">Próximos jogos</h3>
              <Link to="/agenda" className="home-card__link">Agenda →</Link>
            </div>
            {proximos.length === 0 ? (
              <p className="home-vazio">Nada agendado para os próximos 14 dias.</p>
            ) : (
              <div className="home-linhas">
                {proximos.map((j) => (
                  <Link key={j._id} to="/agenda" className="home-lin">
                    <span className="home-lin__data">{dataCurta(j.dataJogo)}{j.hora ? ' · ' + j.hora : ''}</span>
                    <span className="home-lin__main">
                      <strong>{j.jogador || j.adversario || 'Jogo'}</strong>
                      {j.competicao ? <small> · {j.competicao}</small> : null}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {sumario && (
        <Modal titulo="Sumário semanal" aoFechar={() => setSumario(null)} largo>
          <p style={{ marginTop: 0, color: 'var(--texto-suave)', fontSize: 13 }}>
            O que foi feito na última semana e o que está planeado. Copia e envia.
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: 13,
              lineHeight: 1.5,
              background: 'var(--superficie-2)',
              border: '1px solid var(--borda)',
              borderRadius: 6,
              padding: '12px 14px',
              margin: 0,
              maxHeight: '55vh',
              overflow: 'auto',
            }}
          >
            {formatarSumario(sumario)}
          </pre>
          <div className="modal__rodape" style={{ padding: '18px 0 0', border: 'none' }}>
            <button className="btn btn--secundario" onClick={() => setSumario(null)}>Fechar</button>
            <button className="btn btn--secundario" onClick={copiarSumario}>Copiar texto</button>
            <button className="btn" onClick={() => window.open('/api/dashboard/sumario-semanal.pdf', '_blank')}>Abrir PDF</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
