# Plataforma de Scouting

Aplicação web local (MERN) para gerir o departamento de scouting de um clube de futebol:
base de dados de jogadores, observações, avaliação por grelha, recrutamento (11-sombra),
planeamento do plantel, agenda/competições e relatórios imprimíveis. Substitui a folha de
Excel; todos os dados são introduzidos manualmente pelo utilizador.

> O nome do clube é **configurável** (ver *Configuração*): esta é uma plataforma genérica,
> reutilizável por qualquer clube.

## Stack
- **MongoDB** 8.x (local, `localhost:27017`, base `scouting`)
- **Express** + **Mongoose** (API REST — pasta `server/`)
- **React** + **Vite** + **React Router** (interface — pasta `client/`)
- Interface em português.

## Pré-requisitos
- Node.js 18+ (testado com v24)
- MongoDB a correr localmente na porta 27017

## Instalação (primeira vez)
```bash
npm run install:all          # raiz + server + client
cp server/.env.example server/.env   # e edita os valores (ver Configuração)
cp client/.env.example client/.env   # opcional (nome do clube na interface)
npm run seed                 # opcional: popula a base com jogadores de exemplo
```

## Uso diário
No Windows, **duplo clique em `Scouting.bat`** — constrói a interface na primeira vez,
arranca o servidor e abre o navegador. Para fechar, fecha a janela.

Equivalente por linha de comandos:
```bash
npm run build   # só depois de alterar código do cliente
npm start       # arranca em http://localhost:4000
```
Em produção o servidor serve a interface e a API **na mesma porta** (um só processo).

## Desenvolvimento
```bash
npm run dev   # API (:4000) + Vite com recarregamento automático (:5173)
```
Em desenvolvimento usa-se **http://localhost:5173** (o Vite faz proxy de `/api` para a API).

## Configuração

`server/.env` (ver `server/.env.example`):
```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/scouting
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=<segredo aleatório para assinar as sessões>
JWT_EXPIRA=7d
IMPORT_API_KEY=<chave para integrações externas>
CLUBE_PROPRIO=FC Exemplo          # nome do clube próprio (deteção nas classificações/calendário)
```

`client/.env` (ver `client/.env.example`):
```
VITE_CLUBE=FC Exemplo             # nome do clube mostrado na interface (barra lateral e login)
```

O **clube próprio** é usado em dois sítios funcionais: para se destacar nas tabelas de
classificação e no calendário (não é um alvo de scouting), e para o título da interface.
Define o mesmo nome em `CLUBE_PROPRIO` e `VITE_CLUBE`.

## Contas e acesso
Toda a plataforma está protegida por início de sessão. Papéis:
- **editor** — scouting: acesso total (lê e altera tudo).
- **viewer** — consulta; qualquer alteração é bloqueada no servidor (exceto sugestões).
- **tecnico** — equipa técnica: subconjunto de acesso; o acesso por página é configurável por conta.

Criar/atualizar contas (a palavra-passe fica sempre encriptada):
```bash
cd server
node src/criarUtilizador.js <username> <password> <editor|viewer|tecnico> "Nome a mostrar"
```
Dentro da aplicação, um editor gere contas e acessos em **Definições → Gestor de contas**.

> **Integrações externas** sem sessão enviam a `IMPORT_API_KEY` no cabeçalho `x-scouting-key`
> e agem como editor. Em produção (atrás de HTTPS), define `NODE_ENV=production` para o cookie
> de sessão só viajar encriptado.

## Módulos
1. **Base de dados** — jogadores, filtros e pesquisa; ficha com bio, classificação e histórico de observações.
2. **Observações** — registo de jogos com avaliação por grelha de atributos (posição-específica); o rating do jogador é a média das observações.
3. **Recrutamento** — 11-sombra (shadow team), lista por posição e comparação; relatório de mercado imprimível.
4. **Planeamento** — plantel e estrutura por posição (esta época / próxima época).
5. **Agenda & Competições** — plano semanal, jogos vistos, calendário e classificações.
6. **Ligas & Clubes / Contactos** — catálogo de ligas/clubes e contactos de agentes.
7. **Home** — KPIs e cobertura por posição.

## Avaliação
Cada observação é avaliada numa grelha de atributos por posição; as dimensões (Técnica,
Tática, Física, Mental) geram um **rating ponderado (1–5, nível de liga)** calculado
automaticamente (`server/src/constants.js` → `calcularRatingFinal`). O jogador tem ainda
uma classificação de perfil: **Rendimento**, **Potencial**, **Perfil** e um **Veredito**
(decisão de recrutamento).
