# Scouting Platform

A local web application (MERN) for running a football club's scouting department: player
database, match observations, attribute-grid evaluation, recruitment with a shadow team,
squad planning, fixtures and competitions, and printable reports. All data is entered
manually by the user.

> The club name is **configurable** (see *Configuration*), so nothing here is tied to one
> club's name — but see *Project status* below before considering using it.

## Project status

This is a working tool, used daily by one person — its author — in one club. It is
published so that the approach and the code can be read, **not** as software that is ready
to be installed and used by someone else.

Concretely, before anyone considers running it:

- **One club, one dataset.** A single MongoDB database and a single club, set by
  environment variable. There is no separation between clubs or between users' data.
- **Built around one workflow.** Positions, the four evaluation dimensions and the 1–5
  league-level scale are fixed in the code. The attribute grid inside them is configurable;
  the structure above them is not.
- **Local only.** It runs on `localhost` over plain HTTP. No hosting, no HTTPS, and no
  backup automation beyond a manual script.
- **No migration path.** There is no way to import an existing player database.
- **Portuguese interface**, with no translation layer.
- **One user means untested paths.** Any bug someone else hits will be a new one.
- **No licence.** This repository contains no LICENSE file, so no permission to use, copy
  or modify the code is granted. Ask first.

Reading the code, the evaluation model or the attribute grid, and arguing with any of it,
is welcome — open an issue.

## Stack
- **MongoDB** 8.x (local, `localhost:27017`, database `scouting`)
- **Express** + **Mongoose** (REST API, `server/` folder)
- **React** + **Vite** + **React Router** (interface, `client/` folder)
- Interface and code are in Portuguese.

## Requirements
- Node.js 18+ (tested on v24)
- MongoDB running locally on port 27017

## Install (first time)
```bash
npm run install:all                  # root + server + client
cp server/.env.example server/.env   # then edit the values (see Configuration)
cp client/.env.example client/.env   # optional (club name shown in the interface)
npm run build                        # required: the built interface is not in the repo
npm run seed                         # example players + a demo account to log in with
```

`npm run build` is not optional on a fresh clone: `client/dist/` is not versioned, so
without it `npm start` serves the API with no interface behind it.

The whole platform is behind a login, so run the seed on a fresh install: it creates a
demo editor account, **`demo` / `demo1234`**. It is there so the platform can be opened
straight after install. Delete it or change the password before any real use.

## Daily use
On Windows, **double-click `Scouting.bat`**. It builds the interface the first time,
starts the server and opens the browser. Close the window to stop it.

Command line equivalent:
```bash
npm run build   # on a fresh clone, and after changing client code
npm start       # runs on http://localhost:4000
```
In production the server serves both the interface and the API **on the same port**, as a
single process.

## Development
```bash
npm run dev   # API (:4000) + Vite with hot reload (:5173)
```
In development use **http://localhost:5173** (Vite proxies `/api` to the API).

## Configuration

`server/.env` (see `server/.env.example`):
```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/scouting
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=<random secret used to sign sessions>
JWT_EXPIRA=7d
IMPORT_API_KEY=<key for external integrations>
CLUBE_PROPRIO=FC Exemplo          # your own club, detected in standings and fixtures
```

`client/.env` (see `client/.env.example`):
```
VITE_CLUBE=FC Exemplo             # club name shown in the interface (sidebar and login)
```

Your own club is used in three places: the interface title and login screen, the detection
that highlights it in standings and fixtures (where it is not a scouting target), and the
header and footer of every printable report. Set the same name in `CLUBE_PROPRIO` and
`VITE_CLUBE`: the server uses the first, the interface the second.

## Accounts and access
The whole platform sits behind a login. Roles:
- **editor** (scouting): full access, reads and changes everything.
- **viewer**: read only; any change is blocked on the server, except suggestions.
- **tecnico** (coaching staff): a subset of access; page-level access is configurable per account.

`npm run seed` creates a demo editor account (`demo` / `demo1234`) so a fresh install can
be opened immediately. It is for local use only: delete it or change its password before
running this for real.

Create or update accounts (passwords are always stored encrypted):
```bash
cd server
node src/criarUtilizador.js <username> <password> <editor|viewer|tecnico> "Display name"
```
Inside the application, an editor manages accounts and access in **Definições → Gestor de
contas**.

> **External integrations** without a session send `IMPORT_API_KEY` in the `x-scouting-key`
> header and act as editor. In production, behind HTTPS, set `NODE_ENV=production` so the
> session cookie only travels encrypted.

## Modules
1. **Database**: players, filters and search; profile with bio, classification and observation history.
2. **Observations**: match records evaluated on a position-specific attribute grid; a player's rating is the mean of his observations.
3. **Recruitment**: shadow team, per-position lists and comparison; printable market report.
4. **Planning**: squad and structure by position, for the current season and the next.
5. **Schedule and competitions**: weekly plan, matches watched, fixtures and standings.
6. **Leagues, clubs and contacts**: catalogue of leagues and clubs, and agent contacts.
7. **Home**: KPIs and coverage by position.

## Evaluation
Each observation is scored on a position-specific attribute grid. The four dimensions
(Technical, Tactical, Physical, Mental) produce a weighted rating on a **1 to 5 league
level scale**, calculated automatically in `server/src/constants.js` →
`calcularRatingFinal`. Each player also carries a profile classification: **Rendimento**
(current level), **Potencial** (projected ceiling), **Perfil**, and a **Veredito**
(recruitment decision).
