import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 usa proxy.ts en lugar de middleware.ts.
// La Fase 1 va a exigir sesión en estas rutas. Hoy el matcher solo deja pasar.
export function proxy(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/boleteria/:path*", "/validar/:path*", "/api/:path*"],
};
