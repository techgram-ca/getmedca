export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code: string = "bad_request",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "not_found");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "forbidden");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "unauthorized");
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Cannot move order from '${from}' to '${to}'`, 409, "invalid_transition");
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(message, 429, "rate_limited");
  }
}

export function toErrorResponse(err: unknown): { status: number; body: { error: string; code: string } } {
  if (err instanceof AppError) {
    return { status: err.status, body: { error: err.message, code: err.code } };
  }
  console.error(err);
  return { status: 500, body: { error: "Something went wrong", code: "internal" } };
}
