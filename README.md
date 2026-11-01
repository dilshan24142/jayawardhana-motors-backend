# Backend Back Office

Backend for the Back Office project, built with **Node.js**.

> **Status:** Scaffold only. The folder structure is in place, and every file is intentionally empty. No APIs, database connections, authentication or middleware logic have been implemented yet.

## Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── firebase.js
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── authorize.js
│   │   ├── validate.js
│   │   └── errorHandler.js
│   ├── modules/
│   │   ├── users/
│   │   ├── parties/
│   │   ├── vehicles/
│   │   ├── acquisitions/
│   │   ├── expenses/
│   │   ├── sales/
│   │   ├── payments/
│   │   ├── receipts/
│   │   ├── documents/
│   │   ├── reminders/
│   │   └── reports/
│   ├── jobs/
│   │   └── expiryScheduler.js
│   ├── app.js
│   └── server.js
├── migrations/
├── tests/
├── .env
├── .env.example
└── package.json
```

## What Each Part Is For

| Path | Intended purpose |
| --- | --- |
| `src/config/` | Configuration for external services (`database.js`, `firebase.js`) |
| `src/middleware/` | Request pipeline: authentication, authorization, validation and error handling |
| `src/modules/` | One folder per business domain (users, parties, vehicles, acquisitions, expenses, sales, payments, receipts, documents, reminders, reports) |
| `src/jobs/` | Scheduled background jobs (`expiryScheduler.js`) |
| `src/app.js` | Application setup |
| `src/server.js` | Server entry point |
| `migrations/` | Database migrations |
| `tests/` | Automated tests |
| `.env` | Local environment variables (do not commit) |
| `.env.example` | Template listing the environment variables the app needs |
| `package.json` | Project metadata and dependencies |

## Getting Started

Nothing is runnable yet. Implementation is expected to proceed in roughly this order:

1. Fill in `package.json` and install dependencies.
2. Define environment variables in `.env.example`, then copy it to `.env`.
3. Implement `config/`, `app.js` and `server.js`.
4. Implement `middleware/`.
5. Build each module under `src/modules/`.
6. Add migrations, jobs and tests.

## Notes

- Git does not track empty folders. Before committing, add a `.gitkeep` (or real files) to `modules/*`, `migrations/` and `tests/`.
- Keep `.env` out of version control by adding it to `.gitignore`.
