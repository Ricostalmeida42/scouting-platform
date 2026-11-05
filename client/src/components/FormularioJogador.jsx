import { useState, useEffect } from 'react';
import { api } from '../api.js';
import {
  POSICOES,
  ESTADOS_PLANTEL,
  RENDIMENTOS,
  POTENCIAIS,
  RENDIMENTO_LABEL,
  POTENCIAL_LABEL,
  PERFIS,
  PERFIL_LABEL,
  PERFIL_NUM,
  VEREDITOS,
  AVALIACAO_NIVEIS,
  AVALIACAO_NIVEL_LABEL,
  IDADE_MAX_POTENCIAL,
  dataInput,
  idade,
  posCurto,
} from '../lib.js';
import CampoFoto from './CampoFoto.jsx';

const vazio = {
  foto: '',
  nomeCompleto: '',
  posicaoPrincipal: 'GR',
  posicoesSecundarias: [],
  dataNascimento: '',
  numero: '',
  altura: '',
  pePreferencial: '',
  internacional: '',
  clubeAtual: '',
  clube: '',
  clubeSecundarioNome: '',
  clubeSecundario: '',
  liga: '',
  fimContrato: '',
  agente: '',
  contacto: '',
  valorEstimado: '',
  potencialValorizacao: '',
  condicoesContratuais: '',
  avaliacao: {},
  rendimento: '',
  potencialClass: '',
  perfil: '',
  veredito: '',
  avaliacaoImediata: '',
  avaliacaoMedioPrazo: '',
  avaliacaoLongoPrazo: '',
  estadoPlantel: '',
  linkRelatorio: '',
  recursos: [],
  notas: '',
  analiseTatica: { orgOfensiva: '', transOfensiva: '', orgDefensiva: '', transDefensiva: '', bolaParada: '' },
  sinteseQualitativa: '',
  veredictoModelo: '',
  enquadramentoModelo: '',
};

export default function FormularioJogador({ inicial, aoGuardar, aoCancelar, aGuardar, plantel = false }) {
  const [f, setF] = useState(() => {
    if (!inicial) return vazio;
    return {
      ...vazio,
      ...inicial,
      dataNascimento: dataInput(inicial.dataNascimento),
      fimContrato: dataInput(inicial.fimContrato),
      valorEstimado: inicial.valorEstimado ?? '',
      potencialValorizacao: inicial.potencialValorizacao || '',
      condicoesContratuais: inicial.condicoesContratuais || '',
      avaliacao: inicial.avaliacao || {},
      clube: inicial.clube ? String(inicial.clube) : '',
      clubeSecundario: inicial.clubeSecundario ? String(inicial.clubeSecundario) : '',
      perfil: inicial.perfil || '',
      veredito: inicial.veredito || '',
      avaliacaoImediata: inicial.avaliacaoImediata ?? '',
      avaliacaoMedioPrazo: inicial.avaliacaoMedioPrazo ?? '',
      avaliacaoLongoPrazo: inicial.avaliacaoLongoPrazo ?? '',
      foto: inicial.foto || '',
      estadoPlantel: inicial.estadoPlantel || '',
      recursos: inicial.recursos?.length ? inicial.recursos : [],
      analiseTatica: { ...vazio.analiseTatica, ...(inicial.analiseTatica || {}) },
      sinteseQualitativa: inicial.sinteseQualitativa || '',
      veredictoModelo: inicial.veredictoModelo || '',
      enquadramentoModelo: inicial.enquadramentoModelo || '',
    };
  });

  // Deteção de duplicados: só ao criar (sem inicial), procura nomes parecidos.
  const [duplicados, setDuplicados] = useState([]);
  useEffect(() => {
    if (inicial) return; // a editar, não avisa
    const nome = f.nomeCompleto.trim();
    if (nome.length < 3) {
      setDuplicados([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get('/players?incluirArquivo=true&incluirPlantel=true&q=' + encodeURIComponent(nome))
        .then((lista) => setDuplicados(lista.slice(0, 5)))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [f.nomeCompleto, inicial]);

  // Clubes registados (para ligar o jogador ao clube → cruzamento do calendário).
  const [clubes, setClubes] = useState([]);
  useEffect(() => {
    api.get('/clubs').then(setClubes).catch(() => {});
  }, []);
  const normNome = (s) =>
    (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[."'`]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

  const set = (campo) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((s) => ({ ...s, [campo]: v }));
  };

  // Ao escrever/escolher o clube: se corresponder a um clube registado, liga a
  // referência (clube) e herda a liga; caso contrário fica texto livre (clube nulo).
  const setClube = (e) => {
    const v = e.target.value;
    const achado = clubes.find((c) => normNome(c.nome) === normNome(v));
    setF((s) => ({
      ...s,
      clubeAtual: v,
      clube: achado ? achado._id : '',
      liga: achado && achado.liga ? achado.liga.nome || s.liga : s.liga,
    }));
  };
  const clubeLigado = clubes.find((c) => String(c._id) === String(f.clube));

  // 2.ª equipa: mesma lógica de ligação, mas não mexe na liga/mercado (esses
  // seguem o clube principal).
  const setClubeSecundario = (e) => {
    const v = e.target.value;
    const achado = clubes.find((c) => normNome(c.nome) === normNome(v));
    setF((s) => ({ ...s, clubeSecundarioNome: v, clubeSecundario: achado ? achado._id : '' }));
  };
  const clubeSecLigado = clubes.find((c) => String(c._id) === String(f.clubeSecundario));

  const adicionarSecundaria = (k) => {
    if (!k) return;
    setF((s) => ({ ...s, posicoesSecundarias: [...(s.posicoesSecundarias || []), k] }));
  };
  const removerSecundaria = (k) =>
    setF((s) => ({ ...s, posicoesSecundarias: (s.posicoesSecundarias || []).filter((x) => x !== k) }));

  // Recursos (links de vídeo/highlights)
  const addRecurso = () => setF((s) => ({ ...s, recursos: [...s.recursos, { titulo: '', url: '' }] }));
  const setRecurso = (i, campo) => (e) =>
    setF((s) => {
      const recursos = s.recursos.map((r, idx) => (idx === i ? { ...r, [campo]: e.target.value } : r));
      return { ...s, recursos };
    });
  const removeRecurso = (i) => setF((s) => ({ ...s, recursos: s.recursos.filter((_, idx) => idx !== i) }));

  const submeter = (e) => {
    e.preventDefault();
    const limparNivel = (v) => (v === '' || v == null ? null : Number(v));
    const limparData = (v) => (v ? v : undefined);
    aoGuardar({
      ...f,
      avaliacaoImediata: limparNivel(f.avaliacaoImediata),
      avaliacaoMedioPrazo: limparNivel(f.avaliacaoMedioPrazo),
      avaliacaoLongoPrazo: limparNivel(f.avaliacaoLongoPrazo),
      estadoPlantel: f.estadoPlantel || null,
      dataNascimento: limparData(f.dataNascimento),
      fimContrato: limparData(f.fimContrato),
      valorEstimado: f.valorEstimado === '' || f.valorEstimado == null ? null : Number(f.valorEstimado),
      recursos: f.recursos.filter((r) => r.url && r.url.trim()),
      veredictoModelo: f.veredictoModelo || null,
      enquadramentoModelo: f.enquadramentoModelo || null,
      clube: f.clube || null,
      clubeSecundario: f.clubeSecundario || null,
      // No plantel a avaliação/rating são geridos pelo histórico de avaliações
      // (não se tocam na edição da bio).
      ...(plantel ? { avaliacao: undefined, ratingFinal: undefined } : {}),
    });
  };

  const idadeForm = idade(f.dataNascimento);
  const podePot = idadeForm == null || idadeForm <= IDADE_MAX_POTENCIAL; // Potencial só ≤22

  return (
    <form onSubmit={submeter} id="form-jogador">
      <div className="form-split">
        <div className="form-split__col">
      <div className="form-grelha">
        <div className="form-subtitulo" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          Identidade
        </div>
        <div className="campo campo--largo">
          <label>Fotografia</label>
          <CampoFoto valor={f.foto} onChange={(v) => setF((s) => ({ ...s, foto: v }))} />
        </div>

        <div className="campo campo--largo">
          <label>Nome completo *</label>
          <input value={f.nomeCompleto} onChange={set('nomeCompleto')} required />
          {duplicados.length > 0 && (
            <div className="aviso-duplicado">
              ⚠ Já existe(m) na base:{' '}
              {duplicados.map((d, i) => (
                <span key={d._id}>
                  {i > 0 && ', '}
                  {d.nomeCompleto}
                </span>
              ))}
              . É a mesma pessoa?
            </div>
          )}
        </div>

        <div className="campo">
          <label>Posição principal *</label>
          <select value={f.posicaoPrincipal} onChange={set('posicaoPrincipal')} required>
            {POSICOES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label>Posições secundárias</label>
          <div className="pos-sec">
            <div className="pos-sec__chips">
              {(f.posicoesSecundarias || []).length === 0 && <span className="pos-sec__vazio">nenhuma</span>}
              {(f.posicoesSecundarias || []).map((k) => (
                <span key={k} className="pos-sec__chip">
                  {posCurto(k)}
                  <button type="button" onClick={() => removerSecundaria(k)} aria-label={'Remover ' + posCurto(k)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <select value="" onChange={(e) => adicionarSecundaria(e.target.value)}>
              <option value="">+ adicionar posição…</option>
              {POSICOES.filter(
                (p) => p.key !== f.posicaoPrincipal && !(f.posicoesSecundarias || []).includes(p.key)
              ).map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="campo">
          <label>Data de nascimento</label>
          <input type="date" value={f.dataNascimento} onChange={set('dataNascimento')} />
        </div>

        <div className="campo">
          <label>Nº</label>
          <input value={f.numero} onChange={set('numero')} placeholder="ex.: 10" inputMode="numeric" />
        </div>
        <div className="campo">
          <label>Altura</label>
          <input value={f.altura} onChange={set('altura')} placeholder="ex.: 1,84 m" />
        </div>
        <div className="campo">
          <label>Pé preferencial</label>
          <select value={f.pePreferencial} onChange={set('pePreferencial')}>
            <option value="">—</option>
            <option value="Direito">Direito</option>
            <option value="Esquerdo">Esquerdo</option>
            <option value="Ambidestro">Ambidestro</option>
          </select>
        </div>
        <div className="campo">
          <label>Internacional</label>
          <input value={f.internacional} onChange={set('internacional')} placeholder="ex.: Sub-19 Portugal / Não" />
        </div>

        <div className="form-subtitulo">Clube e contrato</div>
        <div className="campo">
          <label>Clube atual</label>
          <input
            value={f.clubeAtual}
            onChange={setClube}
            list="lista-clubes"
            placeholder="Escolhe da lista ou escreve…"
          />
          <datalist id="lista-clubes">
            {clubes.map((c) => (
              <option key={c._id} value={c.nome}>
                {c.liga?.nome || ''}
              </option>
            ))}
          </datalist>
          {clubeLigado ? (
            <small style={{ color: 'var(--verde-ok)' }}>
              ✓ ligado ao clube{clubeLigado.liga?.nome ? ` · ${clubeLigado.liga.nome}` : ''}
            </small>
          ) : (
            f.clubeAtual && <small style={{ color: 'var(--texto-suave)' }}>clube não registado (sem cruzamento no calendário)</small>
          )}
        </div>

        <div className="campo">
          <label>
            2.ª equipa <span style={{ color: 'var(--texto-suave)', fontWeight: 400 }}>(opcional)</span>
          </label>
          <input
            value={f.clubeSecundarioNome}
            onChange={setClubeSecundario}
            list="lista-clubes"
            placeholder="Outro escalão do mesmo clube…"
          />
          {clubeSecLigado ? (
            <small style={{ color: 'var(--verde-ok)' }}>
              ✓ ligado ao clube{clubeSecLigado.liga?.nome ? ` · ${clubeSecLigado.liga.nome}` : ''}
            </small>
          ) : (
            f.clubeSecundarioNome && (
              <small style={{ color: 'var(--texto-suave)' }}>clube não registado (sem cruzamento no calendário)</small>
            )
          )}
        </div>

        <div className="campo">
          <label>Liga</label>
          <input value={f.liga} onChange={set('liga')} />
        </div>

        <div className="campo">
          <label>Fim de contrato</label>
          <input type="date" value={f.fimContrato} onChange={set('fimContrato')} />
        </div>

        <div className="campo">
          <label>Agente</label>
          <input value={f.agente} onChange={set('agente')} />
        </div>

        <div className="campo campo--largo">
          <label>Contacto</label>
          <input value={f.contacto} onChange={set('contacto')} placeholder="Telefone, email, contacto do agente…" />
        </div>

        <div className="campo">
          <label>Valor / custo estimado (€)</label>
          <input type="number" min="0" step="1000" value={f.valorEstimado} onChange={set('valorEstimado')} placeholder="ex.: 50000" />
        </div>

        <div className="campo">
          <label>Potencial de valorização</label>
          <select value={f.potencialValorizacao} onChange={set('potencialValorizacao')}>
            <option value="">—</option>
            <option value="Alto">Alto</option>
            <option value="Médio">Médio</option>
            <option value="Baixo">Baixo</option>
          </select>
        </div>

        <div className="campo campo--largo">
          <label>Condições conhecidas</label>
          <input value={f.condicoesContratuais} onChange={set('condicoesContratuais')} placeholder="Cláusula, salário, empréstimo, situação contratual…" />
        </div>

      </div>
        </div>

        <div className="form-split__col">
      <div className="form-grelha">
        {/* Classificação (cabeçalho do relatório) — só no scouting; no plantel
            avalia-se por dimensão (abaixo). */}
        {!plantel && (
        <>
        <div className="form-subtitulo" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          Classificação
        </div>
        <div className="campo">
          <label>Veredito</label>
          <select value={f.veredito} onChange={set('veredito')}>
            <option value="">— por definir —</option>
            {VEREDITOS.map((v) => (<option key={v} value={v}>{v}</option>))}
          </select>
        </div>
        <div className="campo">
          <label>Rendimento</label>
          <select value={f.rendimento} onChange={set('rendimento')} title={f.rendimento ? RENDIMENTO_LABEL[f.rendimento] : ''}>
            <option value="">—</option>
            {RENDIMENTOS.map((r) => (<option key={r} value={r}>{r} · {RENDIMENTO_LABEL[r]}</option>))}
          </select>
        </div>
        <div className="campo">
          <label>Potencial{podePot ? '' : ' (só ≤22 anos)'}</label>
          {podePot ? (
            <select value={f.potencialClass} onChange={set('potencialClass')} title={f.potencialClass ? POTENCIAL_LABEL[f.potencialClass] : ''}>
              <option value="">—</option>
              {POTENCIAIS.map((p) => (<option key={p} value={p}>{p} · {POTENCIAL_LABEL[p]}</option>))}
            </select>
          ) : (
            <input value="— (jogador com mais de 22 anos)" disabled />
          )}
        </div>
        <div className="campo">
          <label>Perfil</label>
          <select value={f.perfil} onChange={set('perfil')}>
            <option value="">—</option>
            {PERFIS.map((p) => (<option key={p} value={p}>{PERFIL_NUM[p]} · {PERFIL_LABEL[p]}</option>))}
          </select>
        </div>
        <div className="campo">
          <label>Avaliação imediata</label>
          <select value={f.avaliacaoImediata} onChange={set('avaliacaoImediata')}>
            <option value="">—</option>
            {AVALIACAO_NIVEIS.map((n) => (<option key={n} value={n}>{n} · {AVALIACAO_NIVEL_LABEL[n]}</option>))}
          </select>
        </div>
        <div className="campo">
          <label>Avaliação médio prazo</label>
          <select value={f.avaliacaoMedioPrazo} onChange={set('avaliacaoMedioPrazo')}>
            <option value="">—</option>
            {AVALIACAO_NIVEIS.map((n) => (<option key={n} value={n}>{n} · {AVALIACAO_NIVEL_LABEL[n]}</option>))}
          </select>
        </div>
        <div className="campo">
          <label>Avaliação longo prazo</label>
          <select value={f.avaliacaoLongoPrazo} onChange={set('avaliacaoLongoPrazo')}>
            <option value="">—</option>
            {AVALIACAO_NIVEIS.map((n) => (<option key={n} value={n}>{n} · {AVALIACAO_NIVEL_LABEL[n]}</option>))}
          </select>
        </div>
        </>
        )}

        {/* No plantel a avaliação por dimensão é feita no PERFIL (histórico de
            avaliações, aberto a todas as contas) — não aqui, na edição da bio. */}

        {/* Recursos / vídeos */}
        <div className="form-subtitulo">Vídeos e recursos</div>
        <div className="campo campo--largo">
          {f.recursos.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input
                value={r.titulo}
                onChange={setRecurso(i, 'titulo')}
                placeholder="Título (ex: Highlights)"
                style={{ flex: '0 0 40%' }}
              />
              <input value={r.url} onChange={setRecurso(i, 'url')} placeholder="https://…" style={{ flex: 1 }} />
              <button type="button" className="btn btn--perigo btn--pequeno" onClick={() => removeRecurso(i)}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="btn btn--secundario btn--pequeno" onClick={addRecurso}>
            + Adicionar link
          </button>
        </div>

        {plantel && (
          <>
            <div className="form-subtitulo">Situação no plantel</div>
            <div className="campo">
              <label>Situação</label>
              <select value={f.estadoPlantel} onChange={set('estadoPlantel')}>
                <option value="">—</option>
                {ESTADOS_PLANTEL.map((e) => (<option key={e} value={e}>{e}</option>))}
              </select>
            </div>
          </>
        )}

        <div className="campo">
          <label>Link para relatório</label>
          <input value={f.linkRelatorio} onChange={set('linkRelatorio')} placeholder="https://…" />
        </div>

        <div className="campo campo--largo">
          <label>Notas</label>
          <textarea value={f.notas} onChange={set('notas')} />
        </div>

        {/* Análise qualitativa — só no scouting (2ª página do relatório) */}
        {!plantel && (
        <>
        <div className="form-subtitulo">Análise qualitativa (perfil tático — 2ª página do relatório)</div>
        {[
          ['orgOfensiva', 'Organização Ofensiva'],
          ['transOfensiva', 'Transição Ofensiva'],
          ['orgDefensiva', 'Organização Defensiva'],
          ['transDefensiva', 'Transição Defensiva'],
          ['bolaParada', 'Bola Parada'],
        ].map(([key, label]) => (
          <div className="campo campo--largo" key={key}>
            <label>{label}</label>
            <textarea
              rows={2}
              value={f.analiseTatica[key]}
              onChange={(e) =>
                setF((s) => ({ ...s, analiseTatica: { ...s.analiseTatica, [key]: e.target.value } }))
              }
            />
          </div>
        ))}
        <div className="campo campo--largo">
          <label>Síntese (imagem global para treinador e direção)</label>
          <textarea value={f.sinteseQualitativa} onChange={set('sinteseQualitativa')} />
        </div>
        <div className="campo">
          <label>Encaixe no modelo de jogo</label>
          <select value={f.veredictoModelo} onChange={set('veredictoModelo')}>
            <option value="">— A definir</option>
            <option value="adequado">Adequado ao modelo</option>
            <option value="nao_adequado">Não adequado ao modelo</option>
          </select>
        </div>
        <div className="campo campo--largo">
          <label>Enquadramento ideal no modelo</label>
          <textarea
            value={f.enquadramentoModelo}
            onChange={set('enquadramentoModelo')}
            placeholder="O que achas ser o enquadramento ideal deste jogador no nosso modelo de jogo (função, zona, contexto)…"
          />
        </div>
        </>
        )}
      </div>
        </div>
      </div>

      <div className="modal__rodape" style={{ padding: '18px 0 0', border: 'none' }}>
        <button type="button" className="btn btn--secundario" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
