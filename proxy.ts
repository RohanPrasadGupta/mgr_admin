import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only (cookie presence). Every API call is authorised by the API itself.
export function proxy(req: NextRequest) {
  const signedIn = req.cookies.has("mma_rt");
  const onLogin = req.nextUrl.pathname === "/login";
  if (!signedIn && !onLogin) return NextResponse.redirect(new URL("/login", req.url));
  if (signedIn && onLogin) return NextResponse.redirect(new URL("/", req.url));
  const res = NextResponse.next();
  res.headers.set("x-robots-tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"] };
