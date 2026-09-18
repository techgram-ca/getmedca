import { NextResponse } from "next/server";
import { toErrorResponse } from "@getmed/core/errors";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

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
