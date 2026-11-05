import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Modal from '../components/Modal.jsx';
import FormularioObservacao from '../components/FormularioObservacao.jsx';
import CampoCompeticao from '../components/CampoCompeticao.jsx';
import VistaSemana, { chaveDia } from '../components/VistaSemana.jsx';
import PlanoSemana from '../components/PlanoSemana.jsx';
import PickerObservar from '../components/PickerObservar.jsx';
import AbaCompeticoes from '../components/AbaCompeticoes.jsx';
import { useToast } from '../components/Toasts.jsx';
import { dataCurta, posCurto, CLUBE_PROPRIO as CLUBE } from '../lib.js';

const vazio = { jogador: '', dataJogo: '', hora: '', competicao: '', adversario: '', local: '', notas: '' };

// Abreviatura da competição (+ série) para o canto do card do jogo.
function abrevLiga(competicao, serie) {
  let c;
  if (/sub-?19/i.test(competicao)) c = 'Sub-19';
  else if (/campeonato de portugal/i.test(competicao)) c = 'CP';
  else if (/liga\s*3/i.test(competicao)) c = 'L3';
  else
    c = (competicao || '')
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
      .toUpperCase();
  const s = serie ? serie.replace(/série\s*/i, 'S') : '';
  return s ? `${c} ${s}` : c;
}

const normNome = (x) =>
  (x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const classePrioridade = (p) =>
  p === 'Alta'
    ? ' cal-jogo-mini--pri-alta'
    : p === 'Média'
      ? ' cal-jogo-mini--pri-media'
      : p === 'Baixa'
        ? ' cal-jogo-mini--pri-baixa'
        : '';

function classeEstado(e) {
  if (e === 'Planeado') return 'badge--observacao';
  if (e === 'Concluído') return 'badge--prioridade';
  return 'badge--arquivo';
}

// Coluna de jogadores de uma equipa (nome + nº + lista ligada à ficha). Partilhada
// pelos popups da Agenda e do Calendário.
function ColunaEquipa({ titulo, lista, aoClicar }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          color: 'var(--texto-suave)',
          paddingBottom: 6,
          borderBottom: '1px solid var(--borda)',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</span>
        <span style={{ color: 'var(--texto-3)', fontVariantNumeric: 'tabular-nums' }}>{lista.length}</span>
      </div>
      {lista.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {lista.map((p) => (
            <Link
              key={p._id}
              to={'/jogadores/' + p._id}
              onClick={aoClicar}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                padding: '5px 8px',
                border: '1px solid var(--borda)',
                borderRadius: 'var(--raio)',
                color: 'var(--verde)',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 13,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
              {p.posicao && (
                <span style={{ color: 'var(--texto-suave)', fontWeight: 600, flexShrink: 0 }}>{posCurto(p.posicao)}</span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>Nenhum</span>
      )}
    </div>
  );
}

export default function Agenda() {
  const { aba: abaParam } = useParams();
  const { podeEditar, ehDiretor, ehTecnico } = useAuth();
  const veAgendaCompleta = podeEditar || ehDiretor;
  // Abas: editor (scouting) vê tudo — Agenda · Semana · Calendário · Competições ·
  // Jogos vistos; diretor vê Semana · Competições · Jogos vistos; técnico só Competições.
  const aba = ehTecnico
    ? 'competicoes'
    : podeEditar
    ? (['agenda', 'semana', 'calendario', 'competicoes', 'vistos'].includes(abaParam) ? abaParam : 'agenda')
    : (['semana', 'competicoes', 'vistos'].includes(abaParam) ? abaParam : 'semana');
  const navegar = useNavigate();
  const [ags, setAgs] = useState([]);
  const [jogadores, setJogadores] = useState([]);
  const [soPendentes, setSoPendentes] = useState(true); // Agenda = só jogos a ver; vistos/cancelados escondidos (há "Ver todos")
  const [modal, setModal] = useState(false); // form de agendamento
  const [obsDe, setObsDe] = useState(null); // agendamento a registar observação (modal antigo / agendamentos manuais)
  const [pickerDe, setPickerDe] = useState(null); // agendamento ligado a jogo → seletor de jogador das 2 equipas
  const [f, setF] = useState(vazio);
  const [aGuardar, setAGuardar] = useState(false);
  const toast = useToast();

  // Popups de dia (guardam só a data; a lista é calculada ao vivo).
  const [diaAg, setDiaAg] = useState(null);
  const [jogadoresAg, setJogadoresAg] = useState(null); // agendamento cujo popup de jogadores (por equipa) está aberto
  const [jogoCal, setJogoCal] = useState(null); // jogo do calendário clicado (ações)
  const [horaCal, setHoraCal] = useState(''); // edição da hora do jogo no popup
  const [observarJogo, setObservarJogo] = useState(null); // jogo do calendário a observar
  const [editarVis, setEditarVis] = useState(null); // agendamento cujo horário de visionamento se edita
  const [visData, setVisData] = useState(''); // dia do visionamento (YYYY-MM-DD)
  const [visHora, setVisHora] = useState(''); // hora do visionamento (HH:MM)

  // Calendário
  const [meta, setMeta] = useState({ competicoes: [], series: [] });
  const [calF, setCalF] = useState({ competicao: '', serie: '', futuros: true });
  const [calJogos, setCalJogos] = useState([]);
  const [calAlvos, setCalAlvos] = useState({}); // idJogo -> jogadores alvo
  const [ligasPri, setLigasPri] = useState({}); // norm(nome da liga) -> prioridade

  const [obsPorJogo, setObsPorJogo] = useState({}); // idJogoCalendario -> {nObservaveis, jogadores}
  const [vistos, setVistos] = useState([]); // jogos vistos (ObservacaoJogo)
  const [compVistos, setCompVistos] = useState(''); // filtro de competição da aba "Jogos vistos"

  const carregarTudo = useCallback(async () => {
    // Carrega TODOS os agendamentos: a lista da Agenda filtra os futuros no
    // cliente, e o plano da semana precisa de todos (visionamento em diferido).
    const [lista, jogs, dos, vis] = await Promise.all([
      api.get('/agendamentos'),
      api.get('/players?incluirPlantel=true'),
      api.get('/calendario/dos-jogadores'),
      api.get('/observacoes-jogo'),
    ]);
    setAgs(lista);
    setJogadores(jogs);
    const m = {};
    dos.forEach((a) => {
      m[a._id] = a;
    });
    setObsPorJogo(m);
    setVistos(vis);
  }, []);

  // Ids dos jogos do calendário já marcados como vistos.
  const vistoIdDoJogo = (idJogo) => vistos.find((v) => String(v.calendarioJogo) === String(idJogo))?._id;

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  useEffect(() => {
    api.get('/calendario/meta').then(setMeta).catch(() => {});
    api
      .get('/leagues')
      .then((ls) => {
        const m = {};
        ls.forEach((l) => {
          m[normNome(l.nome)] = l.prioridade;
        });
        setLigasPri(m);
      })
      .catch(() => {});
  }, []);

  // Prioridade da liga a que um jogo pertence (por competição + série, ou só competição).
  const prioridadeJogo = (jg) => {
    const chaves = [jg.serie ? `${jg.competicao} - ${jg.serie}` : null, jg.competicao].filter(Boolean);
    for (const k of chaves) {
      const p = ligasPri[normNome(k)];
      if (p) return p;
    }
    return null;
  };

  useEffect(() => {
    const p = new URLSearchParams();
    if (calF.competicao) p.set('competicao', calF.competicao);
    if (calF.serie) p.set('serie', calF.serie);
    if (calF.futuros) p.set('futuros', 'true');
    Promise.all([api.get('/calendario?' + p.toString()), api.get('/calendario/dos-jogadores')]).then(
      ([jogos, alvos]) => {
        setCalJogos(jogos);
        const m = {};
        alvos.forEach((a) => {
          m[a._id] = a; // objeto completo: nObservaveis, casaJogadores, foraJogadores, jogadores
        });
        setCalAlvos(m);
      }
    );
  }, [calF]);

  const set = (campo) => (e) => setF((s) => ({ ...s, [campo]: e.target.value }));
  const setCal = (campo) => (e) =>
    setCalF((s) => ({ ...s, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    setAGuardar(true);
    try {
      await api.post('/agendamentos', { ...f, jogador: f.jogador || null, local: f.local || null });
      setModal(false);
      setF(vazio);
      carregarTudo();
      toast('Jogo agendado.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  const marcar = async (id, estado) => {
    await api.patch('/agendamentos/' + id + '/estado', { estado });
    carregarTudo();
  };
  const apagar = async (id) => {
    if (!confirm('Eliminar este agendamento?')) return;
    await api.del('/agendamentos/' + id);
    carregarTudo();
  };

  // Ao abrir o popup de um jogo, sincroniza o campo de hora editável.
  useEffect(() => {
    setHoraCal(jogoCal?.hora || '');
  }, [jogoCal]);

  const guardarHoraCal = async () => {
    try {
      await api.patch('/calendario/' + jogoCal._id, { hora: horaCal });
      setCalJogos((js) => js.map((j) => (j._id === jogoCal._id ? { ...j, hora: horaCal } : j)));
      setJogoCal((j) => (j ? { ...j, hora: horaCal } : j));
      toast('Hora guardada.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  };

  const adicionarJogoAgenda = async (jg) => {
    try {
      await api.post('/agendamentos', {
        jogador: null,
        calendarioJogo: jg._id,
        dataJogo: jg.data,
        hora: jg.hora || '',
        competicao: jg.competicao + (jg.serie ? ' · ' + jg.serie : ''),
        adversario: `${jg.casa} x ${jg.fora}`,
        local: null,
      });
      carregarTudo();
      toast('Jogo adicionado à agenda.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  };

  // Registar/remover "vi este jogo" (observação de jogo, sem jogador).
  const marcarVisto = async (jg) => {
    try {
      await api.post('/observacoes-jogo', {
        calendarioJogo: jg._id,
        data: jg.data,
        hora: jg.hora || '',
        competicao: jg.competicao,
        serie: jg.serie || '',
        casa: jg.casa,
        fora: jg.fora,
      });
      // Se este jogo está agendado, conclui o agendamento — assim reflete na
      // Agenda, na Semana e no PDF (deixa de estar "por ver" / pendente).
      const ag = ags.find((a) => a.calendarioJogo && String(a.calendarioJogo) === String(jg._id));
      if (ag && ag.estado !== 'Concluído') {
        await api.patch('/agendamentos/' + ag._id + '/estado', { estado: 'Concluído' });
      }
      carregarTudo();
      toast('Jogo registado como visto.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  };
  const removerVisto = async (id) => {
    // Reverte o agendamento ligado (se tinha sido concluído por ter sido marcado
    // como visto) para voltar a ficar pendente na Agenda e na Semana.
    const v = vistos.find((x) => x._id === id);
    await api.del('/observacoes-jogo/' + id);
    if (v && v.calendarioJogo) {
      const ag = ags.find((a) => a.calendarioJogo && String(a.calendarioJogo) === String(v.calendarioJogo));
      if (ag && ag.estado === 'Concluído') {
        await api.patch('/agendamentos/' + ag._id + '/estado', { estado: 'Planeado' });
      }
    }
    carregarTudo();
  };
  // "Vi este jogo" a partir de um agendamento da Agenda (sem jogador).
  const marcarVistoAg = async (a) => {
    const partes = (a.adversario || '').split(/\s+x\s+/i);
    try {
      await api.post('/observacoes-jogo', {
        calendarioJogo: a.calendarioJogo || null,
        data: a.dataJogo,
        hora: a.hora || '',
        competicao: a.competicao || '',
        casa: (partes[0] || '').trim(),
        fora: (partes[1] || '').trim(),
      });
      // Conclui o agendamento — reflete na Agenda, na Semana e no PDF.
      if (a.estado !== 'Concluído') {
        await api.patch('/agendamentos/' + a._id + '/estado', { estado: 'Concluído' });
      }
      carregarTudo();
      toast('Jogo registado como visto.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  };

  const guardarObs = async (dados) => {
    setAGuardar(true);
    try {
      const res = await api.post('/observations', dados);
      await api.patch('/agendamentos/' + obsDe._id + '/estado', { estado: 'Concluído' });
      setObsDe(null);
      carregarTudo();
      toast(
        res.perfilAtualizado ? 'Observação registada · perfil atualizado' : 'Observação registada.',
        'ok'
      );
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  // Observar direto de um jogo do calendário (sem passar pela agenda).
  const guardarObsCalendario = async (dados) => {
    setAGuardar(true);
    try {
      const res = await api.post('/observations', dados);
      setObservarJogo(null);
      carregarTudo();
      toast(
        res.perfilAtualizado ? 'Observação registada · perfil atualizado' : 'Observação registada.',
        'ok'
      );
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  // Alvo único de um jogo (se houver exatamente um) para pré-selecionar na observação.
  const alvoUnico = (jg) => {
    const lista = (jg && calAlvos[jg._id]?.jogadores) || [];
    return lista.length === 1 ? lista[0]._id : undefined;
  };

  // Lista ao vivo para o popup de dia da agenda.
  const agsDoDia = diaAg ? ags.filter((a) => chaveDia(a.dataJogo) === chaveDia(diaAg)) : [];

  // Jogadores em scouting de um agendamento: o jogador específico, ou os
  // observáveis das duas equipas do jogo do calendário de onde veio.
  const jogadoresDoAg = (a) => {
    if (a.jogador) return [{ _id: a.jogador._id, nome: a.jogador.nomeCompleto, posicao: a.jogador.posicaoPrincipal }];
    const o = a.calendarioJogo && obsPorJogo[a.calendarioJogo];
    return o?.jogadores || [];
  };

  // Lista da Agenda: segue a MESMA ordem do plano da Semana — pela hora de
  // visionamento (ascendente, como se lê o horário Seg→Dom). Os que ainda não têm
  // horário (por agendar) vão para o fim, ordenados pela data do jogo.
  // (Não se filtra por data: nada desaparece por o dia ter passado.
  // "Ver só pendentes" esconde os já vistos/cancelados.)
  const msVis = (a) => (a.visionamento ? new Date(a.visionamento).getTime() : Infinity);
  const horaVis = (d) => {
    const dt = new Date(d);
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  };
  const grupoDe = (a) => (a.visionamento ? chaveDia(a.visionamento) : 'sem-horario');
  // YYYY-MM-DD em hora LOCAL (não usar toISOString, que desloca para UTC).
  const ymdLocal = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  // Abre o editor do horário de visionamento (a hora a que o scout vai ver o
  // jogo). Pré-preenche com o visionamento atual, ou — se ainda não tem — com o
  // dia do jogo e a hora real do jogo como ponto de partida.
  const abrirEditarVis = (a) => {
    const base = a.visionamento || a.dataJogo || new Date();
    setVisData(ymdLocal(base));
    setVisHora(a.visionamento ? horaVis(a.visionamento) : a.hora || '');
    setEditarVis(a);
  };
  const guardarVis = async () => {
    if (!visData || !visHora) {
      toast('Indica o dia e a hora a que vais ver o jogo.', 'erro');
      return;
    }
    const [y, mo, d] = visData.split('-').map(Number);
    const [hh, mm] = visHora.split(':').map(Number);
    const dt = new Date(y, mo - 1, d, hh, mm, 0, 0); // hora local
    try {
      await api.put('/agendamentos/' + editarVis._id, { visionamento: dt });
      setEditarVis(null);
      carregarTudo();
      toast('Hora de visionamento atualizada.', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  };
  const limparVis = async () => {
    try {
      await api.put('/agendamentos/' + editarVis._id, { visionamento: null });
      setEditarVis(null);
      carregarTudo();
      toast('Horário de visionamento removido (volta a “por agendar”).', 'ok');
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  };
  const agsLista = (soPendentes ? ags.filter((a) => a.estado !== 'Concluído' && a.estado !== 'Cancelado') : ags)
    .slice()
    .sort((a, b) => msVis(a) - msVis(b) || new Date(a.dataJogo) - new Date(b.dataJogo));

  // Ids dos jogos do calendário que já têm agendamento (estão na Agenda → Semana),
  // para os destacar no Calendário com outra cor.
  const idsNaAgenda = new Set((ags || []).filter((a) => a.calendarioJogo).map((a) => String(a.calendarioJogo)));

  return (
    <div className="pagina-agenda">
      {aba === 'agenda' && (
        <div className="pagina-cabecalho" style={{ justifyContent: 'flex-end' }}>
          <div className="linha-acoes">
            <button className="btn btn--secundario" onClick={() => setSoPendentes((v) => !v)}>
              {soPendentes ? 'Ver todos' : 'Ver só pendentes'}
            </button>
            {podeEditar && (
              <button
                className="btn"
                onClick={() => {
                  setF(vazio);
                  setModal(true);
                }}
              >
                + Agendar jogo
              </button>
            )}
          </div>
        </div>
      )}

      <div className="abas-barra no-print">
        {podeEditar && (
          <button className={aba === 'agenda' ? 'ativo' : ''} onClick={() => navegar('/agenda')}>
            Agenda <span className="sub-abas__n">{agsLista.length}</span>
          </button>
        )}
        {veAgendaCompleta && (
          <button className={aba === 'semana' ? 'ativo' : ''} onClick={() => navegar('/agenda/semana')}>
            Semana
          </button>
        )}
        {podeEditar && (
          <button className={aba === 'calendario' ? 'ativo' : ''} onClick={() => navegar('/agenda/calendario')}>
            Calendário
          </button>
        )}
        <button className={aba === 'competicoes' ? 'ativo' : ''} onClick={() => navegar('/agenda/competicoes')}>
          Competições
        </button>
        {!ehTecnico && (
          <button className={aba === 'vistos' ? 'ativo' : ''} onClick={() => navegar('/agenda/vistos')}>
            Jogos vistos <span className="sub-abas__n">{vistos.length}</span>
          </button>
        )}
      </div>

      {aba === 'semana' && veAgendaCompleta ? (
        <PlanoSemana ags={ags} obsPorJogo={obsPorJogo} aoRecarregar={carregarTudo} podeEditar={podeEditar} />
      ) : aba === 'agenda' ? (
        agsLista.length === 0 ? (
          <div className="carregar">Sem jogos agendados. Adiciona-os pelo Calendário ou em "+ Agendar jogo".</div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 6 }}>
            {agsLista.map((a, i) => {
              const players = jogadoresDoAg(a);
              const grupo = grupoDe(a);
              const primeiro = i === 0 || grupoDe(agsLista[i - 1]) !== grupo;
              return (
                <div key={a._id}>
                  {primeiro && (
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        color: 'var(--texto-suave)',
                        padding: '10px 2px 4px',
                      }}
                    >
                      {a.visionamento ? dataCurta(a.visionamento) : 'Por agendar'}
                    </div>
                  )}
                  <div
                    className="ag-linha"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 12px',
                      border: '1px solid var(--borda)',
                      borderRadius: 'var(--raio)',
                      marginBottom: 6,
                      position: 'relative',
                    }}
                  >
                    <button
                      type="button"
                      className="ag-hora-edit"
                      style={{
                        flex: '0 0 56px',
                        fontWeight: 700,
                        fontSize: 13,
                        textAlign: 'left',
                        color: a.visionamento ? 'inherit' : 'var(--texto-suave)',
                      }}
                      title={podeEditar ? 'Editar a hora a que vais ver o jogo' : 'Hora de visionamento'}
                      onClick={podeEditar ? () => abrirEditarVis(a) : undefined}
                    >
                      {a.visionamento ? horaVis(a.visionamento) : a.hora || '—'}
                      {podeEditar && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 9,
                            fontWeight: 600,
                            color: 'var(--texto-suave)',
                            letterSpacing: 0.3,
                          }}
                        >
                          {a.visionamento ? 'ver ✎' : 'definir ✎'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="ag-jogo"
                      onClick={() => setJogadoresAg(a)}
                      title="Ver os jogadores de cada equipa"
                      style={{
                        flex: '0 0 30%',
                        minWidth: 0,
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      <strong
                        style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {a.adversario || 'Jogo'}
                      </strong>
                      <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
                        {a.competicao}
                        {a.hora ? ' · jogo ' + a.hora : ''}
                        {a.local ? ' · ' + a.local : ''}
                      </span>
                    </button>
                    <div className="ag-alvos-wrap" style={{ flex: 1, minWidth: 0 }}>
                      {players.length ? (
                        <button
                          type="button"
                          className="ag-alvos"
                          onClick={() => setJogadoresAg(a)}
                          title={players.length + ' jogador(es) em scouting — ver'}
                        >
                          👤 {players.length}
                        </button>
                      ) : (
                        <span className="ag-sem-alvos" style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>Sem alvos ligados</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span className={'badge ' + classeEstado(a.estado)}>{a.estado}</span>
                      {podeEditar && (() => {
                        const vid = vistoIdDoJogo(a.calendarioJogo);
                        return vid ? (
                          <button
                            className="btn btn--secundario btn--pequeno"
                            style={{ color: 'var(--verde-ok)', fontWeight: 700 }}
                            title="Registado como visto — clica para remover"
                            onClick={() => removerVisto(vid)}
                          >
                            ✓ Visto
                          </button>
                        ) : (
                          <button className="btn btn--secundario btn--pequeno" onClick={() => marcarVistoAg(a)}>
                            👁 Vi o jogo
                          </button>
                        );
                      })()}
                      {podeEditar && a.estado !== 'Cancelado' && (
                        <button
                          className="btn btn--secundario btn--pequeno"
                          title="Registar uma observação de jogador deste jogo (mesmo já visto)"
                          onClick={() => (a.calendarioJogo ? setPickerDe(a) : setObsDe(a))}
                        >
                          ✎ Observar jogador
                        </button>
                      )}
                      {podeEditar && a.estado === 'Planeado' && (
                        <button className="btn btn--secundario btn--pequeno" onClick={() => marcar(a._id, 'Cancelado')}>
                          Cancelar
                        </button>
                      )}
                      {podeEditar && (
                        <button className="btn btn--perigo btn--pequeno" onClick={() => apagar(a._id)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : aba === 'vistos' ? (
        vistos.length === 0 ? (
          <div className="carregar">
            Ainda não registaste jogos vistos. Abre um jogo no Calendário e clica em “✓ Vi este jogo”.
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 6 }}>
            <div className="filtros" style={{ marginBottom: 8 }}>
              <select value={compVistos} onChange={(e) => setCompVistos(e.target.value)}>
                <option value="">Todas as competições</option>
                {[...new Set(vistos.map((v) => v.competicao).filter(Boolean))].sort().map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {(() => {
              const lista = compVistos ? vistos.filter((v) => v.competicao === compVistos) : vistos;
              return (
                <>
            <p style={{ margin: '0 0 8px', color: 'var(--texto-suave)', fontSize: 13 }}>
              <strong style={{ color: 'var(--texto)' }}>{lista.length}</strong> jogo(s) visto(s)
              {compVistos ? ' nesta competição' : ' — o teu trabalho de observação'}.
            </p>
            {lista.map((v) => (
              <div
                key={v._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 12px',
                  border: '1px solid var(--borda)',
                  borderRadius: 'var(--raio)',
                  marginBottom: 6,
                }}
              >
                <div style={{ flex: '0 0 96px', fontSize: 12.5, fontWeight: 600 }}>
                  {dataCurta(v.data)}
                  {v.hora ? ' · ' + v.hora : ''}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>
                    {v.casa} × {v.fora}
                  </strong>
                  <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
                    {v.competicao}
                    {v.serie ? ' · ' + v.serie : ''}
                  </div>
                </div>
                {podeEditar && (
                  <button className="btn btn--perigo btn--pequeno" onClick={() => removerVisto(v._id)}>
                    Remover
                  </button>
                )}
              </div>
            ))}
                </>
              );
            })()}
          </div>
        )
      ) : aba === 'competicoes' ? (
        <AbaCompeticoes
          aoAbrirJogo={setJogoCal}
          calAlvos={calAlvos}
          vistoIdDoJogo={vistoIdDoJogo}
          idsNaAgenda={idsNaAgenda}
        />
      ) : (
        <>
          <div className="filtros">
            <select value={calF.competicao} onChange={setCal('competicao')}>
              <option value="">Todas as competições</option>
              {meta.competicoes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={calF.serie} onChange={setCal('serie')}>
              <option value="">Todas as séries</option>
              {meta.series.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={calF.futuros} onChange={setCal('futuros')} />
              Só próximos
            </label>
          </div>
          <VistaSemana
            itens={calJogos}
            campoData="data"
            preencher
            desdeHoje
            renderItem={(jg) => {
              const alvo = calAlvos[jg._id];
              const nObs = alvo?.nObservaveis || 0;
              const nomesCasa = (alvo?.casaJogadores || []).map((p) => p.nome).join(', ');
              const nomesFora = (alvo?.foraJogadores || []).map((p) => p.nome).join(', ');
              const naAgenda = idsNaAgenda.has(String(jg._id));
              return (
                <button
                  type="button"
                  className={
                    'cal-jogo-mini' +
                    classePrioridade(prioridadeJogo(jg)) +
                    (nObs ? ' cal-jogo-mini--alvo' : '') +
                    (naAgenda ? ' cal-jogo-mini--na-agenda' : '')
                  }
                  onClick={() => setJogoCal(jg)}
                  title={
                    `${jg.casa} x ${jg.fora} · ${jg.competicao}${jg.serie ? ' · ' + jg.serie : ''}` +
                    (naAgenda ? '\n📅 Já na tua Agenda → Semana' : '') +
                    (nObs ? `\n👤 ${nObs} — ${jg.casa}: ${nomesCasa || '—'} | ${jg.fora}: ${nomesFora || '—'}` : '')
                  }
                >
                  <span className="cal-jogo-mini__eqs">
                    {jg.hora && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--texto-suave)', letterSpacing: 0.3 }}>
                        {jg.hora}
                      </span>
                    )}
                    <span className={jg.casa === CLUBE ? 'forte' : ''}>{jg.casa}</span>
                    <span className={jg.fora === CLUBE ? 'forte' : ''}>{jg.fora}</span>
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 3,
                      flexShrink: 0,
                    }}
                  >
                    {nObs > 0 && (
                      <span
                        style={{
                          background: 'var(--verde-ok, #2e7d5b)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 10.5,
                          lineHeight: 1,
                          padding: '2px 6px',
                          borderRadius: 'var(--raio-sm)',
                          whiteSpace: 'nowrap',
                        }}
                        title={`${nObs} jogador(es) em scouting neste jogo`}
                      >
                        👤 {nObs}
                      </span>
                    )}
                    {naAgenda && (
                      <span className="cal-jogo-mini__agd" title="Já na tua Agenda → Semana">
                        📅 na agenda
                      </span>
                    )}
                    <span className="cal-jogo-mini__liga">{abrevLiga(jg.competicao, jg.serie)}</span>
                  </span>
                </button>
              );
            }}
          />
        </>
      )}

      {/* Popup: jogos agendados de um dia */}
      {diaAg && (
        <Modal titulo={`Agenda · ${dataCurta(diaAg)}`} aoFechar={() => setDiaAg(null)}>
          {agsDoDia.length === 0 ? (
            <p style={{ color: 'var(--texto-suave)' }}>Sem jogos neste dia.</p>
          ) : (
            <div className="dia-lista">
              {agsDoDia.map((a) => (
                <div className="dia-item" key={a._id}>
                  <div className="dia-item__info">
                    <strong>{[a.competicao, a.adversario].filter(Boolean).join(' · ') || 'Jogo'}</strong>
                    <div className="dia-item__sub">
                      {a.jogador ? (
                        <Link to={'/jogadores/' + a.jogador._id} style={{ color: 'var(--verde)', fontWeight: 600 }}>
                          {a.jogador.nomeCompleto} ({posCurto(a.jogador.posicaoPrincipal)})
                        </Link>
                      ) : (
                        'Jogo geral'
                      )}
                      {a.local ? ' · ' + a.local : ''} ·{' '}
                      <span className={'badge ' + classeEstado(a.estado)}>{a.estado}</span>
                    </div>
                  </div>
                  {podeEditar && (
                    <div className="linha-acoes">
                      {a.estado !== 'Cancelado' && (
                        <button
                          className="btn btn--secundario btn--pequeno"
                          onClick={() => {
                            setDiaAg(null);
                            if (a.calendarioJogo) setPickerDe(a);
                            else setObsDe(a);
                          }}
                        >
                          ✎ Observar jogador
                        </button>
                      )}
                      {a.estado === 'Planeado' && (
                        <button className="btn btn--secundario btn--pequeno" onClick={() => marcar(a._id, 'Cancelado')}>
                          Cancelar
                        </button>
                      )}
                      <button className="btn btn--perigo btn--pequeno" onClick={() => apagar(a._id)}>
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Popup: jogadores em scouting de cada equipa de um jogo da Agenda */}
      {jogadoresAg &&
        (() => {
          const a = jogadoresAg;
          const o = a.calendarioJogo ? obsPorJogo[a.calendarioJogo] : null;
          const unico = a.jogador
            ? [{ _id: a.jogador._id, nome: a.jogador.nomeCompleto, posicao: a.jogador.posicaoPrincipal }]
            : null;
          const coluna = (titulo, lista) => (
            <ColunaEquipa titulo={titulo} lista={lista} aoClicar={() => setJogadoresAg(null)} />
          );
          return (
            <Modal titulo={a.adversario || 'Jogadores do jogo'} aoFechar={() => setJogadoresAg(null)}>
              <p className="dia-item__sub" style={{ marginTop: 0 }}>
                {a.competicao}
                {a.hora ? ' · ' + a.hora : ''}
              </p>
              {unico ? (
                coluna('Jogador', unico)
              ) : o ? (
                <div style={{ display: 'flex', gap: 16 }}>
                  {coluna(o.casa, o.casaJogadores || [])}
                  {coluna(o.fora, o.foraJogadores || [])}
                </div>
              ) : (
                <p style={{ color: 'var(--texto-suave)' }}>Sem jogadores ligados a este jogo.</p>
              )}
            </Modal>
          );
        })()}

      {/* Editar a hora de visionamento de um agendamento */}
      {editarVis && (
        <Modal titulo="Hora a que vais ver o jogo" aoFechar={() => setEditarVis(null)}>
          <p className="dia-item__sub" style={{ marginTop: 0 }}>
            {[editarVis.competicao, editarVis.adversario].filter(Boolean).join(' · ') || 'Jogo'}
            {editarVis.hora ? ' · jogo às ' + editarVis.hora : ''}
          </p>
          <div className="form-grelha">
            <div className="campo">
              <label>Dia do visionamento</label>
              <input type="date" value={visData} onChange={(e) => setVisData(e.target.value)} />
            </div>
            <div className="campo">
              <label>Hora de início</label>
              <input type="time" value={visHora} onChange={(e) => setVisHora(e.target.value)} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--texto-suave)', margin: '6px 2px 0' }}>
            É a hora a que começas a ver (independente da hora real do jogo). Ordena a Agenda e a Semana.
          </p>
          <div className="modal__rodape" style={{ padding: '18px 0 0', border: 'none', justifyContent: 'space-between' }}>
            {editarVis.visionamento ? (
              <button type="button" className="btn btn--perigo btn--pequeno" onClick={limparVis}>
                Remover horário
              </button>
            ) : (
              <span />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--secundario" onClick={() => setEditarVis(null)}>
                Cancelar
              </button>
              <button type="button" className="btn" onClick={guardarVis}>
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ações de um jogo do calendário */}
      {jogoCal && (
        <Modal titulo={`${jogoCal.casa} x ${jogoCal.fora}`} aoFechar={() => setJogoCal(null)}>
          <p className="dia-item__sub" style={{ marginTop: 0 }}>
            {dataCurta(jogoCal.data)}
            {jogoCal.hora ? ' · ' + jogoCal.hora : ''} · {jogoCal.competicao}
            {jogoCal.serie ? ' · ' + jogoCal.serie : ''}
          </p>
          {(calAlvos[jogoCal._id]?.jogadores || []).length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <ColunaEquipa
                titulo={jogoCal.casa}
                lista={calAlvos[jogoCal._id].casaJogadores || []}
                aoClicar={() => setJogoCal(null)}
              />
              <ColunaEquipa
                titulo={jogoCal.fora}
                lista={calAlvos[jogoCal._id].foraJogadores || []}
                aoClicar={() => setJogoCal(null)}
              />
            </div>
          )}
          {podeEditar && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <label style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Hora de início</label>
                <input type="time" value={horaCal} onChange={(e) => setHoraCal(e.target.value)} style={{ width: 120 }} />
                <button className="btn btn--secundario btn--pequeno" onClick={guardarHoraCal}>
                  Guardar hora
                </button>
              </div>
              <div className="linha-acoes" style={{ justifyContent: 'space-between', marginTop: 16 }}>
                {vistoIdDoJogo(jogoCal._id) ? (
                  <button
                    className="btn btn--secundario"
                    style={{ color: 'var(--verde-ok)', fontWeight: 700 }}
                    title="Registado como visto — clica para remover"
                    onClick={() => removerVisto(vistoIdDoJogo(jogoCal._id))}
                  >
                    ✓ Visto
                  </button>
                ) : (
                  <button className="btn btn--secundario" onClick={() => marcarVisto(jogoCal)}>
                    ✓ Vi este jogo
                  </button>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn--secundario" onClick={() => adicionarJogoAgenda(jogoCal)}>
                    + Agenda
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      const jg = jogoCal;
                      setJogoCal(null);
                      setObservarJogo(jg);
                    }}
                  >
                    ✎ Observar
                  </button>
                </div>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Form de agendamento */}
      {modal && (
        <Modal titulo="Agendar jogo" aoFechar={() => setModal(false)}>
          <form onSubmit={guardar}>
            <div className="form-grelha">
              <div className="campo campo--largo">
                <label>Jogador (opcional)</label>
                <select value={f.jogador} onChange={set('jogador')}>
                  <option value="">— jogo geral / a definir —</option>
                  {jogadores.map((j) => (
                    <option key={j._id} value={j._id}>
                      {j.nomeCompleto}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Data do jogo *</label>
                <input type="date" value={f.dataJogo} onChange={set('dataJogo')} required />
              </div>
              <div className="campo">
                <label>Hora</label>
                <input type="time" value={f.hora} onChange={set('hora')} />
              </div>
              <div className="campo">
                <label>Local</label>
                <select value={f.local} onChange={set('local')}>
                  <option value="">—</option>
                  <option value="Casa">Casa</option>
                  <option value="Fora">Fora</option>
                </select>
              </div>
              <div className="campo">
                <label>Competição</label>
                <CampoCompeticao valor={f.competicao} onChange={(v) => setF((s) => ({ ...s, competicao: v }))} />
              </div>
              <div className="campo">
                <label>Adversário</label>
                <input value={f.adversario} onChange={set('adversario')} />
              </div>
              <div className="campo campo--largo">
                <label>Notas</label>
                <textarea value={f.notas} onChange={set('notas')} />
              </div>
            </div>
            <div className="modal__rodape" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn btn--secundario" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn" disabled={aGuardar}>
                {aGuardar ? 'A guardar…' : 'Agendar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Seletor "Observar jogador": jogadores das 2 equipas do jogo + adicionar novo + folha imprimível */}
      {pickerDe && (
        <PickerObservar agendamento={pickerDe} aoFechar={() => setPickerDe(null)} aoRecarregar={carregarTudo} />
      )}

      {/* Registar observação a partir do agendamento (fallback: agendamentos manuais sem jogo) */}
      {obsDe && (
        <Modal largo titulo="Registar observação" aoFechar={() => setObsDe(null)}>
          <FormularioObservacao
            jogadores={jogadores}
            jogadorFixo={obsDe.jogador?._id || undefined}
            inicial={{
              jogador: obsDe.jogador?._id,
              dataJogo: obsDe.dataJogo,
              competicao: obsDe.competicao,
              adversario: obsDe.adversario,
            }}
            aoGuardar={guardarObs}
            aoCancelar={() => setObsDe(null)}
            aGuardar={aGuardar}
          />
        </Modal>
      )}

      {/* Registar observação direto de um jogo do calendário */}
      {observarJogo && (
        <Modal largo titulo="Registar observação" aoFechar={() => setObservarJogo(null)}>
          <FormularioObservacao
            jogadores={jogadores}
            jogadorFixo={alvoUnico(observarJogo)}
            inicial={{
              jogador: alvoUnico(observarJogo),
              dataJogo: observarJogo.data,
              competicao: observarJogo.competicao + (observarJogo.serie ? ' · ' + observarJogo.serie : ''),
              adversario: `${observarJogo.casa} x ${observarJogo.fora}`,
            }}
            aoGuardar={guardarObsCalendario}
            aoCancelar={() => setObservarJogo(null)}
            aGuardar={aGuardar}
          />
        </Modal>
      )}
    </div>
  );
}
