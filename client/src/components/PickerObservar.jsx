import { useState, useEffect } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';
import FormularioObservacao from './FormularioObservacao.jsx';
import { useToast } from './Toasts.jsx';
import { dataCurta } from '../lib.js';

const POS = ['GR', 'DD', 'DC', 'DE', 'MDF', 'MC', 'MOF', 'EE', 'ED', 'PL'];

// Seletor "Observar jogador" a partir de um jogo da Agenda: mostra os jogadores das
// DUAS equipas que já tens na lista, deixa adicionar um novo ali mesmo, abrir a folha
// de observação imprimível (com dados do jogo + jogador) e registar a observação.
export default function PickerObservar({ agendamento, aoFechar, aoRecarregar }) {
  const toast = useToast();
  const [dados, setDados] = useState(null); // { jogo, casa, fora, casaJogadores, foraJogadores }
  const [erro, setErro] = useState(null);
  const [vista, setVista] = useState('lista'); // 'lista' | 'obs'
  const [sel, setSel] = useState(null); // { player, lado }
  const [addLado, setAddLado] = useState(null); // 'casa' | 'fora'
  const [nome, setNome] = useState('');
  const [pos, setPos] = useState('MC');
  const [aGuardar, setAGuardar] = useState(false);

  const carregar = () => {
    setErro(null);
    api
      .get('/calendario/' + agendamento.calendarioJogo + '/observaveis')
      .then(setDados)
      .catch((e) => setErro(e.message));
  };
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamento?.calendarioJogo]);

  const jogo = dados?.jogo;
  const advDe = (lado) => (lado === 'casa' ? dados?.fora?.nome : lado === 'fora' ? dados?.casa?.nome : '');
  const compTxt = jogo ? jogo.competicao + (jogo.serie ? ' · ' + jogo.serie : '') : '';

  const urlFolha = (jogadorId, lado) => {
    const p = new URLSearchParams();
    if (jogo) {
      if (jogo.data) p.set('data', String(jogo.data).slice(0, 10));
      p.set('competicao', compTxt);
      p.set('jogo', jogo.casa + ' x ' + jogo.fora);
      if (lado && advDe(lado)) p.set('adversario', advDe(lado));
      if (jogo.hora) p.set('hora', jogo.hora);
    }
    return '/api/players/' + (jogadorId || 'branco') + '/folha-observacao?' + p.toString();
  };
  const abrirFolha = (jogadorId, lado) => window.open(urlFolha(jogadorId, lado), '_blank');

  const adicionar = (lado) => {
    if (!nome.trim()) return toast('Escreve o nome do jogador.', 'erro');
    const info = dados[lado]; // { nome, clubeId, liga, mercado }
    setAGuardar(true);
    api
      .post('/players', {
        nomeCompleto: nome.trim(),
        posicaoPrincipal: pos,
        clube: info.clubeId || null,
        clubeAtual: info.nome,
        liga: info.liga || undefined,
        mercado: info.mercado || undefined,
      })
      .then(() => {
        setNome('');
        setAddLado(null);
        toast('Jogador adicionado à lista.', 'ok');
        carregar();
        aoRecarregar && aoRecarregar();
      })
      .catch((e) =>
        toast(
          /409/.test(e.message) ? 'Já existe um jogador com esse nome — adiciona-o pela página Jogadores.' : 'Erro: ' + e.message,
          'erro'
        )
      )
      .finally(() => setAGuardar(false));
  };

  const observar = (player, lado) => {
    setSel({ player, lado });
    setVista('obs');
  };
  const guardarObs = (payload) => {
    setAGuardar(true);
    api
      .post('/observations', payload)
      .then((res) => {
        toast(res?.perfilAtualizado ? 'Observação registada · perfil atualizado' : 'Observação registada.', 'ok');
        setVista('lista');
        setSel(null);
        carregar();
        aoRecarregar && aoRecarregar();
      })
      .catch((e) => toast('Erro: ' + e.message, 'erro'))
      .finally(() => setAGuardar(false));
  };

  // Vista de observação de um jogador escolhido
  if (vista === 'obs' && sel) {
    return (
      <Modal largo titulo={`Observar — ${sel.player.nome}`} aoFechar={() => { setVista('lista'); setSel(null); }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--secundario btn--pequeno" onClick={() => { setVista('lista'); setSel(null); }}>
            ‹ Voltar aos jogadores
          </button>
          <button className="btn btn--secundario btn--pequeno" onClick={() => abrirFolha(sel.player._id, sel.lado)}>
            🖨 Folha de observação
          </button>
        </div>
        <FormularioObservacao
          jogadorFixo={sel.player._id}
          inicial={{ jogador: sel.player._id, dataJogo: jogo?.data, competicao: compTxt, adversario: advDe(sel.lado) }}
          aoGuardar={guardarObs}
          aoCancelar={() => { setVista('lista'); setSel(null); }}
          aGuardar={aGuardar}
        />
      </Modal>
    );
  }

  const coluna = (lado) => {
    const info = dados[lado];
    const lista = lado === 'casa' ? dados.casaJogadores : dados.foraJogadores;
    return (
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          {info.nome}
          {!info.clubeId && <span style={{ fontSize: 11, color: 'var(--texto-suave)', fontWeight: 400 }}> · clube não ligado</span>}
        </div>
        {lista.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--texto-suave)', marginBottom: 6 }}>Nenhum jogador teu nesta equipa.</div>
        ) : (
          lista.map((p) => (
            <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid var(--borda)' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{p.nome}</strong> <span style={{ color: 'var(--texto-suave)', fontSize: 12 }}>{p.posicao}</span>
              </span>
              <button className="btn btn--secundario btn--pequeno" onClick={() => observar(p, lado)}>✎ Observar</button>
              <button className="btn btn--secundario btn--pequeno" onClick={() => abrirFolha(p._id, lado)} title="Abrir folha de observação imprimível">
                🖨
              </button>
            </div>
          ))
        )}
        {addLado === lado ? (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <input
              autoFocus
              placeholder="Nome do jogador novo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionar(lado)}
              style={{ flex: 1, minWidth: 130 }}
            />
            <select value={pos} onChange={(e) => setPos(e.target.value)}>
              {POS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <button className="btn btn--pequeno" disabled={aGuardar} onClick={() => adicionar(lado)}>
              Adicionar
            </button>
            <button className="btn btn--secundario btn--pequeno" onClick={() => { setAddLado(null); setNome(''); }}>
              Cancelar
            </button>
          </div>
        ) : (
          <button
            className="btn btn--secundario btn--pequeno"
            style={{ marginTop: 8 }}
            onClick={() => { setAddLado(lado); setNome(''); }}
            disabled={!info.clubeId}
            title={info.clubeId ? 'Adicionar um jogador desta equipa que ainda não tens na lista' : 'Esta equipa não está ligada a um clube registado'}
          >
            + Adicionar jogador
          </button>
        )}
      </div>
    );
  };

  return (
    <Modal
      largo
      titulo="Observar jogador"
      aoFechar={aoFechar}
      rodape={
        <button className="btn btn--secundario" onClick={aoFechar}>
          Fechar
        </button>
      }
    >
      {erro && <div className="carregar">Erro: {erro}</div>}
      {!dados && !erro && <div className="carregar">A carregar…</div>}
      {dados && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {jogo.casa} <span style={{ color: 'var(--texto-suave)' }}>x</span> {jogo.fora}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>
              {compTxt}
              {jogo.data ? ' · ' + dataCurta(jogo.data) : ''}
              {jogo.hora ? ' · ' + jogo.hora : ''}
            </div>
            <button
              className="btn btn--secundario btn--pequeno"
              style={{ marginTop: 8 }}
              onClick={() => abrirFolha('branco', null)}
              title="Folha só com os dados do jogo (jogador em branco) — para um jogador que ainda não conheces"
            >
              🖨 Folha em branco (só o jogo)
            </button>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {coluna('casa')}
            {coluna('fora')}
          </div>
        </>
      )}
    </Modal>
  );
}
