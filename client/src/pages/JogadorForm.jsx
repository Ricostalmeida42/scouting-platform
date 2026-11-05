import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../api.js';
import FormularioJogador from '../components/FormularioJogador.jsx';
import { useToast } from '../components/Toasts.jsx';

// Página dedicada para adicionar (/jogadores/novo) e editar (/jogadores/:id/editar)
// um jogador — substitui o antigo popup, com o mesmo visual Linear.
export default function JogadorForm() {
  const { id } = useParams();
  const navegar = useNavigate();
  const local = useLocation();
  const toast = useToast();
  const editar = !!id;

  const [inicial, setInicial] = useState(null);
  const [carregar, setCarregar] = useState(editar);
  const [erro, setErro] = useState(null);
  const [aGuardar, setAGuardar] = useState(false);

  // Para onde voltar ao gravar/cancelar: se quem abriu o editor indicou a página de
  // origem (state.voltar), volta exatamente para lá. Senão, recorre ao padrão: um
  // jogador do plantel volta ao Planeamento; os restantes à ficha do jogador.
  const voltar =
    local.state?.voltar ||
    (editar
      ? inicial?.doPlantel
        ? '/planeamento/plantel/' + id
        : '/jogador/' + id
      : '/jogadores');

  useEffect(() => {
    if (!editar) return;
    api
      .get('/players/' + id)
      .then((j) => setInicial(j))
      .catch((e) => setErro(e.message))
      .finally(() => setCarregar(false));
  }, [id, editar]);

  const guardar = async (dados) => {
    setAGuardar(true);
    try {
      if (editar) {
        await api.put('/players/' + id, dados);
        toast('Jogador atualizado.', 'ok');
        navegar(voltar);
        return;
      }
      try {
        const criado = await api.post('/players', dados);
        toast('Jogador adicionado.', 'ok');
        navegar('/jogadores/' + criado._id);
      } catch (e) {
        if (e.status === 409) {
          const nomes = (e.corpo?.duplicados || []).map((d) => d.nomeCompleto).join(', ');
          if (!window.confirm(`Já existe: ${nomes}.\n\nCriar mesmo assim um novo registo?`)) {
            setAGuardar(false);
            return;
          }
          const criado = await api.post('/players?forcar=true', dados);
          toast('Jogador adicionado.', 'ok');
          navegar('/jogadores/' + criado._id);
        } else {
          throw e;
        }
      }
    } catch (e) {
      toast('Erro ao guardar: ' + e.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  if (erro) return <div className="carregar">Erro: {erro}</div>;
  if (carregar) return <div className="carregar">A carregar…</div>;

  return (
    <div className="jogform-pagina">
      <div className="pagina-cabecalho jogform-cabecalho">
        <div className="jogform-titulo">
          <Link to={voltar} className="btn btn--secundario btn--pequeno">
            ← Voltar
          </Link>
          <h2>{editar ? `Editar · ${inicial?.nomeCompleto || 'jogador'}` : 'Adicionar jogador'}</h2>
        </div>
      </div>

      <div className="card jogform-card">
        <FormularioJogador
          inicial={inicial}
          plantel={!!inicial?.doPlantel}
          aoGuardar={guardar}
          aoCancelar={() => navegar(voltar)}
          aGuardar={aGuardar}
        />
      </div>
    </div>
  );
}
