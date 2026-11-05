import { useState, useEffect, useMemo } from 'react';
import { dataCurta } from '../lib.js';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function inicioSemana(d) {
  const dt = new Date(d);
  const off = (dt.getDay() + 6) % 7; // 0 = segunda
  dt.setDate(dt.getDate() - off);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function inicioDia(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
export const chaveDia = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// Vista de calendário semanal: 7 dias, os que têm jogos são clicáveis (abrem um
// popup no pai), navegação ‹ › entre semanas e atalho para os próximos jogos.
export default function VistaSemana({ itens, campoData, aoAbrirDia, renderItem, preencher = false, desdeHoje = false }) {
  const [ref, setRef] = useState(null);

  const porDia = useMemo(() => {
    const m = {};
    (itens || []).forEach((it) => {
      const k = chaveDia(it[campoData]);
      (m[k] = m[k] || []).push(it);
    });
    return m;
  }, [itens, campoData]);

  const primeiraRelevante = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const datas = (itens || [])
      .map((it) => new Date(it[campoData]))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a - b);
    return datas.find((d) => d >= hoje) || datas[0] || hoje;
  };

  // Início da janela: no modo desdeHoje, o dia atual é sempre a 1ª coluna;
  // caso contrário, arranca na semana (segunda) do primeiro jogo a partir de hoje.
  const inicioPadrao = () => (desdeHoje ? inicioDia(new Date()) : inicioSemana(primeiraRelevante()));
  useEffect(() => {
    if (ref) return;
    if (desdeHoje || (itens || []).length) setRef(inicioPadrao());
  }, [itens]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = ref || (desdeHoje ? inicioDia(new Date()) : inicioSemana(new Date()));
  const fim = new Date(base);
  fim.setDate(fim.getDate() + 6);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return d;
  });
  const hojeKey = chaveDia(new Date());
  const nav = (delta) => {
    const d = new Date(base);
    d.setDate(d.getDate() + delta * 7);
    setRef(d);
  };

  // No modo lista (calendário), os dias com jogos ficam largos e os vazios
  // estreitos — como a maioria dos jogos é ao fim de semana. Se a semana não
  // tiver jogos nenhuns, mantém as 7 colunas iguais.
  const temAlgum = renderItem && dias.some((d) => (porDia[chaveDia(d)] || []).length);
  const estiloDias = temAlgum
    ? { gridTemplateColumns: dias.map((d) => ((porDia[chaveDia(d)] || []).length ? '1fr' : '54px')).join(' ') }
    : undefined;

  return (
    <div className={'vsem' + (preencher ? ' vsem--preencher' : '')}>
      <div className="vsem__nav">
        <button className="vsem__seta" onClick={() => nav(-1)} aria-label="Semana anterior">
          ‹
        </button>
        <span className="vsem__titulo">
          {dataCurta(base)} — {dataCurta(fim)}
        </span>
        <button className="vsem__seta" onClick={() => nav(1)} aria-label="Semana seguinte">
          ›
        </button>
        <button
          className="btn btn--secundario btn--pequeno"
          style={{ marginLeft: 'auto' }}
          onClick={() => setRef(inicioPadrao())}
        >
          {desdeHoje ? 'Hoje' : 'Próximos jogos'}
        </button>
      </div>
      <div className="vsem__dias" style={estiloDias}>
        {dias.map((d, i) => {
          const k = chaveDia(d);
          const itensDia = porDia[k] || [];
          const n = itensDia.length;
          const tem = n > 0;
          const cabecalho = (
            <>
              {/* Rótulo pelo dia REAL da semana (no modo desdeHoje a 1.ª coluna é hoje, não segunda). */}
              <span className="vsem__dia-sem">{DIAS[(d.getDay() + 6) % 7]}</span>
              <span className="vsem__dia-num">{d.getDate()}</span>
            </>
          );
          // Modo "lista": os jogos aparecem dentro da coluna do dia.
          if (renderItem) {
            return (
              <div
                key={k}
                className={
                  'vsem__dia vsem__dia--lista' +
                  (tem ? '' : ' vsem__dia--vazio') +
                  (k === hojeKey ? ' vsem__dia--hoje' : '')
                }
              >
                {cabecalho}
                <div className="vsem__dia-jogos">
                  {itensDia.map((it, idx) => (
                    <div key={idx}>{renderItem(it)}</div>
                  ))}
                </div>
              </div>
            );
          }
          // Modo "contador": clica no dia para abrir os jogos num popup.
          return (
            <button
              key={k}
              type="button"
              className={
                'vsem__dia' +
                (tem ? ' vsem__dia--tem' : ' vsem__dia--vazio') +
                (k === hojeKey ? ' vsem__dia--hoje' : '')
              }
              onClick={tem ? () => aoAbrirDia(d) : undefined}
              disabled={!tem}
            >
              {cabecalho}
              {tem && <span className="vsem__dia-badge">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
