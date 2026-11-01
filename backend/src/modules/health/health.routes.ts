import { Router } from "express";
import { query } from "../../config/database";
import { AppError } from "../../utils/AppError";

export const healthRouter = Router();

// GET /api/v1/health: the API process is up. No auth, no database.
healthRouter.get("/", (_req, res) => {
  res.json({ data: { status: "ok", uptimeSeconds: Math.round(process.uptime()) } });
});

// GET /api/v1/health/db: the API can reach PostgreSQL.
healthRouter.get("/db", async (_req, res) => {
  try {
    const result = await query<{ now: Date; version: string }>(
      "SELECT now() AS now, current_setting('server_version') AS version",
    );
    const { now, version } = result.rows[0];
    res.json({ data: { status: "ok", database: "connected", serverTime: now, version } });
  } catch (error) {
    throw new AppError(503, "DATABASE_UNAVAILABLE", "Cannot reach the database", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }
});
