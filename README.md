# Jayawardhana Motors Backend

REST API for the Jayawardhana Motors motorcycle inventory, refurbishment and sales system.

**Stack:** Node.js · Express 5 · TypeScript · PostgreSQL · Firebase (auth and file storage) · Vitest

- Task list and starting order: [documentation/TASKS.md](documentation/TASKS.md)
- How to build a module: [documentation/MODULE_GUIDE.md](documentation/MODULE_GUIDE.md)
- Project board: https://github.com/orgs/NSBM-GROUP-Assignments/projects/2

## Status

The foundation is in place: Express app, config, database helpers, error handling, validation, health checks, tests and CI.
Business modules (`src/modules/*`) are empty and are built by the team following the task list.

Temporary pieces that other tasks replace:

| File | Replaced by |
|---|---|
| `src/middleware/authenticate.ts` (every request runs as a dev Owner; refuses to start in production) | JM-07 |
| `src/config/firebase.ts` | JM-06 |
| `seeds/index.ts` | JM-04 |
| `migrations/` (empty) | JM-03 |

## Getting started

You need **Node.js 24** (see `.nvmrc`; 22 also works), **Git**, and **PostgreSQL** (Docker or a local install).

### 1. Clone and install

```bash
git clone https://github.com/yathushi28-lang/backend_Backoffice.git
cd backend_Backoffice
git checkout dev
cd backend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

### 2. Start a database

**Option A: Docker** (from the repo root)

```bash
docker compose up -d
```

This starts PostgreSQL on port 5432 with the user, password and databases already matching `.env.example`, plus pgAdmin on http://localhost:5050 (admin@example.com / admin).

**Option B: PostgreSQL installed on your laptop**

Open pgAdmin's Query Tool (or `psql`) as the `postgres` user and run:

```sql
CREATE USER jm_app WITH PASSWORD 'jm_app_password';
CREATE DATABASE jayawardhana_motors OWNER jm_app;
CREATE DATABASE jayawardhana_motors_test OWNER jm_app;
```

If you use a different user or password, change `DATABASE_URL` and `TEST_DATABASE_URL` in `backend/.env`.

### 3. Run

```bash
npm run migrate   # apply database migrations
npm run dev       # start the API with auto-reload
```

Check it works:

- http://localhost:4000/api/v1/health → `{"data":{"status":"ok",...}}`
- http://localhost:4000/api/v1/health/db → `"database":"connected"`

If `/health/db` returns `503 DATABASE_UNAVAILABLE`, the database isn't running or `DATABASE_URL` is wrong.

## Scripts

Run these inside `backend/`.

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with auto-reload |
| `npm test` | Run all tests once (`npm run test:watch` to keep running) |
| `npm run lint` | Check code with ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` / `npm start` | Compile to `dist/` and run the compiled API |
| `npm run migrate` | Apply new migrations (`npm run migrate:down` undoes the last one) |
| `npm run migrate:create -- add-vehicles` | Create a new SQL migration file in `migrations/` |
| `npm run seed` | Load development data |

## Project structure

```
.github/workflows/ci.yml   lint, format, typecheck, migrate, test, build on every PR
docker-compose.yml         local PostgreSQL + pgAdmin
documentation/             task list, module guide, design docs
backend/
├── src/
│   ├── app.ts             builds the Express app (helmet, CORS, JSON, routes, errors)
│   ├── server.ts          starts the server, closes the DB pool on shutdown
│   ├── routes.ts          mounts every module router under /api/v1
│   ├── config/            env (validated with zod), database pool + transactions, firebase
│   ├── middleware/        authenticate, authorize, validate, errorHandler
│   ├── modules/           one folder per business area (health is the working example)
│   ├── jobs/              scheduled jobs (reminders)
│   ├── types/             TypeScript type extensions
│   └── utils/             AppError helpers, pagination
├── migrations/            numbered SQL migrations (never edit one after it is merged)
├── seeds/                 development data
├── tests/                 Vitest + Supertest tests
└── db/init/               SQL run once when the Docker database is created
```

## API conventions

- Base path `/api/v1`. Plural, kebab-case resources: `/vehicles`, `/acquisition-cycles`.
- JSON fields are camelCase; database columns are snake_case.
- Single record: `{ "data": { ... } }`. Lists: `{ "data": [...], "meta": { "page", "pageSize", "total" } }`.
- Errors: `{ "error": { "code": "VEHICLE_ALREADY_SOLD", "message": "...", "details": {} } }`.
- Money is a string in JSON (`"125000.00"`) and `NUMERIC(12,2)` in the database.
- Sale and payment `POST` requests require an `Idempotency-Key` header.

## Working on a task

1. Pick your card on the board and move it to **DEV IN PROGRESS**.
2. `git checkout dev && git pull`, then `git checkout -b feature/JM-15-parties`.
3. Build it following [MODULE_GUIDE.md](documentation/MODULE_GUIDE.md). Add tests.
4. Run `npm run lint && npm run typecheck && npm test`.
5. Push and open a PR into `dev` titled `JM-15 Parties API`. One teammate reviews.
6. After merge, move the card to **QA In Progress**, then **Done** once it's checked.

Never commit `.env` files, Firebase service-account JSON, or database passwords.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Invalid environment variables` on start | Compare `backend/.env` with `.env.example` |
| `DATABASE_URL is not set` | You skipped `cp .env.example .env` |
| `password authentication failed for user "jm_app"` | Create the user (step 2, option B) or fix the password in `.env` |
| `database "jayawardhana_motors" does not exist` | Create the databases (step 2, option B) |
| Port 5432 already in use when running Docker | A local PostgreSQL is already running; use option B instead or stop it |
| Port 4000 already in use | Change `PORT` in `.env` |
