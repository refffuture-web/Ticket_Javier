import { NextResponse } from "next/server";

import { decideAccess } from "@/server/auth/access";
import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const { id } = await context.params;
  const path = `/api/events/${id}/attendance`;
  if (!session || decideAccess(path, session.role) !== "allow") {
    return NextResponse.json({ error: "No autorizado" }, { status: session ? 403 : 401 });
  }
  const [valid, used, voided] = await Promise.all([
    db.ticket.count({ where: { eventId: id, status: "VALIDO" } }),
    db.ticket.count({ where: { eventId: id, status: "USADO" } }),
    db.ticket.count({ where: { eventId: id, status: "ANULADO" } }),
  ]);
  return NextResponse.json({ valid, used, void: voided });
}
