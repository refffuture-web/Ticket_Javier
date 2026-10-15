export const ROLES = ["ADMIN", "BOLETERIA", "VALIDADOR"] as const;

export type Role = (typeof ROLES)[number];

export type Area = "admin" | "boleteria" | "validar";

export type AccessDecision = "allow" | "login" | "forbidden";

const areaRoles: Record<Area, readonly Role[]> = {
  admin: ["ADMIN"],
  boleteria: ["ADMIN", "BOLETERIA"],
  validar: ["ADMIN", "VALIDADOR"],
};

export function rolesForArea(area: Area): readonly Role[] {
  return areaRoles[area];
}

export function homeForRole(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "BOLETERIA") return "/boleteria";
  return "/validar";
}

export function areaForPath(pathname: string): Area | "public" | "admin" {
  if (pathname === "/api/health") return "public";
  if (pathname.startsWith("/api/webhooks/")) return "public";
  if (pathname.startsWith("/api/cron/")) return "public";
  if (pathname.startsWith("/api/media/")) return "public";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/boleteria" || pathname.startsWith("/boleteria/")) return "boleteria";
  if (pathname === "/validar" || pathname.startsWith("/validar/")) return "validar";
  if (pathname === "/api/tickets/validate") return "validar";
  if (/^\/api\/events\/[^/]+\/attendance$/.test(pathname)) return "validar";
  if (pathname.startsWith("/api/")) return "admin";
  return "public";
}

export function decideAccess(pathname: string, role: Role | null): AccessDecision {
  const area = areaForPath(pathname);
  if (area === "public") return "allow";
  if (!role) return "login";
  return areaRoles[area].includes(role) ? "allow" : "forbidden";
}

export function safeNextPath(next: string | null, role: Role): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return homeForRole(role);
  }
  const path = next.split("?")[0] ?? next;
  if (decideAccess(path, role) !== "allow") return homeForRole(role);
  return next;
}
