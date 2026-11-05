import { useState, useRef, useEffect, useMemo } from 'react';
import {
  POSICOES,
  VEREDITOS,
  RENDIMENTOS,
  POTENCIAIS,
  RENDIMENTO_LABEL,
  POTENCIAL_LABEL,
  IDADE_MAX_POTENCIAL,
  dataInput,
  idade,
  posCurto,
} from '../lib.js';
import { ESCALA_PRESSAO } from '../grelhaPosicao.js';
import { obterGrelha } from '../grelhaConfig.js';
import CampoCompeticao from './CampoCompeticao.jsx';
import { api } from '../api.js';

// Guia da nota 1-5 (nível de liga) — igual em toda a plataforma.
const GUIA_PRESSAO = ESCALA_PRESSAO.map((e) => `${e.min}: ${e.txt}`).join('\n');

// As 4 categorias de avaliação (as mesmas do relatório: 2. Técnica, 3. Tática,
// 4. Física, 5. Mental).
const CATEGORIAS_AVAL = [
  { key: 'tecnica', nome: 'Técnica' },
  { key: 'tatica', nome: 'Tática' },
  { key: 'fisica', nome: 'Física' },
  { key: 'mental', nome: 'Mental' },
];

// Seletor de jogador com pesquisa (typeahead) sobre a lista já carregada —
// mais rápido que percorrer um <select> com dezenas de nomes.
function SeletorJogador({ jogadores, valor, aoEscolher }) {
  const nomeSel = jogadores.find((j) => j._id === valor)?.nomeCompleto || '';
  const [texto, setTexto] = useState(nomeSel);
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef(null);
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const filtrados = useMemo(() => {
    const q = norm(texto.trim());
    const base = q ? jogadores.filter((j) => norm(j.nomeCompleto).includes(q)) : jogadores;
    return base.slice(0, 12);
  }, [texto, jogadores]);

  useEffect(() => {
    const fora = (e) => caixaRef.current && !caixaRef.current.contains(e.target) && setAberto(false);
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const escolher = (j) => {
    aoEscolher(j._id);
    setTexto(j.nomeCompleto);
    setAberto(false);
  };

  return (
    <div className="pesquisa" ref={caixaRef}>
      <input
        type="search"
        placeholder="Escrever nome do jogador…"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          aoEscolher(''); // só volta a valer quando se escolhe da lista
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        autoComplete="off"
      />
      {aberto && (
        <div className="pesquisa__resultados">
          {filtrados.length === 0 && <div className="pesquisa__vazio">Sem jogadores.</div>}
          {filtrados.map((j) => (
            <button type="button" key={j._id} className="pesquisa__item" onClick={() => escolher(j)}>
              <strong>{j.nomeCompleto}</strong>
              <small>
                {posCurto(j.posicaoPrincipal)}
                {j.clubeAtual ? ' · ' + j.clubeAtual : ''}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FormularioObservacao({
  jogadores,
  jogadorFixo,
  posicaoJogador,
  inicial,
  aoGuardar,
  aoCancelar,
  aGuardar,
  textoBotao = 'Registar observação',
}) {
  // Grelha ativa (seleção de atributos por posição) — vem da config do servidor.
  const [grelhaAtiva, setGrelhaAtiva] = useState(null);
  useEffect(() => {
    obterGrelha().then(setGrelhaAtiva);
  }, []);

  const [f, setF] = useState(() => {
    // Pontos fortes/fracos agora são DUAS caixas gerais (texto livre). Dados antigos
    // eram por dimensão — achatam-se para a caixa respetiva como ponto de partida.
    const textoDe = (it) => (typeof it === 'string' ? it : it?.texto || '');
    const linhas = (arr) => (arr || []).map(textoDe).filter(Boolean).join('\n');
    const todasLinhas = (porCat) => CATEGORIAS_AVAL.map((c) => linhas(porCat?.[c.key])).filter(Boolean).join('\n');
    // Grelha da posição: mapa "categoria.atributo" -> nota (string p/ input).
    const grelhaInit = {};
    if (inicial?.grelhaPosicao) {
      for (const [k, v] of Object.entries(inicial.grelhaPosicao)) grelhaInit[k] = String(v);
    }
    return {
      jogador: jogadorFixo || inicial?.jogador?._id || inicial?.jogador || '',
      grelha: grelhaInit,
      dataJogo: dataInput(inicial?.dataJogo) || dataInput(new Date()),
      dataObservacao: dataInput(inicial?.dataObservacao) || dataInput(new Date()),
      competicao: inicial?.competicao || '',
      adversario: inicial?.adversario || '',
      minutos: inicial?.minutos ?? '',
      posicaoJogo: inicial?.posicaoJogo || posicaoJogador || '',
      titular: inicial?.titular ?? true,
      veredito: inicial?.veredito || '',
      rendimento: inicial?.rendimento || '',
      potencialClass: inicial?.potencialClass || '',
      fortes: inicial?.fortes || todasLinhas(inicial?.pontosFortes),
      fracos: inicial?.fracos || todasLinhas(inicial?.pontosDesenvolver),
      estiloJogo: inicial?.estiloJogo || '',
      notas: inicial?.notas || '',
    };
  });
  const [erroJog, setErroJog] = useState(false);
  // Observação nova → popup para validar a decisão/R/P que ficam no PERFIL do jogador.
  const [perfilPendente, setPerfilPendente] = useState(null); // { dados, veredito, rendimento, potencialClass } | null

  // Carrega todas as observações uma vez, para pré-preencher o estilo de jogo com o
  // texto da observação mais recente do jogador.
  const [todasObs, setTodasObs] = useState([]);
  useEffect(() => {
    let cancelado = false;
    api
      .get('/observations')
      .then((obs) => !cancelado && setTodasObs(obs || []))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const jogadorSel = (jogadores || []).find((j) => j._id === (jogadorFixo || f.jogador));

  // Potencial só se aplica ≤ IDADE_MAX_POTENCIAL anos — bloqueia o campo pela idade do
  // jogador selecionado (automático; o servidor impõe a mesma regra ao gravar).
  const idadeSel = jogadorSel
    ? idade(jogadorSel.dataNascimento)
    : inicial?.jogador?.dataNascimento
      ? idade(inicial.jogador.dataNascimento)
      : '—';
  const podePotObs = idadeSel === '—' || idadeSel <= IDADE_MAX_POTENCIAL;

  // A 1ª observação de um jogador define o perfil automaticamente (feito no servidor).
  // A partir da 2ª, o perfil é manual — mostra-se um lembrete para rever veredito/
  // rendimento/potencial antes de guardar. (Não se aplica a editar uma obs existente.)
  const editando = !!inicial?._id;
  const nObsJogador = todasObs.filter(
    (o) => (o.jogador?._id || o.jogador) === (jogadorFixo || f.jogador)
  ).length;

  // Estilo de jogo: numa observação NOVA, pré-preencher com o texto da observação
  // mais recente do jogador — o scout vai refinando o MESMO estilo ao longo do tempo.
  // Só NÃO carrega quando se está a EDITAR uma observação existente (tem _id): aí
  // mantém-se o estilo dessa observação. Quando a Agenda/calendário abre o formulário
  // com `inicial` já preenchido (adversário/data/competição) mas SEM _id, é uma
  // observação nova — por isso também tem de puxar a última versão do estilo.
  useEffect(() => {
    if (inicial?._id) return; // a editar uma observação existente: mantém o estilo dela
    const jid = jogadorFixo || f.jogador;
    if (!jid) return;
    // todasObs vem por dataJogo desc → o 1º com estilo é o mais recente.
    const doJog = todasObs.filter((o) => (o.jogador?._id || o.jogador) === jid);
    const ultimo = doJog.find((o) => o.estiloJogo && o.estiloJogo.trim())?.estiloJogo || '';
    setF((s) => ({ ...s, estiloJogo: ultimo }));
  }, [jogadorFixo, f.jogador, inicial, todasObs]);

  const setAdversario = (e) => setF((s) => ({ ...s, adversario: e.target.value }));

  // Grelha da posição — atributos fixos da posição do jogador (eixos comuns,
  // comparáveis entre jogadores). Base do rating comparável.
  // A grelha segue a POSIÇÃO QUE JOGOU NESTE JOGO (f.posicaoJogo); só se ainda não
  // estiver escolhida é que cai para a posição de perfil (default sensato).
  const posGrelhaKey = f.posicaoJogo || posicaoJogador || jogadorSel?.posicaoPrincipal || null;
  const posGrelha = posGrelhaKey && grelhaAtiva ? grelhaAtiva[posGrelhaKey] : null;
  // Obs antiga (sem grelha) a ser editada: a nota legada por dimensão serve de
  // fallback (mostrada como "anterior") até ser reavaliada na grelha.
  const obsLegada = !!inicial && !inicial.grelhaPosicao;
  const setGrelha = (cat, k) => (e) =>
    setF((s) => ({ ...s, grelha: { ...s.grelha, [cat + '.' + k]: e.target.value } }));
  const notaGrelhaDim = (cat) => {
    const attrs = (posGrelha && posGrelha[cat]) || [];
    const rated = attrs
      .map((a) => ({ p: a.p, v: f.grelha[cat + '.' + a.k] }))
      .filter((x) => x.v !== '' && x.v != null && !Number.isNaN(Number(x.v)));
    if (!rated.length) return null;
    const sp = rated.reduce((s, x) => s + x.p, 0);
    const t = rated.reduce((s, x) => s + Number(x.v) * x.p, 0);
    return Math.round((t / sp) * 10) / 10; // nível de liga da dimensão (1-5, uma casa decimal)
  };

  // Nota legada da dimensão (a que a obs tinha antes da grelha) — só como fallback.
  const notaLegada = (cat) => {
    const v = inicial?.avaliacao?.[cat];
    return typeof v === 'number' && !Number.isNaN(v) ? v : null;
  };
  // Nota que ENTRA no rating e na gravação: a nota da grelha e, numa obs antiga
  // ainda não reavaliada, a nota legada como fallback. Sem isto, gravar uma obs
  // antiga sem preencher a grelha apagava as notas legadas (regressão de dados).
  const notaFinal = (cat) => {
    const e = notaGrelhaDim(cat);
    if (e != null) return e;
    return obsLegada ? notaLegada(cat) : null;
  };

  // Rating calculado das 4 dimensões (fórmula ponderada, igual ao servidor).
  const PESOS_AVAL = { tecnica: 0.2, tatica: 0.2, fisica: 0.15, mental: 0.2 };
  const ratingBase = (() => {
    const ent = Object.entries(PESOS_AVAL)
      .map(([k, p]) => [k, p, notaFinal(k)])
      .filter((x) => x[2] != null);
    if (!ent.length) return null;
    const sp = ent.reduce((s, x) => s + x[1], 0);
    const t = ent.reduce((s, x) => s + x[2] * x[1], 0);
    return Math.round((t / sp) * 10) / 10; // uma casa decimal
  })();
  // Rating = média ponderada das dimensões (1-5, uma casa decimal). Sem ajuste da divisão.
  const ratingCalc = ratingBase;

  const set = (campo) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((s) => ({ ...s, [campo]: v }));
  };

  // Monta o objeto da observação a enviar (sem o `perfil`, que vem do popup).
  const construirDados = () => {
    const num = (v) => (v === '' || v == null ? undefined : Number(v));
    // avaliacao = nota que gera o rating por dimensão (grelha; nas obs antigas ainda
    // não reavaliadas, o fallback legado evita apagar as notas ao gravar).
    const avaliacao = Object.fromEntries(CATEGORIAS_AVAL.map((c) => [c.key, notaFinal(c.key) ?? undefined]));
    // Grelha da posição: só os atributos com nota válida.
    const grelhaPosicao = Object.fromEntries(
      Object.entries(f.grelha)
        .filter(([, v]) => v !== '' && v != null && !Number.isNaN(Number(v)))
        .map(([k, v]) => [k, Number(v)])
    );
    return {
      ...f,
      titular: f.titular === true || f.titular === 'true',
      minutos: num(f.minutos),
      posicaoJogo: f.posicaoJogo || undefined,
      potencialClass: podePotObs ? f.potencialClass : '', // ≥23 anos → sem potencial
      avaliacao,
      grelhaPosicao,
    };
  };

  const submeter = (e) => {
    e.preventDefault();
    if (!jogadorFixo && !f.jogador) {
      setErroJog(true);
      return;
    }
    const dados = construirDados();
    // A editar uma observação existente → grava direto (não mexe no perfil por popup).
    if (editando) {
      aoGuardar(dados);
      return;
    }
    // Observação NOVA → abre o popup para validar a decisão/R/P que vão ao perfil
    // (pré-preenchido com o que acabaste de avaliar nesta observação).
    setPerfilPendente({
      dados,
      veredito: f.veredito || '',
      rendimento: f.rendimento || '',
      potencialClass: podePotObs ? f.potencialClass || '' : '',
    });
  };

  // Confirma o popup: guarda a observação e envia o perfil validado (decisão/R/P).
  const confirmarPerfil = () => {
    if (!perfilPendente) return;
    const { dados, veredito, rendimento, potencialClass } = perfilPendente;
    aoGuardar({ ...dados, perfil: { veredito, rendimento, potencialClass } });
    setPerfilPendente(null);
  };
  const setCampoPerfil = (k) => (e) => setPerfilPendente((s) => ({ ...s, [k]: e.target.value }));

  return (
    <>
    <form onSubmit={submeter}>
      <div className="form-grelha">
        {!jogadorFixo && (
          <div className="campo campo--largo">
            <label>Jogador *</label>
            <SeletorJogador
              jogadores={jogadores}
              valor={f.jogador}
              aoEscolher={(id) => {
                setF((s) => ({ ...s, jogador: id }));
                if (id) setErroJog(false);
              }}
            />
            {erroJog && (
              <small style={{ color: 'var(--vermelho, #c0392b)' }}>Escolhe um jogador da lista.</small>
            )}
          </div>
        )}

        <div className="campo">
          <label>Data em que viste *</label>
          <input type="date" value={f.dataObservacao} onChange={set('dataObservacao')} required />
        </div>
        <div className="campo">
          <label>Data do jogo *</label>
          <input type="date" value={f.dataJogo} onChange={set('dataJogo')} required />
        </div>
        <div className="campo">
          <label>Competição</label>
          <CampoCompeticao
            valor={f.competicao}
            onChange={(v) => setF((s) => ({ ...s, competicao: v }))}
          />
        </div>
        <div className="campo">
          <label>Adversário</label>
          <input value={f.adversario} onChange={setAdversario} list="adversarios-conhecidos" />
          <datalist id="adversarios-conhecidos">
            {[...new Set(todasObs.map((o) => o.adversario).filter(Boolean))].sort().map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
        </div>
        <div className="campo">
          <label>Minutos jogados</label>
          <input type="number" min="0" max="120" value={f.minutos} onChange={set('minutos')} />
        </div>
        <div className="campo">
          <label>Posição no jogo</label>
          <select value={f.posicaoJogo} onChange={set('posicaoJogo')}>
            <option value="">—</option>
            {POSICOES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.curto}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label>Titular / Suplente</label>
          <select value={String(f.titular)} onChange={(e) => setF((s) => ({ ...s, titular: e.target.value === 'true' }))}>
            <option value="true">Titular</option>
            <option value="false">Suplente</option>
          </select>
        </div>
        <div className="campo campo--largo">
          <label style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.4px', color: 'var(--texto-suave)' }}>
            Classificação nesta observação
          </label>
        </div>
        <div className="campo">
          <label>Veredito</label>
          <select value={f.veredito} onChange={set('veredito')}>
            <option value="">—</option>
            {VEREDITOS.map((v) => (<option key={v} value={v}>{v}</option>))}
          </select>
        </div>
        <div className="campo">
          <label>Rendimento</label>
          <select value={f.rendimento} onChange={set('rendimento')}>
            <option value="">—</option>
            {RENDIMENTOS.map((r) => (<option key={r} value={r}>{r} · {RENDIMENTO_LABEL[r]}</option>))}
          </select>
        </div>
        <div className="campo">
          <label>Potencial{podePotObs ? '' : ` (só ≤${IDADE_MAX_POTENCIAL} anos)`}</label>
          {podePotObs ? (
            <select value={f.potencialClass} onChange={set('potencialClass')}>
              <option value="">—</option>
              {POTENCIAIS.map((p) => (<option key={p} value={p}>{p} · {POTENCIAL_LABEL[p]}</option>))}
            </select>
          ) : (
            <select value="" disabled title={`Potencial só até ${IDADE_MAX_POTENCIAL} anos`}>
              <option value="">—</option>
            </select>
          )}
        </div>
        <div className="campo campo--largo">
          <label>Estilo de jogo</label>
          <textarea
            value={f.estiloJogo}
            onChange={set('estiloJogo')}
            placeholder="Como joga o atleta. Aparece o que escreveste na observação anterior — vai refinando a cada observação."
            rows={5}
            style={{ width: '100%' }}
          />
        </div>

        <div className="form-subtitulo">
          Avaliação por dimensão
          <span style={{ float: 'right', fontWeight: 700 }}>
            Rating calculado: {ratingCalc != null ? ratingCalc.toFixed(1) : '—'} / 5
          </span>
        </div>
        <div className="campo campo--largo">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
            {CATEGORIAS_AVAL.map((c) => (
              <div
                key={c.key}
                style={{
                  border: '1px solid var(--borda)',
                  borderRadius: 8,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ fontWeight: 700, marginBottom: 0 }}>{c.nome}</label>
                  {(() => {
                    const graduada = notaGrelhaDim(c.key); // da grelha
                    const val = notaFinal(c.key); // grelha OU nota legada
                    const ehLegada = graduada == null && val != null;
                    return (
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                        {ehLegada && (
                          <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--texto-suave)' }}>
                            anterior
                          </span>
                        )}
                        <strong
                          title={ehLegada ? 'Nota anterior — preenche a grelha para a atualizar' : 'Nota efetiva da dimensão'}
                          style={{ fontSize: 16, color: ehLegada ? 'var(--texto-suave)' : undefined }}
                        >
                          {val != null ? val.toFixed(1) : '—'}
                        </strong>
                      </span>
                    );
                  })()}
                </div>
                {posGrelha && posGrelha[c.key] && (
                  <div className="grelha-attrs">
                    {posGrelha[c.key].map((a) => (
                      <div className="grelha-attr" key={a.k}>
                        <span className="grelha-attr__l">
                          {a.l} <span className="grelha-attr__peso" title={'Peso ' + a.p}>{'●'.repeat(a.p)}</span>
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="1"
                          className="grelha-attr__in"
                          value={f.grelha[c.key + '.' + a.k] ?? ''}
                          onChange={setGrelha(c.key, a.k)}
                          title={GUIA_PRESSAO}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="campo campo--largo">
          <div className="campo-chips-bloco">
            <span className="campo-chips-bloco__rot campo-chips-bloco__rot--ok">Pontos fortes</span>
            <textarea
              value={f.fortes}
              onChange={set('fortes')}
              placeholder="Texto livre — um por linha"
              rows={5}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
        <div className="campo campo--largo">
          <div className="campo-chips-bloco">
            <span className="campo-chips-bloco__rot campo-chips-bloco__rot--aviso">Pontos fracos</span>
            <textarea
              value={f.fracos}
              onChange={set('fracos')}
              placeholder="Texto livre — um por linha"
              rows={5}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="campo campo--largo">
          <label>Notas</label>
          <textarea value={f.notas} onChange={set('notas')} />
        </div>
      </div>

      <div className="modal__rodape" style={{ padding: '18px 0 0', border: 'none' }}>
        <button type="button" className="btn btn--secundario" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : textoBotao}
        </button>
      </div>
    </form>

    {perfilPendente && (
      <div className="modal-fundo" onClick={() => setPerfilPendente(null)}>
        <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal__cabecalho">
            <h3>Perfil do jogador</h3>
            <button type="button" className="modal__fechar" onClick={() => setPerfilPendente(null)} aria-label="Fechar">×</button>
          </div>
          <div className="modal__corpo">
            <p style={{ margin: '0 0 16px', color: 'var(--texto-suave)', fontSize: 13, lineHeight: 1.5 }}>
              Valida a <b>decisão</b>, o <b>rendimento</b> e o <b>potencial</b> que ficam no perfil de{' '}
              <b>{jogadorSel?.nomeCompleto || inicial?.jogador?.nomeCompleto || 'este jogador'}</b> com esta observação.
            </p>
            <div className="form-grelha">
              <div className="campo">
                <label>Decisão</label>
                <select value={perfilPendente.veredito} onChange={setCampoPerfil('veredito')}>
                  <option value="">—</option>
                  {VEREDITOS.map((v) => (<option key={v} value={v}>{v}</option>))}
                </select>
              </div>
              <div className="campo">
                <label>Rendimento (R)</label>
                <select value={perfilPendente.rendimento} onChange={setCampoPerfil('rendimento')}>
                  <option value="">—</option>
                  {RENDIMENTOS.map((r) => (<option key={r} value={r}>{r} · {RENDIMENTO_LABEL[r]}</option>))}
                </select>
              </div>
              {podePotObs && (
                <div className="campo">
                  <label>Potencial (P)</label>
                  <select value={perfilPendente.potencialClass} onChange={setCampoPerfil('potencialClass')}>
                    <option value="">—</option>
                    {POTENCIAIS.map((p) => (<option key={p} value={p}>{p} · {POTENCIAL_LABEL[p]}</option>))}
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="modal__rodape">
            <button type="button" className="btn btn--secundario" onClick={() => setPerfilPendente(null)}>Cancelar</button>
            <button type="button" className="btn" onClick={confirmarPerfil} disabled={aGuardar}>
              {aGuardar ? 'A guardar…' : 'Confirmar e guardar'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
