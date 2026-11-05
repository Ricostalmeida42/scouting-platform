import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { posCurto, idade, dataCurta } from '../lib.js';
import BadgesRP from '../components/BadgesRP.jsx';
import { useToast } from '../components/Toasts.jsx';

// Aba Arquivo — jogadores retirados do funil de recrutamento. Ficam guardados aqui
// (fora do Pipeline) e podem ser repostos em Prospeção quando voltarem a interessar.
export default function Arquivo() {
  const navegar = useNavigate();
  const toast = useToast();
  const [jogadores, setJogadores] = useState([]);
  const [carregar, setCarregar] = useState(true);
  const [aRepor, setARepor] = useState(null); // id em curso

  const carregarLista = useCallback(async () => {
    setCarregar(true);
    try {
      const todos = await api.get('/players?incluirArquivo=true&veredito=' + encodeURIComponent('Não avança'));
      setJogadores(todos);
    } finally {
      setCarregar(false);
    }
  }, []);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  const repor = async (jogador) => {
    setARepor(jogador._id);
    try {
      await api.patch('/players/' + jogador._id + '/classificacao', { veredito: '' });
      toast(`${jogador.nomeCompleto} reposto (veredito limpo).`, 'ok');
      setJogadores((lista) => lista.filter((j) => j._id !== jogador._id));
    } catch (e) {
      toast('Erro ao repor: ' + e.message, 'erro');
    } finally {
      setARepor(null);
    }
  };

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Arquivo</h2>
        </div>
      </div>

      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Pos.</th>
              <th>Idade</th>
              <th>Clube</th>
              <th>Fim contrato</th>
              <th>R/P</th>
              <th aria-label="Ações"></th>
            </tr>
          </thead>
          <tbody>
            {carregar ? (
              <tr>
                <td colSpan={7} className="tabela-vazia">
                  A carregar…
                </td>
              </tr>
            ) : jogadores.length === 0 ? (
              <tr>
                <td colSpan={7} className="tabela-vazia">
                  O arquivo está vazio.
                </td>
              </tr>
            ) : (
              jogadores.map((j) => (
                <tr key={j._id} className="clicavel" onClick={() => navegar('/jogadores/' + j._id)}>
                  <td>
                    <div className="jogador-nome-cel">
                      {j.foto ? (
                        <img className="jogador-thumb" src={j.foto} alt="" loading="lazy" />
                      ) : (
                        <span className="jogador-thumb jogador-thumb--vazio sem-foto" aria-hidden="true" />
                      )}
                      <strong>{j.nomeCompleto}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge--pos">{posCurto(j.posicaoPrincipal)}</span>
                  </td>
                  <td>{idade(j.dataNascimento)}</td>
                  <td>{j.clubeAtual || '—'}</td>
                  <td>{j.fimContrato ? dataCurta(j.fimContrato) : '—'}</td>
                  <td>
                    <BadgesRP rendimento={j.rendimento} potencial={j.potencialClass} />
                  </td>
                  <td className="col-acoes" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn--secundario btn--pequeno"
                      onClick={() => repor(j)}
                      disabled={aRepor === j._id}
                      title="Repor o jogador (limpa o veredito “Não avança”)"
                    >
                      {aRepor === j._id ? 'A repor…' : '↩ Repor'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
