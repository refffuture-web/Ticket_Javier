"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireArea } from "@/server/auth/guard";
import { requestContext } from "@/server/auth/request-context";
import { db } from "@/server/db";
import { sendTicketEmail } from "@/server/mail/send-tickets";
import { createPaidOrder, expireDueOrders } from "@/server/orders/service";
import {
  normalizePhone,
  saleLinesError,
  type SaleLineInput,
} from "@/server/orders/rules";

export type SaleState = { error: string };

export async function sellAtBoxOfficeAction(
  _state: SaleState,
  formData: FormData,
): Promise<SaleState> {
  const session = await requireArea("boleteria");
  const context = await requestContext();
  if (!context.originOk) return { error: "No se pudo completar la venta." };
  const courtesy = formData.get("courtesy") === "on";
  const method = formData.get("paymentMethod");
  if (!courtesy && method !== "EFECTIVO" && method !== "TRANSFERENCIA") {
    return { error: "Elegí efectivo o transferencia." };
  }
  const rawName = String(formData.get("buyerName") ?? "").trim();
  const rawEmail = String(formData.get("buyerEmail") ?? "").trim();
  const rawPhone = String(formData.get("buyerPhone") ?? "").trim();
  if (rawName.length > 80) return { error: "El nombre es demasiado largo." };
  if (rawEmail && !z.email().max(200).safeParse(rawEmail).success) {
    return { error: "El email no es válido." };
  }
  const phone = rawPhone ? normalizePhone(rawPhone) : "";
  if (phone === null) return { error: "El teléfono no es válido." };
  const buyer = {
    name: rawName || "Público general",
    email: rawEmail,
  };

  const eventId = formData.get("eventId");
  if (typeof eventId !== "string") return { error: "Elegí un evento." };
  const now = new Date();
  await expireDueOrders(now);
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: { where: { active: true } } },
  });
  if (!event || event.status !== "PUBLICADO")
    return { error: "El evento no está a la venta." };

  const lines: SaleLineInput[] = event.ticketTypes.map((type) => ({
    ticketTypeId: type.id,
    name: type.name,
    priceCents: type.priceCents,
    capacity: type.capacity,
    soldCount: type.soldCount,
    reservedCount: type.reservedCount,
    maxPerOrder: type.maxPerOrder,
    active: type.active,
    saleStartsAt: type.saleStartsAt,
    saleEndsAt: type.saleEndsAt,
    quantity: numberField(formData.get(`qty_${type.id}`)),
  }));
  const problem = saleLinesError(lines, now);
  if (problem) return { error: problem };

  const paymentMethod = courtesy
    ? "CORTESIA"
    : method === "TRANSFERENCIA"
      ? "TRANSFERENCIA"
      : "EFECTIVO";
  const created = await createPaidOrder({
    eventId,
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    buyerPhone: phone,
    lines,
    now,
    origin: courtesy ? "CORTESIA" : "BOLETERIA",
    paymentMethod,
    createdById: session.userId,
    ip: context.ip,
  });
  if ("error" in created) return created;
  if (buyer.email) {
    try {
      await sendTicketEmail({
        to: buyer.email,
        eventTitle: event.title,
        orderId: created.orderId,
        shortCodes: created.tickets.map((ticket) => ticket.shortCode),
      });
    } catch (error) {
      console.error("No se pudo enviar el email de la boletería", error);
    }
  }
  revalidatePath("/");
  revalidatePath(`/eventos/${event.slug}`);
  revalidatePath("/admin/ventas");
  const saleArea = formData.get("saleArea");
  const orderPath =
    saleArea === "admin"
      ? `/boleteria/orden/${created.orderId}?desde=admin&evento=${eventId}`
      : `/boleteria/orden/${created.orderId}`;
  redirect(orderPath);
}

function numberField(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || value.trim() === "") return 0;
  return Number(value);
}

/**
 * Marca una entrada para impresión física (térmica vía resto-kds).
 * `fisico=true` → el otro agente la imprime y puede bajarla a false.
 */
export async function markTicketFisicoAction(formData: FormData): Promise<void> {
  await requireArea("boleteria");
  const context = await requestContext();
  const ticketId = formData.get("ticketId");
  const orderId = formData.get("orderId");
  const desde = formData.get("desde");
  const evento = formData.get("evento");
  if (!context.originOk || typeof ticketId !== "string" || typeof orderId !== "string") {
    return;
  }

  await db.ticket.updateMany({
    where: { id: ticketId, orderId, status: "VALIDO" },
    data: { fisico: true },
  });

  revalidatePath(`/boleteria/orden/${orderId}`);
  revalidatePath(`/admin/ventas/${orderId}`);
  redirect(orderReturnPath(orderId, desde, evento));
}

/** Marca todas las entradas válidas de la orden para impresión física. */
export async function markOrderTicketsFisicoAction(formData: FormData): Promise<void> {
  await requireArea("boleteria");
  const context = await requestContext();
  const orderId = formData.get("orderId");
  const desde = formData.get("desde");
  const evento = formData.get("evento");
  if (!context.originOk || typeof orderId !== "string") return;

  await db.ticket.updateMany({
    where: { orderId, status: "VALIDO" },
    data: { fisico: true },
  });

  revalidatePath(`/boleteria/orden/${orderId}`);
  revalidatePath(`/admin/ventas/${orderId}`);
  redirect(orderReturnPath(orderId, desde, evento));
}

function orderReturnPath(
  orderId: string,
  desde: FormDataEntryValue | null,
  evento: FormDataEntryValue | null,
): string {
  if (desde === "admin") {
    const eventQs =
      typeof evento === "string" && evento.length > 0 ? `&evento=${evento}` : "";
    return `/boleteria/orden/${orderId}?desde=admin${eventQs}`;
  }
  return `/boleteria/orden/${orderId}`;
}
