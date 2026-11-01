/**
 * An error that is safe to show to the client. Throw it from services; the error handler
 * turns it into `{ error: { code, message, details } }` with the given HTTP status.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);

export const unauthorized = (message = "Sign in to continue") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You do not have permission to do this") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (what: string) => new AppError(404, "NOT_FOUND", `${what} not found`);

export const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, details);

export const unprocessable = (code: string, message: string, details?: unknown) =>
  new AppError(422, code, message, details);
