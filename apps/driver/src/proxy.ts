import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@getmed/db/proxy";

const PUBLIC_PATHS = ["/login", "/api/auth", "/manifest.webmanifest", "/sw.js", "/offline"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, userId, role } = await updateSession(request);

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) {
    if (userId && role === "driver" && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  if (!userId || role !== "driver") {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)"],
};
