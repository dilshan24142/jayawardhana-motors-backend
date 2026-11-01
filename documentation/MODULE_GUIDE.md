# How to Build a Backend Module

Every business area (parties, vehicles, sales, payments, ...) is a folder in `backend/src/modules/`.
Each module has the same five files. Copy the example below and rename it.

```
src/modules/parties/
├── parties.schemas.ts     zod schemas for request input
├── parties.repository.ts  SQL only
├── parties.service.ts     business rules and transactions
├── parties.controller.ts  reads the request, calls the service, sends the response
├── parties.routes.ts      URLs + middleware
└── parties.test.ts        tests (or put them in backend/tests/)
```

| Layer | Does | Never does |
|---|---|---|
| routes | Wires URL → middleware → controller | Business logic |
| controller | Reads `req`, calls the service, sends JSON | SQL |
| service | Business rules, transactions, throws `AppError` | Touches `req` / `res` |
| repository | Parameterized SQL (`$1, $2`), maps rows to camelCase | Business rules |

## Example: parties (buyers and sellers)

This shows the pattern. JM-15 builds the full version.

### `parties.schemas.ts`

```ts
import { z } from "zod";
import { listQuerySchema } from "../../utils/pagination";

export const partyType = z.enum(["buyer", "seller", "provider"]);

export const createPartySchema = z.object({
  type: partyType,
  fullName: z.string().trim().min(2).max(120),
  nic: z.string().regex(/^(\d{9}[VvXx]|\d{12})$/, "Use an old (9 digits + V) or new (12 digits) NIC"),
  phone: z.string().regex(/^0\d{9}$/, "Use a 10-digit phone number, e.g. 0771234567"),
  address: z.string().max(255).optional(),
});

export const listPartiesSchema = listQuerySchema.extend({ type: partyType.optional() });
export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type ListPartiesQuery = z.infer<typeof listPartiesSchema>;
```

### `parties.repository.ts`

```ts
import type { PoolClient } from "pg";
import { query } from "../../config/database";
import { offsetOf } from "../../utils/pagination";
import type { CreatePartyInput, ListPartiesQuery } from "./parties.schemas";

const columns = `id, type, full_name AS "fullName", nic, phone, address, created_at AS "createdAt"`;

export async function insertParty(input: CreatePartyInput, client?: PoolClient) {
  const { rows } = await query(
    `INSERT INTO parties (type, full_name, nic, phone, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${columns}`,
    [input.type, input.fullName, input.nic.toUpperCase(), input.phone, input.address ?? null],
    client,
  );
  return rows[0];
}

export async function findPartyById(id: number) {
  const { rows } = await query(`SELECT ${columns} FROM parties WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listParties(q: ListPartiesQuery) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (q.type) {
    params.push(q.type);
    where.push(`type = $${params.length}`);
  }
  if (q.q) {
    params.push(`%${q.q}%`);
    where.push(`(full_name ILIKE $${params.length} OR nic ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = await query<{ count: string }>(`SELECT count(*) FROM parties ${whereSql}`, params);
  params.push(q.pageSize, offsetOf(q));
  const { rows } = await query(
    `SELECT ${columns} FROM parties ${whereSql}
     ORDER BY created_at ${q.order === "asc" ? "ASC" : "DESC"}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total: Number(total.rows[0].count) };
}
```

Never build SQL by gluing user input into the string. Values always go in `params`. Only fixed words you control (like `ASC`/`DESC`) may be inserted directly.

### `parties.service.ts`

```ts
import { notFound } from "../../utils/AppError";
import { paginated } from "../../utils/pagination";
import * as repo from "./parties.repository";
import type { CreatePartyInput, ListPartiesQuery } from "./parties.schemas";

export async function createParty(input: CreatePartyInput) {
  // A duplicate NIC hits the UNIQUE constraint; the error handler turns that into 409 DUPLICATE.
  return repo.insertParty(input);
}

export async function getParty(id: number) {
  const party = await repo.findPartyById(id);
  if (!party) throw notFound("Party");
  return party;
}

export async function listParties(q: ListPartiesQuery) {
  const { rows, total } = await repo.listParties(q);
  return paginated(rows, total, q);
}
```

### `parties.controller.ts`

```ts
import type { Request, Response } from "express";
import * as service from "./parties.service";
import type { ListPartiesQuery } from "./parties.schemas";

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.createParty(req.body) });
}

export async function getById(req: Request, res: Response) {
  res.json({ data: await service.getParty(Number(req.params.id)) });
}

export async function list(req: Request, res: Response) {
  res.json(await service.listParties(req.query as unknown as ListPartiesQuery));
}
```

Express 5 passes errors from `async` handlers to the error handler automatically, so there is no need for try/catch here.

### `parties.routes.ts`

```ts
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import * as controller from "./parties.controller";
import { createPartySchema, idParamSchema, listPartiesSchema } from "./parties.schemas";

export const partiesRouter = Router();

partiesRouter.use(authenticate);

partiesRouter.get("/", authorize("parties:read"), validate({ query: listPartiesSchema }), controller.list);
partiesRouter.get("/:id", authorize("parties:read"), validate({ params: idParamSchema }), controller.getById);
partiesRouter.post("/", authorize("parties:write"), validate({ body: createPartySchema }), controller.create);
```

Then mount it in `src/routes.ts`:

```ts
apiRouter.use("/parties", partiesRouter);
```

## Transactions

Any change that writes more than one row, or reads then writes, goes in a transaction:

```ts
import { withTransaction } from "../../config/database";

export async function sellBike(input: CreateSaleInput) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      "SELECT id, status FROM acquisition_cycles WHERE id = $1 FOR UPDATE",
      [input.acquisitionCycleId],
    );
    if (rows[0]?.status !== "ready_for_sale") {
      throw conflict("VEHICLE_NOT_AVAILABLE", "This bike is not available for sale");
    }
    // insert sale, update cycle status ... all with `client`
  });
}
```

If anything inside throws, everything is rolled back.

## Errors

Throw helpers from `src/utils/AppError.ts`. The client always receives `{ "error": { "code", "message", "details"? } }`.

| Helper | Status | Use when |
|---|---|---|
| `badRequest(code, msg)` | 400 | Input is wrong in a way zod can't catch |
| `unauthorized()` | 401 | Not signed in |
| `forbidden()` | 403 | Signed in but not allowed |
| `notFound("Vehicle")` | 404 | Record doesn't exist |
| `conflict(code, msg)` | 409 | State clash: already sold, open cycle exists |
| `unprocessable(code, msg)` | 422 | Business rule broken: expense on a sold bike |

Zod errors become `400 VALIDATION_ERROR` and PostgreSQL unique violations become `409 DUPLICATE` automatically.

## Money and dates

- Money columns are `NUMERIC(12,2)`. `pg` returns them as **strings** (`"125000.00"`). Keep them as strings in JSON.
- Never add money with JS numbers (`0.1 + 0.2 !== 0.3`). Do the maths in SQL (`SUM`, `+`) or with a decimal library.
- Accept money in requests as strings: `z.string().regex(/^\d+(\.\d{1,2})?$/)`.
- Timestamps are `timestamptz`. The database session runs in UTC; the frontend shows Asia/Colombo time.

## Tests

Put tests in `backend/tests/` (or next to the module as `*.test.ts`). See `tests/middleware.test.ts` for examples using `supertest`. Run `npm test` before opening a PR. CI runs the same checks.
