import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError, z } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

// PostgreSQL error codes we translate into client errors.
const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_CHECK_VIOLATION = "23514";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `No route for ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const send = (status: number, code: string, message: string, details?: unknown) =>
    res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });

  if (err instanceof AppError) {
    return send(err.status, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return send(400, "VALIDATION_ERROR", "Some fields are missing or invalid", z.flattenError(err));
  }

  // Malformed JSON body from express.json()
  if (err?.type === "entity.parse.failed") {
    return send(400, "INVALID_JSON", "Request body is not valid JSON");
  }
  if (err?.type === "entity.too.large") {
    return send(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  switch (err?.code) {
    case PG_UNIQUE_VIOLATION:
      return send(409, "DUPLICATE", "A record with these details already exists", {
        constraint: err.constraint,
      });
    case PG_FOREIGN_KEY_VIOLATION:
      return send(409, "REFERENCE_CONFLICT", "A related record is missing or still in use", {
        constraint: err.constraint,
      });
    case PG_CHECK_VIOLATION:
      return send(422, "RULE_VIOLATION", "A value breaks a database rule", {
        constraint: err.constraint,
      });
  }

  console.error(err);
  return send(
    500,
    "INTERNAL_ERROR",
    env.NODE_ENV === "production" ? "Something went wrong" : String(err?.message ?? err),
  );
};
