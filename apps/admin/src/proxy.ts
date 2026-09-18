import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@getmed/db/proxy";

const PUBLIC_PATHS = ["/login", "/api/auth"];

function hasAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  // Public pages for anonymous visitors never touch Supabase (fast + config-independent).
  if (isPublic && !hasAuthCookie(request)) return NextResponse.next({ request });

  const { response, userId, role } = await updateSession(request);
  if (isPublic) {
    if (userId && role === "admin" && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  if (!userId || role !== "admin") {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)"],
};
