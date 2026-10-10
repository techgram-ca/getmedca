import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@getmed/db/proxy";

// Password recovery has to be reachable while signed out — that is the whole
// point of it. Leaving these off sent anyone clicking "Forgot your password?"
// to /login, which is where they had just come from.
// Rate cards are marketing: a pharmacy that has never heard of GetMed has to
// be able to open one from a link or a search result without signing in.
const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/confirm", "/delivery-rates", "/api/auth"];

function hasAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")));
  // Public pages for anonymous visitors never touch Supabase (fast + config-independent).
  if (isPublic && !hasAuthCookie(request)) return NextResponse.next({ request });

  const { response, userId, role } = await updateSession(request);
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
