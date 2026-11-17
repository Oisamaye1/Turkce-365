import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authSecret, readSession } from "@/lib/auth-cookie";

/**
 * Every page needs a signed session cookie. The server then checks the account itself
 * (active, not signed out everywhere, admin for /admin). Also passes the path on to layouts.
 */
export async function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  const ok = await readSession(authSecret(), req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next({ request: { headers } });
  if (req.nextUrl.pathname.startsWith("/api/")) return new NextResponse("unauthorized", { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = req.nextUrl.pathname === "/" ? "" : `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|signup|api/cron|api/health|api/worker|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)"],
};
