import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { CATALOGO_POSICAO, CATS_GRELHA, GRELHA_PADRAO } from '../grelhaPosicao.js';
import { invalidarGrelha } from '../grelhaConfig.js';
import { useToast } from './Toasts.jsx';
import { useAuth } from '../auth.jsx';
import { POSICOES } from '../lib.js';

const POS_KEYS = ['GR', 'DD', 'DC', 'DE', 'MDF', 'MC', 'MOF', 'EE', 'ED', 'PL'];

// Estado editável: sel[pos][dim][k] = peso (presença da chave = selecionado).
function fromConfig(config) {
  const sel = {};
  for (const pos of POS_KEYS) {
    sel[pos] = {};
    for (const { key: dim } of CATS_GRELHA) {
      sel[pos][dim] = {};
      const guardado = config?.[pos]?.[dim];
      const fonte = guardado !== undefined ? guardado : GRELHA_PADRAO[pos]?.[dim] || [];
      for (const it of fonte) sel[pos][dim][it.k] = it.p || 2;
    }
  }
  return sel;
}

export default function GrelhaConfig() {
  const toast = useToast();
  const { podeEditar } = useAuth();
  const soLeitura = !podeEditar; // diretor/treinador: veem a grelha, não a alteram
  const [sel, setSel] = useState(null);
  const [pos, setPos] = useState('GR');
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    api
      .get('/config-grelha', { silencioso: true })
      .then((cfg) => setSel(fromConfig(cfg)))
      .catch(() => setSel(fromConfig(null)));
  }, []);

  const toggle = (dim, k, pDef) =>
    setSel((s) => {
      const c = { ...s, [pos]: { ...s[pos], [dim]: { ...s[pos][dim] } } };
      if (k in c[pos][dim]) delete c[pos][dim][k];
      else c[pos][dim][k] = pDef || 2;
      return c;
    });

  const mudarPeso = (dim, k, p) =>
    setSel((s) => ({ ...s, [pos]: { ...s[pos], [dim]: { ...s[pos][dim], [k]: p } } }));

  const reporPos = () => setSel((s) => ({ ...s, [pos]: fromConfig(null)[pos] }));

  const guardar = async () => {
    setAGuardar(true);
    try {
      const grelha = {};
      for (const p of POS_KEYS) {
        grelha[p] = {};
        for (const { key: dim } of CATS_GRELHA) {
          const ordem = (CATALOGO_POSICAO[p]?.[dim] || []).map((a) => a.k);
          grelha[p][dim] = Object.entries(sel[p][dim])
            .sort((a, b) => ordem.indexOf(a[0]) - ordem.indexOf(b[0]))
            .map(([k, peso]) => ({ k, p: peso }));
        }
      }
      await api.put('/config-grelha', { grelha });
      invalidarGrelha();
      toast('Grelha guardada. As novas observações já usam esta seleção.', 'ok');
    } catch (e) {
      toast('Erro ao guardar: ' + e.message, 'erro');
    } finally {
      setAGuardar(false);
    }
  };

  if (!sel) return <p className="jog-sheet__vazio">A carregar…</p>;

  const catPos = CATALOGO_POSICAO[pos] || {};
  const posLabel = POSICOES.find((x) => x.key === pos)?.label || pos;
  const nSel = CATS_GRELHA.reduce((n, c) => n + Object.keys(sel[pos][c.key]).length, 0);

  return (
    <div className="grelha-cfg">
      <p className="grelha-cfg__intro">
        {soLeitura
          ? 'Atributos avaliados em cada posição e o respetivo peso (1-3), que define a importância na nota da dimensão. Definido pelo scouting.'
          : 'Atributos importantes por posição. Marca os que queres na grelha de observação de cada posição; o peso (1-3) define a importância na nota da dimensão. Guarda para aplicar às próximas observações.'}
      </p>

      <div className="grelha-cfg__pos abas-barra no-print">
        {POS_KEYS.map((p) => (
          <button key={p} className={p === pos ? 'ativo' : ''} onClick={() => setPos(p)}>
            {p}
          </button>
        ))}
      </div>

      <div className="grelha-cfg__acoes">
        <span className="grelha-cfg__titulo">
          {posLabel} · <b>{nSel}</b> atributos selecionados
        </span>
        {!soLeitura && (
          <span className="linha-acoes">
            <button className="btn btn--secundario btn--pequeno" onClick={reporPos}>
              Repor predefinição (esta posição)
            </button>
            <button className="btn" onClick={guardar} disabled={aGuardar}>
              {aGuardar ? 'A guardar…' : 'Guardar grelha'}
            </button>
          </span>
        )}
      </div>

      <div className="grelha-cfg__dims">
        {CATS_GRELHA.map((c) => (
          <div key={c.key} className="grelha-cfg__dim">
            <h4>
              {c.label}
              <span className="grelha-cfg__dim-n">{Object.keys(sel[pos][c.key]).length}</span>
            </h4>
            {(catPos[c.key] || []).map((a) => {
              const on = a.k in sel[pos][c.key];
              return (
                <div key={a.k} className={'grelha-cfg__at' + (on ? ' on' : '')}>
                  <label className="grelha-cfg__at-l">
                    <input type="checkbox" checked={on} disabled={soLeitura} onChange={() => toggle(c.key, a.k, a.p)} />
                    <span>{a.l}</span>
                  </label>
                  {on && (
                    <select
                      className="grelha-cfg__peso"
                      value={sel[pos][c.key][a.k]}
                      disabled={soLeitura}
                      onChange={(e) => mudarPeso(c.key, a.k, Number(e.target.value))}
                    >
                      <option value={1}>peso 1</option>
                      <option value={2}>peso 2</option>
                      <option value={3}>peso 3</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
