import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { authorize } from "../src/middleware/authorize";
import { errorHandler } from "../src/middleware/errorHandler";
import { validate } from "../src/middleware/validate";
import { conflict } from "../src/utils/AppError";
import { listQuerySchema } from "../src/utils/pagination";

function appWith(...handlers: express.RequestHandler[]) {
  const app = express();
  app.use(express.json());
  app.post("/t", ...handlers, (req, res) => res.json({ body: req.body, query: req.query }));
  app.use(errorHandler);
  return app;
}

describe("validate", () => {
  const body = z.object({ price: z.string().regex(/^\d+(\.\d{1,2})?$/), make: z.string().min(1) });

  it("passes parsed body and query through", async () => {
    const res = await request(appWith(validate({ body, query: listQuerySchema })))
      .post("/t?page=2")
      .send({ price: "125000.00", make: "Honda" });
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ price: "125000.00", make: "Honda" });
    expect(res.body.query).toMatchObject({ page: 2, pageSize: 20, order: "desc" });
  });

  it("rejects invalid input with VALIDATION_ERROR and field details", async () => {
    const res = await request(appWith(validate({ body })))
      .post("/t")
      .send({ price: "12.345" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(res.body.error.details.fieldErrors)).toEqual(["price", "make"]);
  });
});

describe("authorize", () => {
  const as =
    (permissions: string[]): express.RequestHandler =>
    (req, _res, next) => {
      req.user = { id: "u1", role: "Staff", permissions };
      next();
    };

  it("allows a user with the permission", async () => {
    const res = await request(appWith(as(["sales:create"]), authorize("sales:create"))).post("/t");
    expect(res.status).toBe(200);
  });

  it("returns 403 without the permission", async () => {
    const res = await request(appWith(as(["vehicles:read"]), authorize("sales:create"))).post("/t");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 when no user is signed in", async () => {
    const res = await request(appWith(authorize("sales:create"))).post("/t");
    expect(res.status).toBe(401);
  });
});

describe("errorHandler", () => {
  it("maps AppError to its status and code", async () => {
    const fail: express.RequestHandler = () => {
      throw conflict("VEHICLE_ALREADY_SOLD", "This bike has already been sold");
    };
    const res = await request(appWith(fail)).post("/t");
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "VEHICLE_ALREADY_SOLD",
      message: "This bike has already been sold",
    });
  });

  it("maps a PostgreSQL unique violation to 409 DUPLICATE", async () => {
    const fail: express.RequestHandler = () => {
      throw Object.assign(new Error("duplicate key"), {
        code: "23505",
        constraint: "parties_nic_key",
      });
    };
    const res = await request(appWith(fail)).post("/t");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE");
  });

  it("hides unexpected errors behind 500 INTERNAL_ERROR", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const fail: express.RequestHandler = async () => {
      throw new Error("boom");
    };
    const res = await request(appWith(fail)).post("/t");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
