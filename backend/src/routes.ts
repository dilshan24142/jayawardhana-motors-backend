import { Router } from "express";
import { healthRouter } from "./modules/health/health.routes";

/** Every module router is mounted here under /api/v1. */
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);

// Add module routers as they are built, for example:
// apiRouter.use("/parties", partiesRouter);           // JM-15
// apiRouter.use("/vehicles", vehiclesRouter);         // JM-16
// apiRouter.use("/acquisition-cycles", acquisitionsRouter); // JM-17
