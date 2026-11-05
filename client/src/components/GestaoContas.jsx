import { useState, useEffect, useCallback, Fragment } from 'react';
import { api } from '../api.js';
import { useToast } from './Toasts.jsx';
import { useAuth, PAGINAS_ACESSO, acessoPadrao } from '../auth.jsx';

// Gestor de contas (só editor/scouting). Criar, editar (nome, papel, função,
// ativo, palavra-passe) e apagar contas — faz o que os scripts da linha de
// comandos faziam, mas pela interface.
const PAPEIS_OPC = [
  { v: 'editor', l: 'Scouting' },
  { v: 'viewer', l: 'Diretor desportivo' },
  { v: 'tecnico', l: 'Equipa técnica' },
];
const VAZIO = { username: '', nome: '', funcao: '', papel: 'viewer', password: '' };

export default function GestaoContas() {
  const toast = useToast();
  const { utilizador } = useAuth();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [aCriar, setACriar] = useState(false);
  const [acessoAberto, setAcessoAberto] = useState(null); // id da conta com o painel de acessos aberto

  const carregar = useCallback(() => {
    api.get('/auth/users').then(setLista).catch((e) => toast('Erro a carregar contas: ' + e.message, 'erro'));
  }, [toast]);
  useEffect(() => { carregar(); }, [carregar]);

  const campo = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const criar = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || form.password.length < 6) {
      toast('Utilizador e palavra-passe (mín. 6 caracteres) obrigatórios.', 'erro');
      return;
    }
    setACriar(true);
    try {
      await api.post('/auth/users', form);
      setForm(VAZIO);
      toast('Conta criada.', 'ok');
      carregar();
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    } finally {
      setACriar(false);
    }
  };

  const atualizar = async (id, dados) => {
    try {
      await api.put('/auth/users/' + id, dados);
      carregar();
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
      carregar();
    }
  };

  const redefinirPass = async (u) => {
    const p = window.prompt(`Nova palavra-passe para "${u.username}" (mín. 6 caracteres):`, '');
    if (p == null) return;
    if (p.length < 6) { toast('Mínimo 6 caracteres.', 'erro'); return; }
    await atualizar(u.id, { password: p });
    toast('Palavra-passe alterada.', 'ok');
  };

  // Dá/tira o acesso a uma página. Guarda só o que diverge do padrão do papel —
  // se voltar ao padrão, remove o override (a conta volta a seguir o papel).
  const alternarAcesso = (u, key, valor) => {
    const ov = { ...(u.acessosOverride || {}) };
    if (valor === acessoPadrao(u.papel, u.funcao, key)) delete ov[key];
    else ov[key] = valor;
    atualizar(u.id, { acessos: ov });
  };

  const apagar = async (u) => {
    if (!window.confirm(`Apagar a conta "${u.username}"? Não se pode desfazer.`)) return;
    try {
      await api.del('/auth/users/' + u.id);
      toast('Conta apagada.', 'ok');
      carregar();
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  };

  return (
    <div className="contas">
      <form className="card contas-form" onSubmit={criar}>
        <h3 className="contas-form__titulo">Nova conta</h3>
        <div className="contas-form__grid">
          <label className="campo">
            <span>Utilizador *</span>
            <input value={form.username} onChange={campo('username')} placeholder="ex.: joao" />
          </label>
          <label className="campo">
            <span>Nome</span>
            <input value={form.nome} onChange={campo('nome')} placeholder="Nome a mostrar" />
          </label>
          <label className="campo">
            <span>Palavra-passe *</span>
            <input value={form.password} onChange={campo('password')} placeholder="mín. 6 caracteres" />
          </label>
          <label className="campo">
            <span>Papel</span>
            <select value={form.papel} onChange={campo('papel')}>
              {PAPEIS_OPC.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
          </label>
          <label className="campo">
            <span>Função (opcional)</span>
            <input value={form.funcao} onChange={campo('funcao')} placeholder="ex.: Treinador principal, Scout" />
          </label>
        </div>
        <button className="btn" disabled={aCriar}>{aCriar ? 'A criar…' : 'Criar conta'}</button>
        <p className="contas-nota">
          O papel define o acesso. A <b>função</b> é o rótulo que aparece nas avaliações do plantel
          (ex.: um "Equipa técnica" com função "Treinador principal" é o treinador).
        </p>
      </form>

      <div className="tabela-wrap">
        <table className="contas-tabela">
          <thead>
            <tr>
              <th>Utilizador</th>
              <th>Nome</th>
              <th>Papel</th>
              <th>Função</th>
              <th className="c">Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan={6} className="tabela-vazia">Sem contas.</td></tr>
            ) : (
              lista.map((u) => {
                const eu = String(u.id) === String(utilizador?.id);
                const editor = u.papel === 'editor';
                const aberto = acessoAberto === u.id;
                return (
                  <Fragment key={u.id}>
                  <tr>
                    <td className="mono">{u.username}{eu && <span className="contas-eu"> (tu)</span>}</td>
                    <td>
                      <input defaultValue={u.nome} onBlur={(e) => e.target.value !== u.nome && atualizar(u.id, { nome: e.target.value })} />
                    </td>
                    <td>
                      <select value={u.papel} disabled={eu} onChange={(e) => atualizar(u.id, { papel: e.target.value })}>
                        {PAPEIS_OPC.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
                      </select>
                    </td>
                    <td>
                      <input defaultValue={u.funcao || ''} placeholder="—" onBlur={(e) => e.target.value !== (u.funcao || '') && atualizar(u.id, { funcao: e.target.value })} />
                    </td>
                    <td className="c">
                      <input type="checkbox" checked={u.ativo} disabled={eu} onChange={(e) => atualizar(u.id, { ativo: e.target.checked })} />
                    </td>
                    <td className="contas-acoes">
                      {!editor && (
                        <button type="button" className={'btn btn--secundario btn--pequeno' + (aberto ? ' ativo' : '')} onClick={() => setAcessoAberto(aberto ? null : u.id)}>
                          Acessos
                        </button>
                      )}
                      <button type="button" className="btn btn--secundario btn--pequeno" onClick={() => redefinirPass(u)}>
                        Palavra-passe
                      </button>
                      {!eu && (
                        <button type="button" className="btn btn--perigo btn--pequeno" onClick={() => apagar(u)}>
                          Apagar
                        </button>
                      )}
                    </td>
                  </tr>
                  {aberto && !editor && (
                    <tr className="contas-acessos-linha">
                      <td colSpan={6}>
                        <div className="contas-acessos">
                          <div className="contas-acessos__titulo">
                            Páginas que <b>{u.nome || u.username}</b> pode abrir
                          </div>
                          <div className="contas-acessos__grelha">
                            {PAGINAS_ACESSO.map((p) => {
                              const ligado = u.acessos?.[p.key] !== false;
                              const padrao = acessoPadrao(u.papel, u.funcao, p.key);
                              const alterado = ligado !== padrao;
                              return (
                                <label key={p.key} className={'contas-acessos__item' + (ligado ? ' on' : '') + (alterado ? ' alterado' : '')}>
                                  <input
                                    type="checkbox"
                                    checked={ligado}
                                    onChange={(e) => alternarAcesso(u, p.key, e.target.checked)}
                                  />
                                  <span>{p.label}</span>
                                </label>
                              );
                            })}
                          </div>
                          <p className="contas-acessos__nota">
                            A verde está marcado o que esta conta já via por omissão. Desmarca para
                            esconder a página; marca para dar acesso. A Página inicial está sempre disponível.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
