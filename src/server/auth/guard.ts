import { redirect } from "next/navigation";

import { rolesForArea, type Area, type Role } from "./access";
import { getSession, type CurrentSession } from "./session";

export async function requireRoles(roles: readonly Role[]): Promise<CurrentSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!roles.includes(session.role)) redirect("/acceso-denegado");
  return session;
}

export async function requireArea(area: Area): Promise<CurrentSession> {
  return requireRoles(rolesForArea(area));
}
