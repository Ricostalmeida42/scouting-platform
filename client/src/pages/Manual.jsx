import { useEffect, useRef, useState } from 'react';

// Manual de USO da plataforma — para quem a usa (sem a parte exclusiva do
// scouting/editor). Diz como fazer cada coisa e o que significa cada valor.
// Página de leitura, acessível a todas as contas. Índice lateral + âncoras.
const Cod = ({ children }) => <span className="manual-cod">{children}</span>;

const SECOES = [
  {
    id: 'avaliar-plantel',
    titulo: 'Avaliar um jogador do plantel',
    corpo: (
      <>
        <p>
          Na aba <b>Plantel</b> (dentro do Planeamento), abre a ficha de um jogador do clube e
          carrega em <b>“+ Avaliar”</b>. Avalias pela <b>grelha</b> — os atributos de 1 a 5,
          agrupados em 4 dimensões: <b>Técnica</b>, <b>Tática</b>, <b>Física</b> e <b>Mental</b>.
        </p>
        <ul className="manual-defs">
          <li>Avalia só os atributos que conheces — não tens de preencher todos.</li>
          <li>
            Fica um <b>histórico</b>: várias avaliações ao longo do tempo. A <b>mais recente</b> é a
            que conta no perfil (é o rating que aparece na tabela do Plantel).
          </li>
          <li>
            A tua <b>função</b> (Treinador, Diretor desportivo…) entra sozinha, a partir da tua
            conta — não a escreves.
          </li>
          <li>
            Várias pessoas podem avaliar o mesmo jogador (equipa técnica, direção), para haver vários
            olhares.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'escala',
    titulo: 'A escala 1 a 5 (nível de liga)',
    corpo: (
      <>
        <p>
          Quando avalias, cada atributo vai de <b>1 a 5</b>. Não é uma nota de 0 a 100 nem “metade” —
          é o <b>nível de liga</b> em que a ação se situa:
        </p>
        <ul className="manual-defs">
          <li>
            <Cod>5</Cod> Ligas profissionais
          </li>
          <li>
            <Cod>4</Cod> Liga 3
          </li>
          <li>
            <Cod>3</Cod> Nível do clube
          </li>
          <li>
            <Cod>2</Cod> Campeonato de Portugal (nível baixo)
          </li>
          <li>
            <Cod>1</Cod> Distrital
          </li>
        </ul>
        <p className="manual-nota">
          Lê-se sempre assim: um <b>3</b> é “nível do clube”. <b>4–5</b> é acima do clube (melhor);{' '}
          <b>1–2</b> é abaixo.
        </p>
      </>
    ),
  },
  {
    id: 'pesos',
    titulo: 'Como sai o rating',
    corpo: (
      <>
        <p>A partir das tuas notas, o número de cada dimensão e o rating saem assim:</p>
        <ul className="manual-defs">
          <li>
            Cada atributo tem um <b>peso</b> (<Cod>●</Cod> a <Cod>●●●</Cod>, de 1 a 3). Quanto maior,
            mais conta dentro da sua dimensão.
          </li>
          <li>
            <b>Dimensão</b> = média dos atributos que avaliaste, ponderada por esses pesos (1 casa
            decimal).
          </li>
          <li>
            <b>Rating</b> = média das 4 dimensões (Técnica, Tática e Mental pesam um pouco mais;
            Física um pouco menos).
          </li>
        </ul>
        <p className="manual-nota">
          O peso de um atributo só faz diferença quando há outros avaliados na mesma dimensão.
          Sozinho, dá o próprio valor. Os atributos de cada dimensão (e os pesos) são definidos pelo
          scouting.
        </p>
      </>
    ),
  },
  {
    id: 'sugestoes',
    titulo: 'Sugerir jogadores',
    corpo: (
      <p>
        Em <b>Sugestões</b>, deixas nomes de jogadores que achas que o scouting deve ver. Escreve o
        nome (e o que souberes) e envia — o scouting recebe um aviso de sugestões novas.
      </p>
    ),
  },
  {
    id: 'planeamento',
    titulo: 'Planeamento e Plantel',
    corpo: (
      <>
        <p>
          <b>Planeamento</b> mostra a profundidade do plantel por posição (shadow team): onde há
          falta ou excesso de jogadores.
        </p>
        <p>
          A aba <b>Plantel</b> lista os jogadores do clube com os dados de cada um: idade,
          nacionalidade, altura, pé, <b>rating</b> e as 4 dimensões, e fim de contrato. Clica numa
          coluna para ordenar; clica num jogador para abrir a ficha e avaliá-lo.
        </p>
      </>
    ),
  },
  {
    id: 'agenda',
    titulo: 'Agenda e competições',
    corpo: (
      <p>
        A <b>Agenda</b> é o calendário de jogos. Na aba <b>Competições</b> consultas as
        classificações das ligas acompanhadas (atualizadas a partir do zerozero).
      </p>
    ),
  },
];

export default function Manual() {
  const [ativa, setAtiva] = useState(SECOES[0].id);
  const refs = useRef({});

  // Realça no índice a secção visível (scroll-spy simples).
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel) setAtiva(visivel.target.id);
      },
      { rootMargin: '0px 0px -72% 0px', threshold: 0 }
    );
    Object.values(refs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const irPara = (id) => {
    refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setAtiva(id);
  };

  return (
    <div className="manual">
      <div className="pagina-cabecalho">
        <div>
          <h2>Manual de utilização</h2>
          <p className="manual-sub">Como usar a plataforma e o que significa cada valor.</p>
        </div>
      </div>

      <div className="manual__grelha">
        <nav className="manual__toc" aria-label="Índice">
          {SECOES.map((s) => (
            <button
              key={s.id}
              className={'manual__toc-link' + (ativa === s.id ? ' ativo' : '')}
              onClick={() => irPara(s.id)}
            >
              {s.titulo}
            </button>
          ))}
        </nav>

        <div className="manual__corpo">
          {SECOES.map((s) => (
            <section
              key={s.id}
              id={s.id}
              ref={(el) => (refs.current[s.id] = el)}
              className="manual__secao"
            >
              <h3 className="manual__secao-titulo">{s.titulo}</h3>
              {s.corpo}
            </section>
          ))}
          <p className="manual__fim">Dúvidas ou algo a melhorar? Fala com o scouting.</p>
        </div>
      </div>
    </div>
  );
}
