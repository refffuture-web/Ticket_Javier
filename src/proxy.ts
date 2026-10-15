import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { decideAccess } from "@/server/auth/access";
import { readSessionByToken, SESSION_COOKIE } from "@/server/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (decideAccess(pathname, null) === "allow") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const { session, clearCookie } = await readSessionByToken(token, new Date());
  const decision = decideAccess(pathname, session?.role ?? null);
  if (decision === "allow") {
    return NextResponse.next();
  }

  const response = deniedResponse(request, decision);
  if (clearCookie) {
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

function deniedResponse(request: NextRequest, decision: "login" | "forbidden") {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: decision === "login" ? 401 : 403 },
    );
  }
  if (decision === "login") {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(new URL("/acceso-denegado", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/boleteria/:path*", "/validar/:path*", "/api/:path*"],
};
