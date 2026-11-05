import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Modal from '../components/Modal.jsx';
import FormularioJogador from '../components/FormularioJogador.jsx';
import CampoPlaneamento from '../components/CampoPlaneamento.jsx';
import Jogadores from './Jogadores.jsx';
import { useToast } from '../components/Toasts.jsx';
import { posCurto, idade, classeBadgePlantel, tierDe, PLANO_ESTATUTOS, PLANO_TIERS } from '../lib.js';

const TIER_OMISSAO = 'B'; // todos começam no Core
const ORDEM_AUTO = 1000; // planoOrdem "automática" (ordena por tier); manual = 0..n
// Slots do campo (1-3-4-3) para escolher a posição de um alvo no editor.
const SLOTS_CAMPO = [
  ['EE', 'EE'],
  ['PL', 'PL'],
  ['ED', 'ED'],
  ['DE', 'DE'],
  ['MDF', 'MDF'],
  ['MC', 'MC'],
  ['DD', 'DD'],
  ['DCE', 'DC esq'],
  ['DCC', 'DC centro'],
  ['DCD', 'DC dir'],
  ['GR', 'GR'],
];
const POS_ORDEM = ['GR', 'DD', 'DC', 'DE', 'MDF', 'MC', 'MOF', 'EE', 'ED', 'PL'];
// Rótulo curto do slot do campo (os 3 centrais aparecem como DC).
const rotuloSlot = (p) => (p ? p.replace(/^DC[ECD]$/, 'DC') : '—');

export default function Planeamento() {
  const navegar = useNavigate();
  const { aba } = useParams();
  const toast = useToast();
  const { podeEditar } = useAuth();
  // Época do planeamento: 'momento' (atual) vs 'proxima' (planear a próxima época).
  const epoca = aba === 'proxima' ? 'proxima' : 'momento';
  const [jogadores, setJogadores] = useState([]);
  const [alvos, setAlvos] = useState([]); // alvos de recrutamento no campo
  const [carregar, setCarregar] = useState(true);
  const [modal, setModal] = useState(false);
  const [equipaAberta, setEquipaAberta] = useState(false); // popup com o plantel
  const [picker, setPicker] = useState(null);
  const [alvoPicker, setAlvoPicker] = useState(null); // alvo em edição (nota + prioridade)
  const [notaAlvo, setNotaAlvo] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [sobre, setSobre] = useState(null); // tier sob o cursor

  const carregarLista = useCallback(async () => {
    setCarregar(true);
    try {
      const [jogs, als] = await Promise.all([
        api.get('/players?plantel=true'),
        api.get('/plano-alvos?epoca=' + epoca),
      ]);
      setJogadores(jogs);
      setAlvos(als);
    } finally {
      setCarregar(false);
    }
  }, [epoca]);

  // Alvos de recrutamento (espaços vazios no campo).
  const addAlvo = async (planoPos) => {
    try {
      // Nasce em modo "auto" (ORDEM_AUTO) tal como os jogadores, para a ordem
      // na posição sair pelo tier até o utilizador reordenar manualmente.
      const novo = await api.post('/plano-alvos', { planoPos, epoca });
      const at = novo.planoOrdem === ORDEM_AUTO ? novo : await api.patch('/plano-alvos/' + novo._id, { planoOrdem: ORDEM_AUTO });
      setAlvos((a) => [...a, at]);
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };
  const abrirAlvo = (alvo) => {
    setAlvoPicker(alvo);
    setNotaAlvo(alvo.nota || '');
  };
  const definirEstatutoAlvo = async (planoEstatuto) => {
    try {
      const at = await api.patch('/plano-alvos/' + alvoPicker._id, { planoEstatuto });
      setAlvos((a) => a.map((x) => (x._id === at._id ? at : x)));
      setAlvoPicker(at);
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };
  const definirTierAlvo = async (planoTier) => {
    try {
      const at = await api.patch('/plano-alvos/' + alvoPicker._id, { planoTier });
      setAlvos((a) => a.map((x) => (x._id === at._id ? at : x)));
      setAlvoPicker(at);
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };
  const definirPosAlvo = async (planoPos) => {
    try {
      const at = await api.patch('/plano-alvos/' + alvoPicker._id, { planoPos, planoOrdem: ORDEM_AUTO });
      setAlvos((a) => a.map((x) => (x._id === at._id ? at : x)));
      setAlvoPicker(at);
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };
  const guardarNotaAlvo = async () => {
    try {
      const at = await api.patch('/plano-alvos/' + alvoPicker._id, { nota: notaAlvo });
      setAlvos((a) => a.map((x) => (x._id === at._id ? at : x)));
      setAlvoPicker(null);
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };
  const removerAlvo = async (alvo) => {
    try {
      await api.del('/plano-alvos/' + alvo._id);
      setAlvos((a) => a.filter((x) => x._id !== alvo._id));
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
    }
  };
  const moverAlvo = async (id, planoPos) => {
    const al = alvos.find((x) => x._id === id);
    if (!al || al.planoPos === planoPos) return;
    // Muda de posição → volta a "auto" (ordena pelo tier na nova posição).
    setAlvos((a) => a.map((x) => (x._id === id ? { ...x, planoPos, planoOrdem: ORDEM_AUTO } : x)));
    try {
      await api.patch('/plano-alvos/' + id, { planoPos, planoOrdem: ORDEM_AUTO });
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
      carregarLista();
    }
  };
  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  const patchPlano = async (id, campos, otimista) => {
    setJogadores((js) =>
      js.map((j) => {
        if (j._id !== id) return j;
        return epoca === 'proxima'
          ? { ...j, planoProx: { ...(j.planoProx || {}), ...otimista } }
          : { ...j, ...otimista };
      })
    );
    try {
      await api.patch('/players/' + id + '/plano', { ...campos, epoca });
    } catch (e) {
      toast('Erro: ' + e.message, 'erro');
      carregarLista();
    }
  };

  const definirPlano = (jogador, planoEstatuto) => {
    setPicker(null);
    patchPlano(jogador._id, { planoEstatuto }, { planoEstatuto });
  };
  const definirTier = (id, planoTier) => {
    const j = jogadoresVista.find((x) => x._id === id);
    if (j && (j.planoTier || TIER_OMISSAO) === planoTier) return;
    patchPlano(id, { planoTier }, { planoTier });
  };
  const colocar = (id, planoPos) => {
    const j = jogadoresVista.find((x) => x._id === id);
    if (j && j.planoPos === planoPos) return;
    // Entra em modo "auto" (ordena pelo tier por defeito); o utilizador reordena depois.
    patchPlano(id, { planoPos, planoOrdem: ORDEM_AUTO }, { planoPos, planoOrdem: ORDEM_AUTO });
  };
  const removerCampo = (jogador) => patchPlano(jogador._id, { planoPos: null }, { planoPos: null });

  // Nova ordem de um slot: grava planoOrdem = índice para cada item. A lista
  // mistura jogadores e alvos ('alvo:'+id) — cada um vai ao seu endpoint.
  const reordenar = (slotKey, ids) => {
    const ordemDe = (key) => ids.indexOf(key);
    setJogadores((js) =>
      js.map((j) => {
        if (!ids.includes(j._id)) return j;
        return epoca === 'proxima'
          ? { ...j, planoProx: { ...(j.planoProx || {}), planoOrdem: ordemDe(j._id) } }
          : { ...j, planoOrdem: ordemDe(j._id) };
      })
    );
    setAlvos((as) => as.map((a) => (ids.includes('alvo:' + a._id) ? { ...a, planoOrdem: ordemDe('alvo:' + a._id) } : a)));
    ids.forEach((id, k) => {
      if (id.startsWith('alvo:')) {
        api.patch('/plano-alvos/' + id.slice(5), { planoOrdem: k }).catch(() => carregarLista());
      } else {
        api.patch('/players/' + id + '/plano', { planoOrdem: k, epoca }).catch(() => carregarLista());
      }
    });
  };

  const largarTier = (e, tierKey) => {
    e.preventDefault();
    setSobre(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id || id.startsWith('alvo:')) return; // alvos não têm tier
    definirTier(id, tierKey);
  };

  // Na "próxima época" há um BANCO (pool) à esquerda com os jogadores ainda não
  // arrumados (sem tier E fora do campo). Nessa época, sem tier não cai em Core.
  const tierDoJog = (j) => (epoca === 'proxima' ? j.planoTier : j.planoTier || TIER_OMISSAO);
  const largarPool = (e) => {
    e.preventDefault();
    setSobre(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id || id.startsWith('alvo:')) return;
    patchPlano(id, { planoTier: null, planoPos: null }, { planoTier: null, planoPos: null }); // volta ao banco
  };

  // Chip arrastável de um jogador (usado nos tiers e no banco).
  const chipJog = (j) => (
    <span
      key={j._id}
      className="plan-tier__chip"
      draggable={podeEditar}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', j._id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={podeEditar ? undefined : () => navegar('/jogador/' + j._id)}
      style={podeEditar ? undefined : { cursor: 'pointer' }}
      title={j.nomeCompleto + (j.planoPos ? ' · no onze' : '')}
    >
      <span className="badge badge--pos">{posCurto(j.posicaoPrincipal)}</span>
      <span className="plan-tier__nome-jog">{j.nomeCompleto}</span>
      {j.planoPos && <span className="plan-tier__oncampo" title="No onze">⬢</span>}
    </span>
  );

  const guardar = async (dados) => {
    setAGuardar(true);
    try {
      const corpo = { ...dados, doPlantel: true };
      if (modal && modal._id) await api.put('/players/' + modal._id, corpo);
      else await api.post('/players', { ...corpo, planoTier: TIER_OMISSAO });
      setModal(false);
      carregarLista();
      toast(modal && modal._id ? 'Jogador atualizado.' : 'Jogador adicionado ao plantel.', 'ok');
    } catch (e) {
      toast('Erro ao guardar: ' + e.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  // Eliminar um jogador da equipa (permanente). Limpa observações/refs no servidor.
  const eliminar = async (jogador) => {
    if (!window.confirm(`Eliminar ${jogador.nomeCompleto} da equipa? Esta ação é permanente.`)) return;
    try {
      await api.del('/players/' + jogador._id + '?hard=true');
      setJogadores((js) => js.filter((j) => j._id !== jogador._id));
      toast(`${jogador.nomeCompleto} eliminado da equipa.`, 'ok');
    } catch (e) {
      toast('Erro ao eliminar: ' + e.message, 'erro');
    }
  };

  // Vista dos jogadores para a época ativa: na "próxima época" os campos de plano
  // vêm de planoProx, mapeados para os nomes normais (o campo/tiers não sabem da época).
  const jogadoresVista = useMemo(() => {
    if (epoca !== 'proxima') return jogadores;
    return jogadores.map((j) => ({
      ...j,
      planoPos: j.planoProx?.planoPos ?? null,
      planoTier: j.planoProx?.planoTier ?? null,
      planoEstatuto: j.planoProx?.planoEstatuto ?? null,
      planoOrdem: j.planoProx?.planoOrdem ?? ORDEM_AUTO,
    }));
  }, [jogadores, epoca]);

  const ordemPos = useMemo(() => Object.fromEntries(POS_ORDEM.map((p, i) => [p, i])), []);
  const jogadoresOrdenados = useMemo(
    () =>
      [...jogadoresVista].sort(
        (a, b) =>
          (ordemPos[a.posicaoPrincipal] ?? 99) - (ordemPos[b.posicaoPrincipal] ?? 99) ||
          a.nomeCompleto.localeCompare(b.nomeCompleto)
      ),
    [jogadoresVista, ordemPos]
  );

  // Jogadores no banco (próxima época), ordenados por posição.
  const bancoJogadores = useMemo(
    () =>
      jogadoresVista
        .filter((j) => !j.planoTier && !j.planoPos)
        .sort(
          (a, b) =>
            (ordemPos[a.posicaoPrincipal] ?? 99) - (ordemPos[b.posicaoPrincipal] ?? 99) ||
            a.nomeCompleto.localeCompare(b.nomeCompleto)
        ),
    [jogadoresVista, ordemPos]
  );

  return (
    <div className="plan-pagina">
      <div className="pagina-cabecalho">
        <div>
          <h2>Planeamento</h2>
        </div>
        {aba !== 'plantel' && (
          <button className="btn" onClick={() => setEquipaAberta(true)}>
            Equipa
          </button>
        )}
      </div>

      <div className="abas-barra no-print">
        <button className={aba === 'plantel' ? 'ativo' : ''} onClick={() => navegar('/planeamento/plantel')}>
          Plantel
        </button>
        <button className={!aba ? 'ativo' : ''} onClick={() => navegar('/planeamento')}>
          Esta época
        </button>
        <button className={aba === 'proxima' ? 'ativo' : ''} onClick={() => navegar('/planeamento/proxima')}>
          Próxima época
        </button>
      </div>

      {aba === 'plantel' ? (
        <Jogadores plantel rotaBase="/planeamento/plantel" />
      ) : (
      <>
      <div className={'plan-layout' + (epoca === 'proxima' ? ' plan-layout--proxima' : '')}>
        {epoca === 'proxima' && (
          <aside
            className={'plan-pool' + (sobre === 'pool' ? ' plan-pool--sobre' : '')}
            onDragOver={(e) => {
              e.preventDefault();
              if (sobre !== 'pool') setSobre('pool');
            }}
            onDragLeave={() => setSobre((s) => (s === 'pool' ? null : s))}
            onDrop={largarPool}
          >
            <div className="plan-pool__hd">
              Banco <span>{bancoJogadores.length}</span>
            </div>
            <div className="plan-pool__lista">
              {bancoJogadores.length === 0 ? (
                <span className="plan-tier__vazio">arrasta jogadores para aqui</span>
              ) : (
                bancoJogadores.map((j) => chipJog(j))
              )}
            </div>
          </aside>
        )}
        <div className="plan-campo-wrap">
          {carregar ? (
            <div className="carregar">A carregar…</div>
          ) : (
            <CampoPlaneamento
              jogadores={jogadoresVista}
              alvos={alvos}
              podeEditar={podeEditar}
              aoClicar={(j) => (podeEditar ? setPicker(j) : navegar('/jogador/' + j._id))}
              aoColocar={colocar}
              aoRemover={removerCampo}
              aoReordenar={reordenar}
              aoAddAlvo={addAlvo}
              aoEditarAlvo={podeEditar ? abrirAlvo : undefined}
              aoRemoverAlvo={removerAlvo}
              aoMoverAlvo={moverAlvo}
            />
          )}
        </div>

        {/* Tiers — todos os jogadores por tier; arrasta para o campo ou entre tiers */}
        <aside className="plan-tiers">
          {PLANO_TIERS.map((t) => {
            const lista = jogadoresVista.filter((j) => tierDoJog(j) === t.key);
            return (
              <div
                key={t.key}
                className={'plan-tier' + (sobre === t.key ? ' plan-tier--sobre' : '')}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (sobre !== t.key) setSobre(t.key);
                }}
                onDragLeave={() => setSobre((s) => (s === t.key ? null : s))}
                onDrop={(e) => largarTier(e, t.key)}
              >
                <div className="plan-tier__hd">
                  <span className="plan-tier__key" style={{ background: t.cor }}>
                    {t.key}
                  </span>
                  <span className="plan-tier__nome">{t.nome}</span>
                </div>
                <div className="plan-tier__lista">
                  {lista.length === 0 ? (
                    <span className="plan-tier__vazio">larga jogadores aqui</span>
                  ) : (
                    lista.map((j) => chipJog(j))
                  )}
                </div>
              </div>
            );
          })}
        </aside>
      </div>

      <div className="plan-legenda plan-legenda--rodape">
        {PLANO_ESTATUTOS.map((e) => (
          <span key={e.key} className="plan-legenda__it">
            <i style={{ background: e.cor }} />
            {e.label}
          </span>
        ))}
        <span className="plan-legenda__it">
          <i className="plan-legenda__branco" />
          Sem alteração
        </span>
      </div>
      </>
      )}

      {/* Editor de alvo — perfil pretendido + prioridade/cor */}
      {alvoPicker && (
        <Modal titulo="Alvo de recrutamento" aoFechar={() => setAlvoPicker(null)}>
          <p style={{ marginTop: 0, color: 'var(--texto-suave)', marginBottom: 6 }}>Posição no campo:</p>
          <div className="plan-picker">
            {SLOTS_CAMPO.map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={'plan-picker__op' + (alvoPicker.planoPos === k ? ' plan-picker__op--ativo' : '')}
                onClick={() => definirPosAlvo(k)}
              >
                {lab}
              </button>
            ))}
          </div>
          <div className="campo" style={{ marginTop: 12 }}>
            <label>Perfil pretendido</label>
            <input
              value={notaAlvo}
              onChange={(e) => setNotaAlvo(e.target.value)}
              placeholder="ex.: DC esquerdino, <23, bom no jogo aéreo"
              autoFocus
            />
          </div>
          <p style={{ color: 'var(--texto-suave)', margin: '12px 0 6px' }}>Tier (texto na box):</p>
          <div className="plan-picker">
            {PLANO_TIERS.map((t) => (
              <button
                key={t.key}
                type="button"
                className="plan-picker__op"
                style={{
                  borderColor: t.cor,
                  background: alvoPicker.planoTier === t.key ? t.cor : 'transparent',
                  color: alvoPicker.planoTier === t.key ? '#fff' : t.cor,
                }}
                onClick={() => definirTierAlvo(t.key)}
              >
                {t.key} · {t.nome}
              </button>
            ))}
            <button
              type="button"
              className={'plan-picker__op' + (!alvoPicker.planoTier ? ' plan-picker__op--ativo' : '')}
              onClick={() => definirTierAlvo(null)}
            >
              Sem tier
            </button>
          </div>
          <p style={{ color: 'var(--texto-suave)', margin: '12px 0 6px' }}>Prioridade / ação (cor da box):</p>
          <div className="plan-picker">
            {PLANO_ESTATUTOS.map((e) => (
              <button
                key={e.key}
                type="button"
                className="plan-picker__op"
                style={{
                  borderColor: e.cor,
                  background: alvoPicker.planoEstatuto === e.key ? e.cor : 'transparent',
                  color: alvoPicker.planoEstatuto === e.key ? '#fff' : e.cor,
                }}
                onClick={() => definirEstatutoAlvo(e.key)}
              >
                {e.label}
              </button>
            ))}
            <button
              type="button"
              className={'plan-picker__op' + (!alvoPicker.planoEstatuto ? ' plan-picker__op--ativo' : '')}
              onClick={() => definirEstatutoAlvo(null)}
            >
              Sem alteração
            </button>
          </div>
          <div className="linha-acoes" style={{ marginTop: 16, justifyContent: 'space-between' }}>
            <button
              className="btn btn--perigo btn--pequeno"
              onClick={() => {
                removerAlvo(alvoPicker);
                setAlvoPicker(null);
              }}
            >
              Remover alvo
            </button>
            <button className="btn" onClick={guardarNotaAlvo}>
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {/* Ação pós-janela (cor no campo) */}
      {picker && (
        <Modal titulo={`${picker.nomeCompleto} · ${posCurto(picker.posicaoPrincipal)}`} aoFechar={() => setPicker(null)}>
          <p style={{ marginTop: 0, color: 'var(--texto-suave)' }}>Ação pós-janela (cor no campo):</p>
          <div className="plan-picker">
            {PLANO_ESTATUTOS.map((e) => (
              <button
                key={e.key}
                type="button"
                className="plan-picker__op"
                style={{
                  borderColor: e.cor,
                  background: picker.planoEstatuto === e.key ? e.cor : 'transparent',
                  color: picker.planoEstatuto === e.key ? '#fff' : e.cor,
                }}
                onClick={() => definirPlano(picker, e.key)}
              >
                {e.label}
              </button>
            ))}
            <button
              type="button"
              className={'plan-picker__op' + (!picker.planoEstatuto ? ' plan-picker__op--ativo' : '')}
              onClick={() => definirPlano(picker, null)}
            >
              Sem alteração
            </button>
          </div>
          <div className="linha-acoes" style={{ marginTop: 16, justifyContent: 'space-between' }}>
            <button
              className="btn btn--secundario btn--pequeno"
              onClick={() => {
                const j = picker;
                setPicker(null);
                setModal(j);
              }}
            >
              ✎ Editar jogador
            </button>
            <button className="btn btn--secundario btn--pequeno" onClick={() => navegar('/jogadores/' + picker._id)}>
              Ver ficha →
            </button>
          </div>
        </Modal>
      )}

      {/* Popup da Equipa — plantel do clube (clica num jogador para ver/editar o perfil) */}
      {equipaAberta && (
        <Modal largo titulo="Equipa — plantel do clube" aoFechar={() => setEquipaAberta(false)}>
          <div className="linha-acoes" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
              {jogadores.length} jogadores · clica para ver o perfil
            </span>
            {podeEditar && (
              <button
                className="btn btn--pequeno"
                onClick={() => {
                  setEquipaAberta(false);
                  setModal(true);
                }}
              >
                + Adicionar jogador
              </button>
            )}
          </div>
          {jogadores.length === 0 ? (
            <p className="rel-vazio">Plantel vazio. Adiciona os jogadores do clube.</p>
          ) : (
            <div className="tabela-wrap" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Nome</th>
                    <th>Idade</th>
                    <th>Fim contrato</th>
                    <th>Tier</th>
                    <th>No onze</th>
                    <th>Rating</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jogadoresOrdenados.map((j) => (
                    <tr
                      key={j._id}
                      className="clicavel"
                      onClick={() => {
                        setEquipaAberta(false);
                        if (podeEditar) setModal(j);
                        else navegar('/jogador/' + j._id);
                      }}
                    >
                      <td>
                        <span className="badge badge--pos">{posCurto(j.posicaoPrincipal)}</span>
                      </td>
                      <td>
                        <strong>{j.nomeCompleto}</strong>
                      </td>
                      <td>{idade(j.dataNascimento)}</td>
                      <td>{j.fimContrato ? new Date(j.fimContrato).getFullYear() : '—'}</td>
                      <td>{j.planoTier ? tierDe(j.planoTier)?.nome : '—'}</td>
                      <td>{rotuloSlot(j.planoPos)}</td>
                      <td>
                        <strong>{j.ratingFinal ?? j.ratingRCA ?? '—'}</strong>
                      </td>
                      <td>
                        {j.estadoPlantel ? (
                          <span className={'badge ' + classeBadgePlantel(j.estadoPlantel)}>{j.estadoPlantel}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {podeEditar && (
                          <button
                            type="button"
                            className="btn btn--perigo btn--pequeno"
                            title="Eliminar da equipa"
                            onClick={() => eliminar(j)}
                          >
                            Eliminar
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

      {modal && (
        <Modal
          largo
          titulo={modal._id ? 'Editar jogador do plantel' : 'Adicionar jogador ao plantel'}
          aoFechar={() => setModal(false)}
        >
          <FormularioJogador
            inicial={modal._id ? modal : null}
            plantel
            aoGuardar={guardar}
            aoCancelar={() => setModal(false)}
            aGuardar={aGuardar}
          />
        </Modal>
      )}
    </div>
  );
}
