import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@getmed/db/proxy";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/api/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, userId, role } = await updateSession(request);

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")));
  if (isPublic) {
    if (userId && role === "pharmacy" && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (!userId || role !== "pharmacy") {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)"],
};
