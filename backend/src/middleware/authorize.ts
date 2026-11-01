import type { RequestHandler } from "express";
import { forbidden, unauthorized } from "../utils/AppError";

/**
 * Allow the request only if the signed-in user has `permission` (or the "*" wildcard).
 * Use after `authenticate`:
 *
 *   router.post("/", authenticate, authorize("vehicles:write"), controller.create);
 *
 * JM-07 (Member 2) defines the permission names and loads them from the database.
 */
export const authorize =
  (permission: string): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    const { permissions } = req.user;
    if (!permissions.includes("*") && !permissions.includes(permission)) return next(forbidden());
    next();
  };
