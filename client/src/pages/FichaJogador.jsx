import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Modal from '../components/Modal.jsx';
import FormularioJogador from '../components/FormularioJogador.jsx';
import Sparkline from '../components/Sparkline.jsx';
import AvaliacaoPlantel from '../components/AvaliacaoPlantel.jsx';
import RadarDados from '../components/RadarDados.jsx';
import BadgesRP from '../components/BadgesRP.jsx';
import { useToast } from '../components/Toasts.jsx';
import {
  posLabel,
  posCurto,
  idade,
  dataCurta,
  estadoContrato,
  DIMENSOES_AVALIACAO,
  dimensoesPreenchidas,
  classeBadgePlantel,
  RENDIMENTOS,
  RENDIMENTO_LABEL,
  POTENCIAIS,
  POTENCIAL_LABEL,
  PERFIS,
  PERFIL_LABEL,
  PERFIL_NUM,
  VEREDITOS,
  AVALIACAO_NIVEIS,
  AVALIACAO_NIVEL_LABEL,
  IDADE_MAX_POTENCIAL,
  codigoJogador,
} from '../lib.js';

const COR_VEREDITO = {
  'Contratar': 'var(--verde-ok)',
  'A acompanhar': 'var(--azul)',
  'Nova observação': 'var(--amarelo)',
  'Não avança': 'var(--vermelho)',
};

function ObsVeredito({ v }) {
  if (!v) return <span className="jog-muted">–</span>;
  const c = COR_VEREDITO[v] || 'var(--texto-suave)';
  return (
    <span className="badge" style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)`, borderColor: `color-mix(in srgb, ${c} 36%, transparent)`, whiteSpace: 'nowrap' }}>
      {v}
    </span>
  );
}

// Usada como rota (/jogadores/:id → id de useParams) e embutida no painel de
// detalhe da lista de Jogadores (recebe `id` por prop + `aoMudar` para o pai
// recarregar a lista quando o jogador muda/arquiva/elimina).
export default function FichaJogador({ id: propId, aoMudar }) {
  const { id: paramId } = useParams();
  const id = propId ?? paramId;
  const embutido = propId != null;
  const navegar = useNavigate();
  const toast = useToast();
  const { podeEditar, veObsBruto } = useAuth();
  const [jogador, setJogador] = useState(null);
  const [erro, setErro] = useState(null);
  const [editar, setEditar] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const voltarAqui = '/jogadores/' + id; // para o editor de observação regressar à ficha

  const carregar = useCallback(() => {
    api.get('/players/' + id).then(setJogador).catch((e) => setErro(e.message));
  }, [id]);

  useEffect(carregar, [carregar]);

  // Avaliações do plantel por função (Scout / Treinador / Diretor desportivo) —
  // para a caixa resumo na ficha do plantel. A mais recente de cada papel.
  const [avaisPlantel, setAvaisPlantel] = useState([]);
  const carregarAvaisPlantel = useCallback(() => {
    api.get('/avaliacoes-plantel/' + id, { silencioso: true }).then(setAvaisPlantel).catch(() => {});
  }, [id]);
  useEffect(() => {
    if (jogador?.doPlantel) carregarAvaisPlantel();
  }, [jogador?.doPlantel, carregarAvaisPlantel]);
  const avalPorPapel = (p) => avaisPlantel.find((a) => a.autorPapel === p);

  // Relatórios formais (entidade própria) — snapshots do template RCA.
  const [relatorios, setRelatorios] = useState([]);
  const carregarRelatorios = useCallback(() => {
    api.get('/relatorios/jogador/' + id).then(setRelatorios).catch(() => {});
  }, [id]);
  useEffect(carregarRelatorios, [carregarRelatorios]);

  // Perfil de dados (Wyscout) — radar de percentis por posição, se houver dados.
  const [perfisDados, setPerfisDados] = useState([]);
  const carregarDados = useCallback(() => {
    api.get('/estatisticas/jogador/' + id, { silencioso: true })
      .then((r) => setPerfisDados(r?.perfis || []))
      .catch(() => setPerfisDados([]));
  }, [id]);
  useEffect(carregarDados, [carregarDados]);

  // Associação manual aos dados Wyscout (os nomes nem sempre coincidem).
  const [ligarAberto, setLigarAberto] = useState(false);
  const [buscaDados, setBuscaDados] = useState('');
  const [resDados, setResDados] = useState([]);
  useEffect(() => {
    if (!ligarAberto || buscaDados.trim().length < 2) return setResDados([]);
    const t = setTimeout(() => {
      api.get('/estatisticas/procurar?q=' + encodeURIComponent(buscaDados.trim()))
        .then(setResDados).catch(() => setResDados([]));
    }, 250);
    return () => clearTimeout(t);
  }, [buscaDados, ligarAberto]);
  const ligarDados = async (chave) => {
    try {
      await api.post('/estatisticas/ligar', { playerId: id, chave });
      setLigarAberto(false);
      setBuscaDados('');
      carregarDados();
      toast('Dados associados.', 'ok');
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };
  const desligarDados = async () => {
    if (!window.confirm('Remover a associação aos dados Wyscout deste jogador?')) return;
    try {
      await api.post('/estatisticas/desligar', { playerId: id });
      carregarDados();
      toast('Associação removida.', 'ok');
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };

  const novoRelatorio = async () => {
    const titulo = window.prompt(
      'Título do relatório (opcional):',
      'Relatório · ' + new Date().toLocaleDateString('pt-PT')
    );
    if (titulo === null) return; // cancelou
    try {
      const rel = await api.post('/relatorios/jogador/' + id, { titulo });
      carregarRelatorios();
      window.open('/api/relatorios/' + rel._id, '_blank');
      toast('Relatório guardado.', 'ok');
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };
  const apagarRelatorio = async (rid) => {
    if (!confirm('Apagar este relatório?')) return;
    try {
      await api.del('/relatorios/' + rid);
      carregarRelatorios();
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };

  const guardarEdicao = async (dados) => {
    setAGuardar(true);
    try {
      await api.put('/players/' + id, dados);
      setEditar(false);
      carregar();
      aoMudar?.();
      toast('Jogador atualizado.', 'ok');
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  // Editor rápido de classificação (Base de dados): grava campo a campo.
  const patchClass = async (campo, valor) => {
    setJogador((j) => ({ ...j, [campo]: valor })); // otimista
    try {
      await api.patch('/players/' + id + '/classificacao', { [campo]: valor });
      aoMudar?.();
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
      carregar();
    }
  };

  const arquivar = async () => {
    if (!confirm('Arquivar este jogador?')) return;
    await api.del('/players/' + id);
    carregar();
    aoMudar?.();
  };

  const eliminar = async () => {
    if (
      !confirm(
        `Eliminar definitivamente ${jogador.nomeCompleto}?\n\n` +
          'Apaga o jogador e todas as suas observações. Não se pode desfazer.'
      )
    )
      return;
    try {
      await api.del('/players/' + id + '?hard=true');
      toast('Jogador eliminado.', 'ok');
      navegar('/jogadores');
      aoMudar?.();
    } catch (e) {
      toast('Erro ao eliminar: ' + e.message, 'erro');
    }
  };

  if (erro) return <div className="carregar">Erro: {erro}</div>;
  if (!jogador) return <div className="carregar">A carregar…</div>;

  const rating = jogador.ratingFinal; // = média das observações (o ratingRCA foi removido)
  const contrato = estadoContrato(jogador.fimContrato);
  const idadeJog = idade(jogador.dataNascimento);
  const podePot = idadeJog == null || idadeJog <= IDADE_MAX_POTENCIAL; // Potencial só ≤22
  const corVer = COR_VEREDITO[jogador.veredito] || 'var(--texto-suave)';

  // Resumo estatístico das observações
  const obs = jogador.observacoes || [];
  // pontosFortes/pontosDesenvolver são um objeto por categoria ({tecnica,tatica,fisica,mental}
  // com arrays); achata para um array plano (aceita também o formato antigo em array).
  const flatPontos = (v) => (Array.isArray(v) ? v : Object.values(v || {}).flat());
  const ratings = obs.filter((o) => typeof o.rating === 'number');
  const media = ratings.length
    ? Math.round((ratings.reduce((s, o) => s + o.rating, 0) / ratings.length) * 10) / 10
    : null;
  // ordem cronológica (a API devolve por data desc) para a linha de tendência
  const serie = [...ratings].reverse().map((o) => o.rating);
  let tendencia = null;
  if (serie.length >= 2) {
    const d = serie[serie.length - 1] - serie[0];
    tendencia = d > 0.2 ? 'subida' : d < -0.2 ? 'descida' : 'estável';
  }

  // Cartão "Evolução do rating" — no dropdown fica por baixo da identidade,
  // na página de perfil fica na coluna lateral.
  const evolucaoCard = (
    <div className="card resumo-card">
      <div className="resumo-card__hd">
        <div className="resumo-card__titulo" style={{ margin: 0 }}>Evolução do rating</div>
      </div>
      <div className="evo-corpo">
        <div className="evo-media">
          <strong>{media != null ? media.toFixed(1) : '—'}</strong>
          <span>média</span>
        </div>
        <div className="evo-spark">
          {serie.length >= 2 ? (
            <Sparkline valores={serie} largura={320} altura={56} responsivo auto />
          ) : (
            <span className="jog-muted" style={{ fontSize: 12.5 }}>
              Série insuficiente ({obs.length} obs.)
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {!embutido && (
        <div className="pagina-cabecalho">
          <Link to="/jogadores" className="btn btn--secundario btn--pequeno">
            ← Jogadores
          </Link>
        </div>
      )}

      <div className="ficha-split">
        <div className="ficha-split__col">
      <div className="card" style={{ padding: 22, marginBottom: 22 }}>
        <div className="ficha-topo">
          {(jogador.foto || !jogador.doPlantel) && (
            <div className="ficha-foto-col">
              {jogador.foto ? (
                <img className="ficha-foto" src={jogador.foto} alt={`Fotografia de ${jogador.nomeCompleto}`} />
              ) : (
                <span className="ficha-foto sem-foto" aria-hidden="true" />
              )}
              {!jogador.doPlantel && (
                <BadgesRP rendimento={jogador.rendimento} potencial={jogador.potencialClass} grande />
              )}
            </div>
          )}
          <div className="ficha-ident">
            <h2 className="ficha-ident__nome">
              {jogador.nomeCompleto}
              {jogador.doPlantel && <span className="badge badge--plantel">plantel do clube</span>}
            </h2>
            <div className="ficha-ident__meta">
              {posCurto(jogador.posicaoPrincipal)} · {jogador.clubeAtual || 'sem clube'} ·{' '}
              {idade(jogador.dataNascimento) != null ? idade(jogador.dataNascimento) + ' anos' : '—'}
            </div>
            <div className="ficha-ident__badges">
              {jogador.doPlantel ? (
                jogador.estadoPlantel ? (
                  <span className={'badge ' + classeBadgePlantel(jogador.estadoPlantel)}>
                    {jogador.estadoPlantel}
                  </span>
                ) : (
                  <span className="badge badge--prospecao">Situação por definir</span>
                )
              ) : jogador.veredito ? (
                <span
                  className="badge"
                  style={{ color: corVer, background: `color-mix(in srgb, ${corVer} 14%, transparent)`, borderColor: `color-mix(in srgb, ${corVer} 36%, transparent)` }}
                >
                  {jogador.veredito}
                </span>
              ) : (
                <span className="badge badge--prospecao">Veredito por definir</span>
              )}
            </div>
            {!jogador.doPlantel && (
              <div className="jog-codigo" title="Código: veredito (C/A/NO/NA) · rendimento · potencial · perfil (1 téc/2 fís/3 misto) · aval. imediata/médio/longo">
                {codigoJogador(jogador)}
              </div>
            )}
          </div>
          {!embutido && !jogador.doPlantel && (
            <div
              className="rating-anel"
              title="Rating do jogador — média de todas as observações"
              style={{ '--pct': Math.min(100, ((rating ?? 0) / 5) * 100) + '%' }}
            >
              <strong>{rating != null ? rating.toFixed(1) : '—'}</strong>
              <small>Rating</small>
            </div>
          )}
        </div>

        <div className="linha-acoes ficha-acoes">
          {podeEditar && (
            <button
              className="btn btn--secundario"
              onClick={() => navegar('/observacoes?nova=' + id + '&voltar=' + encodeURIComponent(voltarAqui))}
            >
              + Observação
            </button>
          )}
          {embutido && (
            <button className="btn btn--secundario" onClick={() => navegar('/jogador/' + id)}>
              Ver perfil →
            </button>
          )}
          {podeEditar && (
            <>
              <button className="btn btn--secundario" onClick={() => navegar('/jogadores/' + id + '/editar', { state: { voltar: '/jogador/' + id } })}>
                Editar
              </button>
              {jogador.veredito !== 'Não avança' && (
                <button className="btn btn--perigo" onClick={arquivar}>
                  Arquivar
                </button>
              )}
              <button
                className="btn btn--perigo"
                onClick={eliminar}
                title="Apaga o jogador e as observações — não se pode desfazer"
              >
                Eliminar
              </button>
            </>
          )}
        </div>

        <div className="ficha-info">
              <div className="dado">
                <label>Nascimento</label>
                <span>{dataCurta(jogador.dataNascimento)}</span>
              </div>
              <div className="dado">
                <label>Nacionalidade</label>
                <span>{jogador.nacionalidade || '—'}</span>
              </div>
              <div className="dado">
                <label>Altura</label>
                <span>{jogador.altura || '—'}</span>
              </div>
              <div className="dado">
                <label>Pé preferencial</label>
                <span>{jogador.pePreferencial || '—'}</span>
              </div>
              <div className="dado">
                <label>Liga</label>
                <span>{jogador.liga || '—'}</span>
              </div>
              <div className="dado">
                <label>Fim de contrato</label>
                <span>
                  {dataCurta(jogador.fimContrato)}
                  {contrato.classe && (
                    <span className={contrato.classe} style={{ marginLeft: 6, fontSize: 12 }}>
                      {contrato.curto}
                    </span>
                  )}
                </span>
              </div>
              <div className="dado">
                <label>Agente</label>
                <span>
                  {jogador.agenteUrl ? (
                    <a href={jogador.agenteUrl} target="_blank" rel="noreferrer">
                      {jogador.agente || 'ver agente'}
                    </a>
                  ) : (
                    jogador.agente || '—'
                  )}
                </span>
              </div>
              <div className="dado">
                <label>Contacto</label>
                <span>{jogador.contacto || '—'}</span>
              </div>
              {(jogador.valorEstimado != null || jogador.potencialValorizacao || jogador.condicoesContratuais) && (
                <>
                  <div className="dado">
                    <label>Valor / custo estimado</label>
                    <span>{jogador.valorEstimado != null ? jogador.valorEstimado.toLocaleString('pt-PT') + ' €' : '—'}</span>
                  </div>
                  <div className="dado">
                    <label>Potencial de valorização</label>
                    <span>{jogador.potencialValorizacao || '—'}</span>
                  </div>
                  {jogador.condicoesContratuais && (
                    <div className="dado dado--largo">
                      <label>Condições conhecidas</label>
                      <span>{jogador.condicoesContratuais}</span>
                    </div>
                  )}
                </>
              )}
              <div className="dado">
                <label>Última atualização</label>
                <span>{dataCurta(jogador.ultimaAtividade)}</span>
              </div>
            </div>

        {/* Avaliações do plantel por função (substituem a roda do rating) */}
        {jogador.doPlantel && (
          <div className="aval-resumo">
            {[
              ['editor', 'av. Scout'],
              ['tecnico', 'av. Treinador'],
              ['viewer', 'av. Diretor desportivo'],
            ].map(([papel, label]) => {
              const a = avalPorPapel(papel);
              return (
                <div className="aval-resumo__item" key={papel}>
                  <span className="aval-resumo__n">{a?.rating != null ? a.rating.toFixed(1) : '—'}</span>
                  <span className="aval-resumo__l">{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Barras de avaliação */}
        {jogador.avaliacao && Object.values(jogador.avaliacao).some((v) => v != null) && (
          <div style={{ marginTop: 18, borderTop: '1px solid var(--borda)', paddingTop: 16 }}>
            {dimensoesPreenchidas(jogador.avaliacao) < DIMENSOES_AVALIACAO.length && (
              <div style={{ color: 'var(--amarelo)', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                ⚠ Avaliação parcial — {dimensoesPreenchidas(jogador.avaliacao)} de {DIMENSOES_AVALIACAO.length}{' '}
                dimensões preenchidas
              </div>
            )}
            <div className="cobertura-grelha">
              {DIMENSOES_AVALIACAO.map((d) => (
                <div className="dado" key={d.key}>
                  <label>
                    {d.label} ({d.peso}%)
                  </label>
                  <span>{typeof jogador.avaliacao[d.key] === 'number' ? jogador.avaliacao[d.key].toFixed(1) : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {jogador.recursos?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="dado">
              <label>Vídeos e recursos</label>
            </div>
            <div className="linha-acoes" style={{ flexWrap: 'wrap' }}>
              {jogador.recursos.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noreferrer" className="btn btn--secundario btn--pequeno">
                  {r.titulo || 'Link'} ↗
                </a>
              ))}
            </div>
          </div>
        )}

        {jogador.linkRelatorio && (
          <div style={{ marginTop: 12 }}>
            <a href={jogador.linkRelatorio} target="_blank" rel="noreferrer" className="btn btn--secundario btn--pequeno">
              Abrir relatório ↗
            </a>
          </div>
        )}
      </div>

      {embutido && !jogador.doPlantel && veObsBruto && evolucaoCard}

      {!embutido && !jogador.doPlantel && (
        <div className="card ficha-class" style={{ padding: 18, marginBottom: 22 }}>
          <div className="resumo-card__hd">
            <div className="resumo-card__titulo" style={{ margin: 0 }}>Classificação</div>
          </div>
          <div className="ficha-class__grid">
            <label className="ficha-class__campo">
              <span>Veredito</span>
              <select value={jogador.veredito || ''} onChange={(e) => patchClass('veredito', e.target.value)} disabled={!podeEditar}>
                <option value="">— por definir —</option>
                {VEREDITOS.map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
            <label className="ficha-class__campo">
              <span>Rendimento</span>
              <select value={jogador.rendimento || ''} onChange={(e) => patchClass('rendimento', e.target.value)} disabled={!podeEditar}>
                <option value="">—</option>
                {RENDIMENTOS.map((r) => (<option key={r} value={r}>{r} · {RENDIMENTO_LABEL[r]}</option>))}
              </select>
            </label>
            {podePot ? (
              <label className="ficha-class__campo">
                <span>Potencial</span>
                <select value={jogador.potencialClass || ''} onChange={(e) => patchClass('potencialClass', e.target.value)} disabled={!podeEditar}>
                  <option value="">—</option>
                  {POTENCIAIS.map((p) => (<option key={p} value={p}>{p} · {POTENCIAL_LABEL[p]}</option>))}
                </select>
              </label>
            ) : (
              <label className="ficha-class__campo">
                <span>Potencial</span>
                <span className="ficha-class__na">só até {IDADE_MAX_POTENCIAL} anos</span>
              </label>
            )}
            <label className="ficha-class__campo">
              <span>Perfil</span>
              <select value={jogador.perfil || ''} onChange={(e) => patchClass('perfil', e.target.value)} disabled={!podeEditar}>
                <option value="">—</option>
                {PERFIS.map((p) => (<option key={p} value={p}>{PERFIL_NUM[p]} · {PERFIL_LABEL[p]}</option>))}
              </select>
            </label>
          </div>
          <div className="ficha-class__sub">Avaliação — nível de liga projetado</div>
          <div className="ficha-class__grid">
            {[['avaliacaoImediata', 'Imediata'], ['avaliacaoMedioPrazo', 'Médio prazo'], ['avaliacaoLongoPrazo', 'Longo prazo']].map(([campo, label]) => (
              <label className="ficha-class__campo" key={campo}>
                <span>{label}</span>
                <select value={jogador[campo] ?? ''} onChange={(e) => patchClass(campo, e.target.value === '' ? null : Number(e.target.value))} disabled={!podeEditar}>
                  <option value="">—</option>
                  {AVALIACAO_NIVEIS.map((n) => (<option key={n} value={n}>{n} · {AVALIACAO_NIVEL_LABEL[n]}</option>))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

        </div>

        <div className="ficha-split__col">
        {jogador.doPlantel && <AvaliacaoPlantel jogador={jogador} aoMudar={() => { carregar(); carregarAvaisPlantel(); }} />}
        {!embutido && !jogador.doPlantel && veObsBruto && evolucaoCard}

      {(perfisDados.length > 0 || (podeEditar && !jogador.doPlantel)) && (
        <div className="card perfil-dados">
          <div className="resumo-card__hd" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="resumo-card__titulo" style={{ margin: 0 }}>Perfil de dados</div>
            {podeEditar && (
              <span className="perfil-dados__acoes">
                <button type="button" className="btn btn--secundario btn--pequeno" onClick={() => setLigarAberto(true)}>
                  {perfisDados.length ? '⚙ Corrigir associação' : '+ Ligar a dados'}
                </button>
                {perfisDados.length > 0 && (
                  <button type="button" className="btn btn--secundario btn--pequeno" onClick={desligarDados} title="Remover a associação">×</button>
                )}
              </span>
            )}
          </div>
          {perfisDados.length === 0 && (
            <p className="perfil-dados__vazio">
              Sem dados Wyscout associados. Os nomes nem sempre coincidem — liga à mão com “+ Ligar a dados”.
            </p>
          )}
          {perfisDados.map((p) => (
            <div key={p.competicao + p.epoca} className="perfil-dados__bloco">
              <RadarDados series={[{ nome: jogador.nomeCompleto, cor: 'var(--verde)', eixos: p.eixos }]} />
            </div>
          ))}
          {perfisDados.length > 0 && (
            <p className="perfil-dados__nota">
              Dados Wyscout, por 90 minutos. Percentil = comparação com os jogadores da mesma posição na
              liga/época. O físico e a personalidade não estão nos dados — avalia-os pelo olho.
            </p>
          )}
        </div>
      )}

      {ligarAberto && (
        <Modal titulo="Ligar a dados Wyscout" aoFechar={() => setLigarAberto(false)}>
          <p style={{ marginTop: 0, color: 'var(--texto-suave)', fontSize: 13 }}>
            Procura pelo nome como aparece no Wyscout (muitas vezes abreviado) ou pela equipa, e liga ao jogador.
          </p>
          <input
            className="jog-busca"
            type="search"
            autoFocus
            placeholder="Nome ou equipa no Wyscout…"
            value={buscaDados}
            onChange={(e) => setBuscaDados(e.target.value)}
            style={{ width: '100%', marginBottom: 10 }}
          />
          <div className="ligar-res">
            {buscaDados.trim().length < 2 ? (
              <p className="jog-muted" style={{ fontSize: 13 }}>Escreve pelo menos 2 letras.</p>
            ) : resDados.length === 0 ? (
              <p className="jog-muted" style={{ fontSize: 13 }}>Sem resultados.</p>
            ) : (
              resDados.map((r) => (
                <button key={r.chave} type="button" className="ligar-item" onClick={() => ligarDados(r.chave)}>
                  <span className="ligar-item__nome">
                    {r.nome} <span className="ligar-item__eq">· {r.equipa || '—'}</span>
                    {r.jaLigado && <span className="ligar-item__ja">já ligado</span>}
                  </span>
                  <span className="ligar-item__meta">
                    {r.grupo} · {[...new Set(r.competicoes)].join(', ')} · {r.minutos}′
                  </span>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}


      <div className="ficha-hist-grid">
        {veObsBruto && (
        <div>
          <h3 className="seccao-titulo">Histórico de observações ({jogador.observacoes?.length || 0})</h3>
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Adversário</th>
                  <th>Veredito</th>
                  <th className="c">Rating</th>
                </tr>
              </thead>
              <tbody>
                {!jogador.observacoes || jogador.observacoes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="tabela-vazia">Sem observações registadas.</td>
                  </tr>
                ) : (
                  jogador.observacoes.map((o) => (
                    <tr
                      key={o._id}
                      className="linha-clicavel"
                      onClick={() => navegar('/observacoes?obs=' + o._id + '&voltar=' + encodeURIComponent(voltarAqui))}
                      title="Abrir o relatório desta observação"
                    >
                      <td className="num">{dataCurta(o.dataObservacao || o.dataJogo)}</td>
                      <td>{o.adversario || '—'}</td>
                      <td><ObsVeredito v={o.veredito} /></td>
                      <td className="c"><b className="obs-hist__rating">{o.rating != null ? o.rating.toFixed(1) : '—'}</b></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
        <div>
          <div className="ficha-rel-cab">
            <h3 className="seccao-titulo">Histórico de relatórios ({relatorios.length})</h3>
            {podeEditar && (
              <button className="btn btn--secundario btn--pequeno" onClick={novoRelatorio} title="Gera o relatório (template RCA) com os dados atuais e guarda-o. Abre para imprimir → PDF.">
                + Novo relatório
              </button>
            )}
          </div>
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Título</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {relatorios.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="tabela-vazia">Sem relatórios. Cria um com “+ Novo relatório”.</td>
                  </tr>
                ) : (
                  relatorios.map((r) => (
                    <tr
                      key={r._id}
                      className="linha-clicavel"
                      onClick={() => window.open('/api/relatorios/' + r._id, '_blank')}
                      title="Abrir o relatório (imprime → PDF)"
                    >
                      <td className="num">{dataCurta(r.createdAt)}</td>
                      <td>{r.titulo || '—'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {podeEditar && (
                          <button className="btn btn--perigo btn--pequeno" title="Apagar relatório" onClick={() => apagarRelatorio(r._id)}>
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </div>
      </div>

    </div>
  );
}
