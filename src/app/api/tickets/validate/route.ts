import type { ScanResult } from "@prisma/client";
import { NextResponse } from "next/server";

import { decideAccess } from "@/server/auth/access";
import { consumeLimit } from "@/server/auth/rate-limit";
import { prismaRateLimitStore } from "@/server/auth/rate-limit-store";
import { getSession } from "@/server/auth/session";
import { originAllowed } from "@/server/auth/origin";
import { writeAudit } from "@/server/audit";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { readTicketToken } from "@/server/orders/qr";

export async function POST(request: Request) {
  if (
    !originAllowed(
      request.headers.get("origin"),
      env.APP_URL,
      request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
      request.headers.get("x-forwarded-proto"),
    )
  ) {
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

  const eventId = body.eventId;
  const raw = body.token.trim();
  const [event, ticketId] = await Promise.all([
    db.event.findUnique({ where: { id: eventId }, select: { id: true } }),
    resolveTicketId(raw),
  ]);
  if (!event) return NextResponse.json({ result: "invalid" }, { status: 400 });

  const log = (result: ScanResult, scannedTicketId: string | null, code: string | null) =>
    db.ticketScan.create({
      data: { eventId, ticketId: scannedTicketId, userId: session.userId, result, code },
    });

  if (!ticketId) {
    await log("INVALIDO", null, raw.slice(0, 40) || null);
    return NextResponse.json({ result: "invalid" });
  }

  const usedAt = new Date();
  const updated = await db.ticket.updateMany({
    where: { id: ticketId, eventId, status: "VALIDO" },
    data: { status: "USADO", usedAt, usedById: session.userId },
  });
  if (updated.count === 1) {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: { ticketType: true },
    });
    const [, , remaining] = await Promise.all([
      log("VALIDO", ticketId, ticket?.shortCode ?? null),
      writeAudit({
        userId: session.userId,
        action: "ticket.used",
        entity: "Ticket",
        entityId: ticketId,
        metadata: { eventId },
      }),
      ticket
        ? db.ticket.count({ where: { ticketTypeId: ticket.ticketTypeId, status: "VALIDO" } })
        : null,
    ]);
    return NextResponse.json({
      result: "valid",
      ticketType: ticket?.ticketType.name ?? "Entrada",
      shortCode: ticket?.shortCode ?? "",
      usedAt: usedAt.toISOString(),
      remaining,
    });
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      ticketType: true,
      event: { select: { title: true } },
      usedBy: { select: { name: true } },
    },
  });
  if (!ticket) {
    await log("INVALIDO", null, raw.slice(0, 40) || null);
    return NextResponse.json({ result: "invalid" });
  }
  if (ticket.eventId !== eventId) {
    await log("OTRO_EVENTO", ticket.id, ticket.shortCode);
    return NextResponse.json({
      result: "wrong-event",
      shortCode: ticket.shortCode,
      ticketType: ticket.ticketType.name,
      eventTitle: ticket.event.title,
    });
  }
  if (ticket.status === "USADO") {
    await log("YA_USADO", ticket.id, ticket.shortCode);
    return NextResponse.json({
      result: "used",
      shortCode: ticket.shortCode,
      ticketType: ticket.ticketType.name,
      usedAt: ticket.usedAt?.toISOString() ?? null,
      usedBy: ticket.usedBy?.name ?? null,
    });
  }
  if (ticket.status === "ANULADO") {
    await log("ANULADO", ticket.id, ticket.shortCode);
    return NextResponse.json({
      result: "void",
      shortCode: ticket.shortCode,
      ticketType: ticket.ticketType.name,
    });
  }
  await log("INVALIDO", ticket.id, ticket.shortCode);
  return NextResponse.json({ result: "invalid" });
}

/** Acepta el token firmado del QR o el código corto visible en la entrada. */
async function resolveTicketId(raw: string): Promise<string | null> {
  const fromToken = readTicketToken(raw, env.QR_SECRET);
  if (fromToken) return fromToken;

  const shortCode = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (shortCode.length < 4) return null;
  const ticket = await db.ticket.findUnique({
    where: { shortCode },
    select: { id: true },
  });
  return ticket?.id ?? null;
}
