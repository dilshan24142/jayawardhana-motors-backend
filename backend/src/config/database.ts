import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env } from "./env";

// pg returns NUMERIC columns as strings. Keep them as strings for money; never convert to JS numbers.

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = env.NODE_ENV === "test" ? env.TEST_DATABASE_URL : env.DATABASE_URL;
    if (!connectionString) {
      const name = env.NODE_ENV === "test" ? "TEST_DATABASE_URL" : "DATABASE_URL";
      throw new Error(`${name} is not set. Add it to backend/.env (see .env.example).`);
    }
    pool = new Pool({ connectionString, max: 10 });
    pool.on("connect", (client) => {
      void client.query("SET TIME ZONE 'UTC'");
    });
  }
  return pool;
}

/** Run a parameterized query. Pass `client` to run it inside a transaction. */
export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: PoolClient,
) {
  return (client ?? getPool()).query<T>(text, params);
}

/**
 * Run `work` inside one transaction. Commits if it resolves, rolls back if it throws.
 * Use for every multi-step write (sales, payments, status changes).
 */
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
