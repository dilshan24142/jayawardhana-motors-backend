import type { RequestHandler } from "express";
import { env } from "../config/env";

export interface AuthUser {
  id: string;
  role: string;
  permissions: string[];
}

// TEMPORARY until JM-07 (Member 2) replaces this with Firebase ID-token verification:
// in development and test every request runs as an Owner with all permissions, so other
// members can build and test their routes now. Production refuses to start with this stub.
if (env.NODE_ENV === "production") {
  throw new Error(
    "authenticate.ts is still the development stub. Implement JM-07 before deploying.",
  );
}

const DEV_USER: AuthUser = { id: "dev-owner", role: "Owner", permissions: ["*"] };

export const authenticate: RequestHandler = (req, _res, next) => {
  req.user = DEV_USER;
  next();
};
