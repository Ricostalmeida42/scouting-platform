import { LABEL_ATRIBUTO } from '../grelhaPosicao.js';

// Relatório de observação NÃO editável, desenhado como secção da app (temado).
// A grelha é lida pelos ATRIBUTOS efetivamente gravados em obs.grelhaPosicao
// (mapa "categoria.atributo" -> nota) — os rótulos vêm de LABEL_ATRIBUTO, sem
// depender da posição atual do jogador (que pode ter mudado desde a observação).
const DIMS = [
  { key: 'tecnica', label: 'Técnica' },
  { key: 'tatica', label: 'Tática' },
  { key: 'fisica', label: 'Física' },
  { key: 'mental', label: 'Mental' },
];

export default function RelatorioObs({ obs }) {
  if (!obs) return null;
  const av = obs.avaliacao || {};
  const grid = obs.grelhaPosicao || {};

  // Atributos gravados, agrupados pela categoria (prefixo da chave).
  const attrsPorCat = {};
  for (const [chave, v] of Object.entries(grid)) {
    if (typeof v !== 'number') continue;
    const cat = chave.split('.')[0];
    (attrsPorCat[cat] ||= []).push({ chave, label: LABEL_ATRIBUTO[chave] || chave.split('.').slice(1).join('.'), v });
  }

  // Pontos fortes / fracos (caixas gerais da observação — texto livre por linha).
  const linhas = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const fortesG = linhas(obs.fortes);
  const fracosG = linhas(obs.fracos);

  const temAlgumaDim = DIMS.some((c) => typeof av[c.key] === 'number' || (attrsPorCat[c.key] || []).length);

  return (
    <div className="rel-obs">
      {obs.estiloJogo && (
        <section className="rel-obs__sec">
          <h4 className="rel-obs__h">Estilo de jogo</h4>
          <p className="rel-obs__texto">{obs.estiloJogo}</p>
        </section>
      )}

      {temAlgumaDim && (
        <section className="rel-obs__sec">
          <h4 className="rel-obs__h">Avaliação por dimensão</h4>
          <div className="rel-obs__dims">
            {DIMS.map((c) => {
              const nota = typeof av[c.key] === 'number' ? av[c.key] : null;
              const attrs = attrsPorCat[c.key] || [];
              if (nota == null && !attrs.length) return null;
              return (
                <div className="rel-obs__dim" key={c.key}>
                  <div className="rel-obs__dim-cab">
                    <span className="rel-obs__dim-nome">{c.label}</span>
                    <strong className="rel-obs__dim-nota">{nota != null ? nota.toFixed(1) : '—'}</strong>
                  </div>
                  {attrs.length > 0 && (
                    <ul className="rel-obs__attrs">
                      {attrs.map((a) => (
                        <li key={a.chave}>
                          <span>{a.label}</span>
                          <strong>{a.v}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(fortesG.length > 0 || fracosG.length > 0) && (
        <section className="rel-obs__sec">
          <h4 className="rel-obs__h">Pontos fortes / fracos</h4>
          <div className="rel-obs__pts">
            <div>
              <div className="rel-obs__pts-t rel-obs__pts-t--ok">Pontos fortes</div>
              {fortesG.length ? (
                <ul className="rel-obs__pts-l">{fortesG.map((t, i) => <li key={i}>+ {t}</li>)}</ul>
              ) : (
                <p className="rel-obs__vazio" style={{ margin: 0 }}>—</p>
              )}
            </div>
            <div>
              <div className="rel-obs__pts-t rel-obs__pts-t--aviso">Pontos fracos</div>
              {fracosG.length ? (
                <ul className="rel-obs__pts-l">{fracosG.map((t, i) => <li key={i}>− {t}</li>)}</ul>
              ) : (
                <p className="rel-obs__vazio" style={{ margin: 0 }}>—</p>
              )}
            </div>
          </div>
        </section>
      )}

      {obs.notas && (
        <section className="rel-obs__sec">
          <h4 className="rel-obs__h">Notas</h4>
          <p className="rel-obs__texto">{obs.notas}</p>
        </section>
      )}

      {!obs.estiloJogo && !temAlgumaDim && !obs.notas && !fortesG.length && !fracosG.length && (
        <p className="rel-obs__vazio">Esta observação ainda não tem relatório preenchido.</p>
      )}
    </div>
  );
}
