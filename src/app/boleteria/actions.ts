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
  const buyer = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.email().max(200),
    })
    .safeParse({ name: formData.get("buyerName"), email: formData.get("buyerEmail") });
  const phone = normalizePhone(String(formData.get("buyerPhone") ?? ""));
  if (!buyer.success || !phone) return { error: "Revisá nombre, email y teléfono." };

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
    buyerName: buyer.data.name,
    buyerEmail: buyer.data.email,
    buyerPhone: phone,
    lines,
    now,
    origin: courtesy ? "CORTESIA" : "BOLETERIA",
    paymentMethod,
    createdById: session.userId,
    ip: context.ip,
  });
  if ("error" in created) return created;
  try {
    await sendTicketEmail({
      to: buyer.data.email,
      eventTitle: event.title,
      orderId: created.orderId,
      shortCodes: created.tickets.map((ticket) => ticket.shortCode),
    });
  } catch (error) {
    console.error("No se pudo enviar el email de la boletería", error);
  }
  revalidatePath("/");
  revalidatePath(`/eventos/${event.slug}`);
  redirect(`/boleteria/orden/${created.orderId}`);
}

function numberField(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || value.trim() === "") return 0;
  return Number(value);
}
