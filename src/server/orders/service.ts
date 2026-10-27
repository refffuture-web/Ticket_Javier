import { Prisma } from "@prisma/client";

import { lineTotalCents, sumCents } from "@/lib/money";
import { writeAudit } from "@/server/audit";
import { db } from "@/server/db";
import { env } from "@/server/env";

import { randomShortCode, signShareToken, signTicket } from "./qr";
import { RESERVATION_MS, type SaleLineInput, selectedLines } from "./rules";
import {
  confirmReservedSeats,
  releaseReservedSeats,
  reserveSeats,
  returnSoldSeat,
  takeSoldSeats,
} from "./stock";

type Tx = Prisma.TransactionClient;

export type IssuedTicket = {
  id: string;
  shortCode: string;
  token: string;
  ticketTypeName: string;
};

const noStock = "No queda cupo para completar la compra.";

export async function createPendingOrder(input: {
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  lines: SaleLineInput[];
  now: Date;
}): Promise<{ orderId: string } | { error: string }> {
  const chosen = selectedLines(input.lines, input.now);
  try {
    const orderId = await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          eventId: input.eventId,
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          buyerPhone: input.buyerPhone,
          origin: "ONLINE",
          paymentMethod: "MERCADO_PAGO",
          status: "PENDIENTE",
          totalCents: sumCents(
            chosen.map((line) => lineTotalCents(line.priceCents, line.quantity)),
          ),
          expiresAt: new Date(input.now.getTime() + RESERVATION_MS),
        },
      });
      for (const line of chosen) {
        const reserved = await reserveSeats(
          tx,
          line.ticketTypeId,
          input.eventId,
          line.quantity,
        );
        if (!reserved) throw new Error(noStock);
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            ticketTypeId: line.ticketTypeId,
            quantity: line.quantity,
            unitPriceCents: line.priceCents,
          },
        });
      }
      return order.id;
    });
    return { orderId };
  } catch (error) {
    if (error instanceof Error && error.message === noStock) return { error: noStock };
    console.error("No se pudo reservar el cupo");
    return { error: "No se pudo iniciar la compra." };
  }
}

export async function createPaidOrder(input: {
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  lines: SaleLineInput[];
  now: Date;
  origin: "BOLETERIA" | "CORTESIA";
  paymentMethod: "EFECTIVO" | "TRANSFERENCIA" | "CORTESIA";
  createdById: string;
  ip: string;
}): Promise<{ orderId: string; tickets: IssuedTicket[] } | { error: string }> {
  const courtesy = input.origin === "CORTESIA";
  const chosen = selectedLines(input.lines, input.now).map((line) =>
    courtesy ? { ...line, priceCents: 0 } : line,
  );
  let result: { orderId: string; tickets: IssuedTicket[] };
  try {
    result = await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          eventId: input.eventId,
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          buyerPhone: input.buyerPhone,
          origin: input.origin,
          paymentMethod: input.paymentMethod,
          status: "PAGADA",
          totalCents: courtesy
            ? 0
            : sumCents(
                chosen.map((line) => lineTotalCents(line.priceCents, line.quantity)),
              ),
          createdById: input.createdById,
        },
      });
      const items = [];
      for (const line of chosen) {
        const taken = await takeSoldSeats(
          tx,
          line.ticketTypeId,
          input.eventId,
          line.quantity,
        );
        if (!taken) throw new Error(noStock);
        const item = await tx.orderItem.create({
          data: {
            orderId: order.id,
            ticketTypeId: line.ticketTypeId,
            quantity: line.quantity,
            unitPriceCents: line.priceCents,
          },
        });
        items.push({ ...item, ticketTypeName: line.name });
      }
      const tickets = await issueTickets(tx, order.id, input.eventId, items);
      return { orderId: order.id, tickets };
    });
  } catch (error) {
    if (error instanceof Error && error.message === noStock) return { error: noStock };
    console.error("No se pudo emitir la venta manual");
    return { error: "No se pudo emitir la venta." };
  }
  await writeAudit({
    userId: input.createdById,
    action: courtesy ? "order.courtesy" : "order.boxoffice",
    entity: "Order",
    entityId: result.orderId,
    ip: input.ip,
  });
  return result;
}

export async function cancelPendingOrder(orderId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.status !== "PENDIENTE") return;
    const changed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDIENTE" },
      data: { status: "CANCELADA" },
    });
    if (changed.count !== 1) return;
    for (const item of order.items) {
      await releaseReservedSeats(tx, item.ticketTypeId, item.quantity);
    }
  });
}

export async function expireDueOrders(now: Date): Promise<number> {
  const due = await db.order.findMany({
    where: { status: "PENDIENTE", expiresAt: { lt: now } },
    select: { id: true },
  });
  let expired = 0;
  for (const order of due) {
    const did = await db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
      if (
        !current ||
        current.status !== "PENDIENTE" ||
        !current.expiresAt ||
        current.expiresAt >= now
      ) {
        return false;
      }
      const changed = await tx.order.updateMany({
        where: { id: current.id, status: "PENDIENTE" },
        data: { status: "EXPIRADA" },
      });
      if (changed.count !== 1) return false;
      for (const item of current.items) {
        await releaseReservedSeats(tx, item.ticketTypeId, item.quantity);
      }
      return true;
    });
    if (did) expired += 1;
  }
  return expired;
}

export async function markOrderPaid(
  orderId: string,
  mpPaymentId: string,
): Promise<"paid" | "already" | "missing" | "mismatch"> {
  const existing = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { ticketType: true } }, event: true, tickets: true },
  });
  if (!existing) return "missing";
  if (existing.status === "PAGADA") return "already";
  if (existing.status !== "PENDIENTE") return "mismatch";

  try {
    const result = await db.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: orderId, status: "PENDIENTE" },
        data: { status: "PAGADA", mpPaymentId },
      });
      if (changed.count !== 1) return "already" as const;
      for (const item of existing.items) {
        const confirmed = await confirmReservedSeats(
          tx,
          item.ticketTypeId,
          item.quantity,
        );
        if (!confirmed) throw new Error("reserva");
      }
      await issueTickets(
        tx,
        orderId,
        existing.eventId,
        existing.items.map((item) => ({
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
          ticketTypeName: item.ticketType.name,
        })),
      );
      return "paid" as const;
    });
    return result;
  } catch (error) {
    console.error("No se pudo confirmar el pago");
    if (error instanceof Error && error.message === "reserva") return "mismatch";
    return "mismatch";
  }
}

export async function voidTicket(input: {
  ticketId: string;
  reason: string;
  userId: string;
  ip: string;
}): Promise<{ error: string } | { ok: true }> {
  const ticket = await db.ticket.findUnique({ where: { id: input.ticketId } });
  if (!ticket) return { error: "La entrada no existe." };
  if (ticket.status === "ANULADO") return { error: "La entrada ya está anulada." };
  if (ticket.status === "USADO")
    return { error: "No se puede anular una entrada ya usada." };
  const changed = await db.ticket.updateMany({
    where: { id: ticket.id, status: "VALIDO" },
    data: { status: "ANULADO", voidReason: input.reason, voidedAt: new Date() },
  });
  if (changed.count !== 1) return { error: "No se pudo anular la entrada." };
  await db.$transaction(async (tx) => {
    await returnSoldSeat(tx, ticket.ticketTypeId);
  });
  await writeAudit({
    userId: input.userId,
    action: "ticket.void",
    entity: "Ticket",
    entityId: ticket.id,
    metadata: { reason: input.reason },
    ip: input.ip,
  });
  return { ok: true };
}

export async function refundOrder(input: {
  orderId: string;
  userId: string | null;
  ip: string | null;
}): Promise<{ error: string } | { ok: true }> {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    include: { tickets: true },
  });
  if (!order) return { error: "La orden no existe." };
  if (order.status !== "PAGADA") return { error: "Solo se reembolsan órdenes pagas." };
  const changed = await db.order.updateMany({
    where: { id: order.id, status: "PAGADA" },
    data: { status: "REEMBOLSADA" },
  });
  if (changed.count !== 1) return { error: "La orden ya no está paga." };
  for (const ticket of order.tickets) {
    if (ticket.status !== "VALIDO") continue;
    const voided = await db.ticket.updateMany({
      where: { id: ticket.id, status: "VALIDO" },
      data: {
        status: "ANULADO",
        voidReason: "Reembolso de la orden",
        voidedAt: new Date(),
      },
    });
    if (voided.count === 1) {
      await db.$transaction(async (tx) => {
        await returnSoldSeat(tx, ticket.ticketTypeId);
      });
    }
  }
  await writeAudit({
    userId: input.userId,
    action: "order.refund",
    entity: "Order",
    entityId: order.id,
    metadata: { note: "El dinero se devuelve a mano en Mercado Pago." },
    ip: input.ip,
  });
  return { ok: true };
}

export function ticketToken(ticketId: string): string {
  return signTicket(ticketId, env.QR_SECRET);
}

export function ticketShareUrl(ticketId: string): string {
  return `${env.APP_URL}/entrada/${signShareToken(ticketId, env.QR_SECRET)}`;
}

async function issueTickets(
  tx: Tx,
  orderId: string,
  eventId: string,
  items: { ticketTypeId: string; quantity: number; ticketTypeName: string }[],
): Promise<IssuedTicket[]> {
  const issued: IssuedTicket[] = [];
  for (const item of items) {
    for (let index = 0; index < item.quantity; index += 1) {
      const ticket = await createUniqueTicket(tx, {
        orderId,
        eventId,
        ticketTypeId: item.ticketTypeId,
      });
      issued.push({
        id: ticket.id,
        shortCode: ticket.shortCode,
        token: signTicket(ticket.id, env.QR_SECRET),
        ticketTypeName: item.ticketTypeName,
      });
    }
  }
  return issued;
}

async function createUniqueTicket(
  tx: Tx,
  data: { orderId: string; eventId: string; ticketTypeId: string },
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await tx.ticket.create({
        data: { ...data, shortCode: randomShortCode() },
      });
    } catch (error) {
      if (!isUniqueConflict(error) || attempt === 4) throw error;
    }
  }
  throw new Error("No se pudo generar el código de la entrada");
}

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
