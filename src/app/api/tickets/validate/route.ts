import { NextResponse } from "next/server";

import { decideAccess } from "@/server/auth/access";
import { consumeLimit } from "@/server/auth/rate-limit";
import { prismaRateLimitStore } from "@/server/auth/rate-limit-store";
import { getSession } from "@/server/auth/session";
import { sameOrigin } from "@/server/auth/origin";
import { writeAudit } from "@/server/audit";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { readTicketToken } from "@/server/orders/qr";

export async function POST(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), env.APP_URL)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const session = await getSession();
  if (!session || decideAccess("/api/tickets/validate", session.role) !== "allow") {
    return NextResponse.json({ error: "No autorizado" }, { status: session ? 403 : 401 });
  }
  const limit = await consumeLimit(
    prismaRateLimitStore(),
    `validate:${session.userId}`,
    60,
    60 * 1000,
    new Date(),
  );
  if (!limit.allowed) {
    return NextResponse.json({ result: "rate-limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    eventId?: unknown;
    token?: unknown;
  } | null;
  if (!body || typeof body.eventId !== "string" || typeof body.token !== "string") {
    return NextResponse.json({ result: "invalid" }, { status: 400 });
  }
  const ticketId = readTicketToken(body.token.trim(), env.QR_SECRET);
  if (!ticketId) return NextResponse.json({ result: "invalid" });

  const usedAt = new Date();
  const updated = await db.ticket.updateMany({
    where: { id: ticketId, eventId: body.eventId, status: "VALIDO" },
    data: { status: "USADO", usedAt, usedById: session.userId },
  });
  if (updated.count === 1) {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: { ticketType: true },
    });
    await writeAudit({
      userId: session.userId,
      action: "ticket.used",
      entity: "Ticket",
      entityId: ticketId,
      metadata: { eventId: body.eventId },
    });
    return NextResponse.json({
      result: "valid",
      ticketType: ticket?.ticketType.name ?? "Entrada",
      shortCode: ticket?.shortCode ?? "",
    });
  }

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ result: "invalid" });
  if (ticket.eventId !== body.eventId)
    return NextResponse.json({ result: "wrong-event" });
  if (ticket.status === "USADO") {
    return NextResponse.json({
      result: "used",
      usedAt: ticket.usedAt?.toISOString() ?? null,
    });
  }
  if (ticket.status === "ANULADO") return NextResponse.json({ result: "void" });
  return NextResponse.json({ result: "invalid" });
}
