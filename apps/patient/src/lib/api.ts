import { NextResponse } from "next/server";
import { toErrorResponse } from "@getmed/core/errors";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/** Wrap a route handler: AppError → typed JSON error, anything else → 500 without leaking details. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      const { status, body } = toErrorResponse(err);
      return NextResponse.json(body, { status });
    }
  };
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}
