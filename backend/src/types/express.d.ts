import type { AuthUser } from "../middleware/authenticate";

declare module "express-serve-static-core" {
  interface Request {
    /** Set by the `authenticate` middleware. */
    user?: AuthUser;
  }
}
