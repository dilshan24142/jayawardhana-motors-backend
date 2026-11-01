import type { RequestHandler } from "express";
import type { ZodType } from "zod";

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

/**
 * Validate and coerce request input with zod. Invalid input becomes a 400 VALIDATION_ERROR.
 * After this runs, req.body / req.query / req.params hold the parsed values.
 *
 *   router.post("/", validate({ body: createVehicleSchema }), controller.create);
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) {
      // Express 5 exposes req.query as a getter, so redefine it with the parsed value.
      Object.defineProperty(req, "query", {
        value: schemas.query.parse(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };
