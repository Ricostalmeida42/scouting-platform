import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import RadarDados from '../components/RadarDados.jsx';

const NOME_GRUPO = {
  GR: 'Guarda-redes',
  DC: 'Defesa central',
  LATERAL: 'Defesa lateral',
  MDF: 'Médio defensivo',
  MC: 'Médio centro',
  MOF: 'Médio ofensivo',
  EXTREMO: 'Extremo',
  PL: 'Ponta de lança',
};
const ORDEM = ['GR', 'DC', 'LATERAL', 'MDF', 'MC', 'MOF', 'EXTREMO', 'PL'];

// Escolhe o perfil do jogador que casa com o grupo pedido (ou o de mais minutos).
function perfilDoGrupo(perfis, grupo) {
  if (!perfis?.length) return null;
  return perfis.find((p) => p.grupo === grupo) || perfis[0];
}

export default function Comparar() {
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState(null);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [perfilA, setPerfilA] = useState(null);
  const [perfilB, setPerfilB] = useState(null);

  useEffect(() => {
    api.get('/estatisticas/jogadores').then(setLista).catch((e) => setErro(e.message));
  }, []);

  const jogA = lista.find((j) => j.id === aId);
  const grupo = jogA?.grupo || null;
  // só se pode comparar com jogadores da MESMA posição (eixos iguais)
  const opcoesB = useMemo(
    () => lista.filter((j) => j.id !== aId && j.grupo === grupo),
    [lista, aId, grupo]
  );

  useEffect(() => {
    if (!aId) return setPerfilA(null);
    api.get('/estatisticas/jogador/' + aId)
      .then((r) => setPerfilA(perfilDoGrupo(r?.perfis, grupo)))
      .catch(() => setPerfilA(null));
  }, [aId, grupo]);

  useEffect(() => {
    if (!bId) return setPerfilB(null);
    api.get('/estatisticas/jogador/' + bId)
      .then((r) => setPerfilB(perfilDoGrupo(r?.perfis, grupo)))
      .catch(() => setPerfilB(null));
  }, [bId, grupo]);

  // ao mudar A, se o B já escolhido não for da mesma posição, limpa-o
  useEffect(() => {
    if (bId && !opcoesB.some((j) => j.id === bId)) setBId('');
  }, [opcoesB, bId]);

  // opções agrupadas por posição
  const grupos = useMemo(() => {
    const m = {};
    lista.forEach((j) => (m[j.grupo] = m[j.grupo] || []).push(j));
    return ORDEM.filter((g) => m[g]).map((g) => ({ g, nome: NOME_GRUPO[g] || g, jogs: m[g] }));
  }, [lista]);

  const series = [];
  if (perfilA) series.push({ nome: jogA?.nome || 'Jogador A', cor: 'var(--verde)', eixos: perfilA.eixos });
  if (perfilB) series.push({ nome: lista.find((j) => j.id === bId)?.nome || 'Jogador B', cor: 'var(--azul, #2f6df0)', eixos: perfilB.eixos });

  return (
    <div className="comparar-dados">
      {erro && <div className="carregar">Erro: {erro}</div>}
      {!erro && lista.length === 0 && (
        <div className="carregar">Ainda não há jogadores com dados. Importa um export primeiro.</div>
      )}

      {lista.length > 0 && (
        <>
          <div className="cmp-seletores">
            <label className="cmp-campo">
              <span>Jogador A</span>
              <select value={aId} onChange={(e) => setAId(e.target.value)}>
                <option value="">— escolhe —</option>
                {grupos.map((gr) => (
                  <optgroup key={gr.g} label={gr.nome}>
                    {gr.jogs.map((j) => (
                      <option key={j.id} value={j.id}>{j.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <span className="cmp-vs">vs</span>
            <label className="cmp-campo">
              <span>Jogador B {grupo ? `(${NOME_GRUPO[grupo]})` : ''}</span>
              <select value={bId} onChange={(e) => setBId(e.target.value)} disabled={!aId}>
                <option value="">{aId ? '— escolhe —' : 'escolhe o A primeiro'}</option>
                {opcoesB.map((j) => (
                  <option key={j.id} value={j.id}>{j.nome}</option>
                ))}
              </select>
            </label>
          </div>

          {series.length === 0 ? (
            <div className="carregar">Escolhe um jogador para ver o perfil de dados.</div>
          ) : (
            <div className="card cmp-resultado">
              <div className="cmp-metas">
                {perfilA && (
                  <div className="cmp-meta">
                    <span className="cmp-meta-cor" style={{ background: 'var(--verde)' }} />
                    <strong>{jogA?.nome}</strong> · {perfilA.nomeGrupo} · {perfilA.competicao} {perfilA.epoca} · {perfilA.minutos}′
                    {(perfilA.minutosFracos || perfilA.amostraFraca) && <span className="cmp-flag">⚠ amostra pequena</span>}
                  </div>
                )}
                {perfilB && (
                  <div className="cmp-meta">
                    <span className="cmp-meta-cor" style={{ background: 'var(--azul, #2f6df0)' }} />
                    <strong>{lista.find((j) => j.id === bId)?.nome}</strong> · {perfilB.nomeGrupo} · {perfilB.competicao} {perfilB.epoca} · {perfilB.minutos}′
                    {(perfilB.minutosFracos || perfilB.amostraFraca) && <span className="cmp-flag">⚠ amostra pequena</span>}
                  </div>
                )}
              </div>
              <RadarDados series={series} />
              {perfilA && perfilB && perfilA.competicao !== perfilB.competicao && (
                <p className="perfil-dados__nota">
                  Os percentis de cada jogador são face à <strong>sua própria liga</strong> ({perfilA.competicao} vs {perfilB.competicao}) — compara a posição relativa em cada contexto, não valores absolutos entre ligas.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
