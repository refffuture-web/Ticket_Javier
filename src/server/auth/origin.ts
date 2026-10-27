export function sameOrigin(origin: string | null, appUrl: string): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

/**
 * Acepta Origin si coincide con APP_URL o con el host real del request
 * (útil en Vercel cuando APP_URL aún apunta a localhost).
 */
export function originAllowed(
  origin: string | null,
  appUrl: string,
  forwardedHost: string | null,
  forwardedProto: string | null,
): boolean {
  if (sameOrigin(origin, appUrl)) return true;
  if (!origin || !forwardedHost) return false;
  const host = forwardedHost.split(",")[0]?.trim();
  if (!host) return false;
  const proto = (forwardedProto?.split(",")[0]?.trim() || "https").toLowerCase();
  const scheme = proto === "http" ? "http" : "https";
  try {
    return new URL(origin).origin === new URL(`${scheme}://${host}`).origin;
  } catch {
    return false;
  }
}
