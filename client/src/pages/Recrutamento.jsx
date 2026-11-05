import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useEhTelemovel } from '../hooks.js';
import Comparar from './Comparar.jsx';
import { posCurto, dataCurta, idade, corVeredito, codigoJogador, consistenciaResumo, CONSIST_BANDA } from '../lib.js';

// Badge de veredito (cor por veredito), reutilizado nas tabelas do Recrutamento.
function BadgeVeredito({ v }) {
  if (!v) return <span className="jog-muted">–</span>;
  const cor = corVeredito(v);
  return (
    <span className="badge" style={{ color: cor, background: `color-mix(in srgb, ${cor} 14%, transparent)`, borderColor: `color-mix(in srgb, ${cor} 36%, transparent)`, whiteSpace: 'nowrap' }}>
      {v}
    </span>
  );
}
import BadgesRP from '../components/BadgesRP.jsx';
import CampoShadowTeam from '../components/CampoShadowTeam.jsx';
import Modal from '../components/Modal.jsx';

// Ordem das posições para as sub-abas do Ranking.
const POS_ORDEM = ['GR', 'DD', 'DC', 'DE', 'MDF', 'MC', 'MOF', 'EE', 'ED', 'PL'];
const ratingDe = (j) => j.ratingFinal ?? j.ratingRCA ?? null;

// Posições do 11-sombra (3-4-3 do clube) — as mesmas boxes do campo da Shadow
// Team. O jogador entra na posição que o scout escolher aqui, INDEPENDENTE da
// posição de perfil dele.
// [chave, rótulo, curto?]. A linha de 3 centrais é escolhida por lado
// (esquerdo/centro/direito) — chaves DCE/DCC/DCD, todas mostradas como "DC".
const SHADOW_SLOTS = [
  ['GR', 'Guarda-redes'],
  ['DCE', 'Central esquerdo', 'DC'],
  ['DCC', 'Central (centro)', 'DC'],
  ['DCD', 'Central direito', 'DC'],
  ['DD', 'Ala direito'],
  ['DE', 'Ala esquerdo'],
  ['MDF', 'Médio defensivo'],
  ['MC', 'Médio centro'],
  ['ED', 'Extremo direito'],
  ['EE', 'Extremo esquerdo'],
  ['PL', 'Ponta de lança'],
];

// Rótulo curto da posição do 11-sombra para a badge do Ranking (sem pista
// espacial, por isso explicita o lado do central).
const ROTULO_SHADOW = { DCE: 'DC esq', DCC: 'DC', DCD: 'DC dir' };
const rotuloShadow = (p) => ROTULO_SHADOW[p] || p;

// Normaliza o campo shadowPos (lista; aceita string única/null por compat.).
const posicoesShadow = (j) =>
  Array.isArray(j.shadowPos) ? j.shadowPos : j.shadowPos ? [j.shadowPos] : [];
const MAX_SHADOW = 3;

// Recrutamento com os separadores no topo: Shadow Team (campo) e Lista (tabela
// por posição). Slug do URL ↔ sub-aba: /recrutamento (shadow), /recrutamento/ranking.
export default function Recrutamento() {
  const navegar = useNavigate();
  const { podeEditar } = useAuth();
  const ehTelemovel = useEhTelemovel();
  const { aba: slug } = useParams();
  // "Comparar" é só para o scouting (editor); outros papéis caem no Shadow Team.
  const aba = slug === 'comparar' && podeEditar ? 'comparar' : slug === 'ranking' ? 'ranking' : 'shadow';
  const [jogadores, setJogadores] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [posAberta, setPosAberta] = useState(null); // { pos, lista } | null
  const [posRanking, setPosRanking] = useState('Todos'); // sub-aba de posição do Ranking
  const [consistMap, setConsistMap] = useState({}); // jogadorId -> resumo de consistência
  const [shadowPicker, setShadowPicker] = useState(null); // jogador a colocar no 11-sombra | null
  const [shadowSel, setShadowSel] = useState([]); // posições escolhidas no seletor (até 3)

  useEffect(() => {
    api.get('/players').then(setJogadores).finally(() => setCarregar(false));
  }, []);

  // Consistência por jogador (escala do Ranking): agrupa as observações por jogador.
  useEffect(() => {
    api
      .get('/observations')
      .then((obs) => {
        const porJog = {};
        for (const o of obs || []) {
          const jid = o.jogador?._id || o.jogador;
          if (!jid) continue;
          (porJog[jid] = porJog[jid] || []).push(o);
        }
        const m = {};
        for (const jid of Object.keys(porJog)) m[jid] = consistenciaResumo(porJog[jid]);
        setConsistMap(m);
      })
      .catch(() => {});
  }, []);

  const escalaConsist = (jid) => {
    const r = consistMap[jid];
    if (!r || r.indice == null) {
      return (
        <span
          className="consist-escala consist-escala--vazia"
          title="Precisa de ≥ 2 observações com o mesmo atributo avaliado para medir a consistência"
        >
          —
        </span>
      );
    }
    const b = CONSIST_BANDA[r.banda];
    return (
      <span
        className="consist-escala"
        title={'Consistência: a nota varia em média ±' + r.variacaoMedia + ' em ' + r.nAvaliados + ' atributos · ' + r.n + ' obs'}
      >
        <span className="consist-barra consist-barra--mini">
          <span className="consist-barra__fill" style={{ width: Math.round(r.indice * 100) + '%', background: b.cor }} />
        </span>
        <span className="consist-escala__txt" style={{ color: b.cor }}>
          {b.label}
        </span>
      </span>
    );
  };

  const shadow = useMemo(() => jogadores.filter((j) => posicoesShadow(j).length), [jogadores]);

  // Grava as posições do jogador no 11-sombra (lista; [] = sair). Não fecha o
  // seletor — quem chama decide (o seletor só fecha ao Guardar/remover).
  const definirShadow = async (jogador, posicoes) => {
    try {
      const atualizado = await api.patch('/players/' + jogador._id + '/shadow', { shadowPos: posicoes || [] });
      setJogadores((js) => js.map((j) => (j._id === jogador._id ? { ...j, shadowPos: atualizado.shadowPos } : j)));
      return true;
    } catch (e) {
      alert('Não foi possível atualizar a Shadow Team: ' + (e?.message || e));
      return false;
    }
  };

  // Abre o seletor para um jogador, pré-marcando as posições que já tem.
  const abrirShadowPicker = (jogador) => {
    setShadowSel(posicoesShadow(jogador));
    setShadowPicker(jogador);
  };
  const toggleSlot = (k) =>
    setShadowSel((sel) =>
      sel.includes(k) ? sel.filter((x) => x !== k) : sel.length >= MAX_SHADOW ? sel : [...sel, k]
    );
  const guardarShadow = async () => {
    const ok = await definirShadow(shadowPicker, shadowSel);
    if (ok) setShadowPicker(null);
  };
  const comRating = useMemo(
    () => jogadores.filter((j) => ratingDe(j) != null).sort((a, b) => ratingDe(b) - ratingDe(a)),
    [jogadores]
  );
  const posComJogadores = POS_ORDEM.filter((p) => comRating.some((j) => j.posicaoPrincipal === p));
  const rankLista = posRanking === 'Todos' ? comRating : comRating.filter((j) => j.posicaoPrincipal === posRanking);

  const TABS = [
    { key: 'shadow', label: 'Shadow Team', n: shadow.length, url: '/recrutamento' },
    { key: 'ranking', label: 'Lista', n: comRating.length, url: '/recrutamento/ranking' },
    ...(podeEditar ? [{ key: 'comparar', label: 'Comparar', n: null, url: '/recrutamento/comparar' }] : []),
  ];

  // Tabela do ranking (reutilizada: lista plana no ecrã e uma por posição no PDF).
  const tabelaRank = (lista, vazioMsg = 'Sem jogadores com rating.') => (
    <div className="tabela-wrap">
      <table>
        <thead>
          <tr>
            <th className="no-print">#</th>
            <th>Rating</th>
            <th>Nome</th>
            <th>Pos.</th>
            <th>Clube</th>
            <th className="no-print">Liga</th>
            <th>Idade</th>
            <th>R/P</th>
            <th>Veredito</th>
            <th className="no-print">Consist.</th>
            <th className="no-print">Shadow</th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 ? (
            <tr>
              <td colSpan={11} className="tabela-vazia">
                {vazioMsg}
              </td>
            </tr>
          ) : (
            lista.map((j, i) => (
              <tr key={j._id} className="clicavel" onClick={() => navegar('/jogadores/' + j._id)}>
                <td className="no-print">{i + 1}</td>
                <td>
                  <strong style={{ fontSize: 15 }}>{ratingDe(j)}</strong>
                </td>
                <td>
                  <strong>{j.nomeCompleto}</strong>
                </td>
                <td>
                  <span className="badge badge--pos">{posCurto(j.posicaoPrincipal)}</span>
                </td>
                <td>{j.clubeAtual || '—'}</td>
                <td className="no-print">{j.liga || '—'}</td>
                <td>{idade(j.dataNascimento)}</td>
                <td>
                  <BadgesRP rendimento={j.rendimento} potencial={j.potencialClass} />
                </td>
                <td>
                  <BadgeVeredito v={j.veredito} />
                </td>
                <td className="no-print">{escalaConsist(j._id)}</td>
                <td className="no-print" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const poss = posicoesShadow(j);
                    if (!podeEditar) {
                      return poss.length ? (
                        <span className="btn-shadow btn-shadow--ativo" style={{ cursor: 'default' }}>
                          ◆ {poss.map(rotuloShadow).join(' · ')}
                        </span>
                      ) : (
                        <span className="jog-muted">—</span>
                      );
                    }
                    return (
                      <button
                        type="button"
                        className={'btn-shadow' + (poss.length ? ' btn-shadow--ativo' : '')}
                        onClick={() => abrirShadowPicker(j)}
                        title={
                          poss.length
                            ? 'No 11-sombra: ' + poss.map(rotuloShadow).join(', ') + ' — clica para editar'
                            : 'Adicionar ao 11-sombra'
                        }
                      >
                        {poss.length ? '◆ ' + poss.map(rotuloShadow).join(' · ') : '＋ Shadow'}
                      </button>
                    );
                  })()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="recrut-pagina">
      <div className="pagina-cabecalho">
        <div>
          <h2>Recrutamento</h2>
        </div>
        {(podeEditar || aba === 'shadow' || aba === 'ranking') && (
          <div className="linha-acoes">
            {podeEditar && (
              <button
                className="btn btn--secundario"
                onClick={() => window.open('/api/relatorios/mercado', '_blank')}
                title="Alvos por posição, com avaliação, contrato e dados financeiros (imprimível)"
              >
                Relatório de mercado
              </button>
            )}
            {(aba === 'shadow' || aba === 'ranking') && (
              <button className="btn" onClick={() => window.print()}>
                Exportar PDF
              </button>
            )}
          </div>
        )}
      </div>

      <div className="abas-barra no-print">
        {TABS.map((t) => (
          <button key={t.key} className={aba === t.key ? 'ativo' : ''} onClick={() => navegar(t.url)}>
            {t.label}
            {t.n != null && <span className="sub-abas__n">{t.n}</span>}
          </button>
        ))}
      </div>

      <div className="recrut-conteudo">
        {aba === 'comparar' ? (
          <Comparar />
        ) : carregar ? (
          <div className="carregar">A carregar…</div>
        ) : aba === 'shadow' ? (
            <CampoShadowTeam jogadores={shadow} vertical={ehTelemovel} aoAbrir={(pos, l) => setPosAberta({ pos, lista: l })} />
          ) : (
            <>
              {ehTelemovel ? (
                <select
                  className="recrut-pos-dropdown no-print"
                  value={posRanking}
                  onChange={(e) => setPosRanking(e.target.value)}
                >
                  <option value="Todos">Todas as posições ({comRating.length})</option>
                  {posComJogadores.map((p) => (
                    <option key={p} value={p}>
                      {p} ({comRating.filter((j) => j.posicaoPrincipal === p).length})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="sub-abas no-print" style={{ marginBottom: 12 }}>
                  <button className={posRanking === 'Todos' ? 'ativo' : ''} onClick={() => setPosRanking('Todos')}>
                    Todas <span className="sub-abas__n">{comRating.length}</span>
                  </button>
                  {posComJogadores.map((p) => (
                    <button key={p} className={posRanking === p ? 'ativo' : ''} onClick={() => setPosRanking(p)}>
                      {p} <span className="sub-abas__n">{comRating.filter((j) => j.posicaoPrincipal === p).length}</span>
                    </button>
                  ))}
                </div>
              )}
              {posRanking === 'Todos' ? (
                <>
                  {/* Ecrã: ranking geral (posições misturadas, por rating). Escondido no PDF. */}
                  <div className="no-print">{tabelaRank(comRating)}</div>
                  {/* PDF: agrupado por posição, cada grupo ordenado por rating (desc). */}
                  <div className="rank-print">
                    {posComJogadores.map((p) => (
                      <div key={p} className="rank-print__grupo">
                        <h3 className="rank-print__titulo">
                          {p} <span>({comRating.filter((j) => j.posicaoPrincipal === p).length})</span>
                        </h3>
                        {tabelaRank(comRating.filter((j) => j.posicaoPrincipal === p))}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                tabelaRank(rankLista, 'Sem jogadores com rating nesta posição.')
              )}
            </>
          )}
      </div>

      {posAberta && (
        <Modal
          largo
          titulo={`Shadow Team · ${posAberta.pos.label} (${posAberta.lista.length})`}
          aoFechar={() => setPosAberta(null)}
        >
          {ehTelemovel ? (
            <div className="jog-movel">
              {posAberta.lista.map((j) => (
                <button
                  key={j._id}
                  className="jog-movel__lin"
                  onClick={() => navegar('/jogadores/' + j._id)}
                >
                  <span className="jog-movel__nome">{j.nomeCompleto}</span>
                  <span className="jog-movel__cod">{codigoJogador(j)}</span>
                </button>
              ))}
            </div>
          ) : (
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Clube</th>
                  <th>Idade</th>
                  <th>Rating</th>
                  <th>R/P</th>
                  <th>Fim contrato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {posAberta.lista.map((j) => (
                  <tr key={j._id} className="clicavel" onClick={() => navegar('/jogadores/' + j._id)}>
                    <td>
                      <strong>{j.nomeCompleto}</strong>
                    </td>
                    <td>{j.clubeAtual || '—'}</td>
                    <td>{idade(j.dataNascimento)}</td>
                    <td>
                      <strong>{j.ratingFinal ?? j.ratingRCA ?? '—'}</strong>
                    </td>
                    <td>
                      <BadgesRP rendimento={j.rendimento} potencial={j.potencialClass} />
                    </td>
                    <td>{dataCurta(j.fimContrato)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {podeEditar && (
                        <button
                          type="button"
                          className="btn-shadow"
                          title={'Tirar desta posição (' + posAberta.pos.label + ')'}
                          onClick={async () => {
                            const novo = posicoesShadow(j).filter((p) => p !== posAberta.pos.key);
                            const ok = await definirShadow(j, novo);
                            if (ok) setPosAberta((pa) => (pa ? { ...pa, lista: pa.lista.filter((x) => x._id !== j._id) } : pa));
                          }}
                        >
                          ✕ tirar daqui
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Modal>
      )}

      {shadowPicker && (
        <Modal titulo={`11-sombra · ${shadowPicker.nomeCompleto}`} aoFechar={() => setShadowPicker(null)}>
          <p style={{ marginTop: 0, color: 'var(--texto-suave)' }}>
            Em que posições entra no 11-sombra (3-4-3)? Até <strong>{MAX_SHADOW}</strong>, independente da
            posição de perfil (<strong>{posCurto(shadowPicker.posicaoPrincipal)}</strong>).{' '}
            <strong>{shadowSel.length}/{MAX_SHADOW}</strong> escolhidas.
          </p>
          <div className="shadow-picker">
            {SHADOW_SLOTS.map(([k, lab, curto]) => {
              const ativo = shadowSel.includes(k);
              const bloqueado = !ativo && shadowSel.length >= MAX_SHADOW;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={bloqueado}
                  className={
                    'shadow-picker__slot' +
                    (ativo ? ' shadow-picker__slot--ativo' : '') +
                    (bloqueado ? ' shadow-picker__slot--bloq' : '')
                  }
                  onClick={() => toggleSlot(k)}
                >
                  <strong>{curto || k}</strong>
                  <span>{lab}</span>
                </button>
              );
            })}
          </div>
          <div className="linha-acoes" style={{ marginTop: 16, justifyContent: 'space-between' }}>
            {posicoesShadow(shadowPicker).length ? (
              <button
                type="button"
                className="btn btn--perigo"
                onClick={async () => {
                  const ok = await definirShadow(shadowPicker, []);
                  if (ok) setShadowPicker(null);
                }}
              >
                Remover do 11-sombra
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="btn" onClick={guardarShadow}>
              Guardar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
