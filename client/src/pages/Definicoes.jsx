import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toasts.jsx';
import GestaoContas from '../components/GestaoContas.jsx';

// Página de Definições: gestor de contas + cópias de segurança (só scouting) e
// o Manual (todos). Acede-se pelo ⚙ no rodapé da barra.
export default function Definicoes() {
  const { podeEditar } = useAuth();
  const toast = useToast();
  const [info, setInfo] = useState(null);
  const [aRestaurar, setARestaurar] = useState(false);
  const inputFicheiro = useRef(null);

  useEffect(() => {
    if (podeEditar) api.get('/export/backup-info').then(setInfo).catch(() => {});
  }, [podeEditar]);
  const backupAntigo = info && (info.diasDesdeManual == null || info.diasDesdeManual >= 7);

  const aoEscolherFicheiro = async (e) => {
    const ficheiro = e.target.files?.[0];
    e.target.value = '';
    if (!ficheiro) return;
    let backup;
    try {
      backup = JSON.parse(await ficheiro.text());
    } catch {
      toast('Ficheiro inválido — não é um backup JSON.', 'erro');
      return;
    }
    const n = backup.players?.length ?? 0;
    if (
      !window.confirm(
        `Restaurar vai SUBSTITUIR todos os dados atuais pelos do ficheiro (${n} jogador(es)). ` +
          `Isto não se pode desfazer facilmente.\n\nContinuar?`
      )
    )
      return;
    setARestaurar(true);
    try {
      await api.post('/export/import', backup);
      toast('Base restaurada. A recarregar…', 'ok');
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      toast('Erro no restauro: ' + err.message, 'erro');
      setARestaurar(false);
    }
  };

  return (
    <div className="def-pagina">
      <div className="pagina-cabecalho">
        <div>
          <h2>Definições</h2>
        </div>
      </div>

      {podeEditar && (
        <section className="card def-sec">
          <h3 className="def-sec__tit">Cópias de segurança</h3>
          {backupAntigo && (
            <div className="def-aviso">
              ⚠{' '}
              {info.diasDesdeManual == null
                ? 'Ainda não descarregaste nenhuma cópia manual.'
                : `Sem cópia manual há ${info.diasDesdeManual} dias.`}
            </div>
          )}
          <p className="def-sec__sub">
            Os dados são insubstituíveis — descarrega uma cópia com regularidade.
          </p>
          <div className="linha-acoes">
            <a className="btn btn--secundario" href="/api/export/backup.json">
              ⬇ Backup da base
            </a>
            <button
              type="button"
              className="btn btn--secundario"
              onClick={() => inputFicheiro.current?.click()}
              disabled={aRestaurar}
            >
              {aRestaurar ? '… a restaurar' : '↺ Restaurar cópia'}
            </button>
            <input
              ref={inputFicheiro}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={aoEscolherFicheiro}
            />
          </div>
        </section>
      )}

      {podeEditar && (
        <section className="def-sec">
          <h3 className="def-sec__tit">Gestor de contas</h3>
          <GestaoContas />
        </section>
      )}

      <section className="card def-sec">
        <h3 className="def-sec__tit">Manual</h3>
        <p className="def-sec__sub">Como usar a plataforma e o que significa cada valor.</p>
        <Link to="/manual" className="btn btn--secundario">
          Abrir o manual →
        </Link>
      </section>
    </div>
  );
}
