"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { consumeLimit } from "@/server/auth/rate-limit";
import { prismaRateLimitStore } from "@/server/auth/rate-limit-store";
import { requestContext } from "@/server/auth/request-context";
import { db } from "@/server/db";
import { env } from "@/server/env";
import {
  createPendingOrder,
  cancelPendingOrder,
  expireDueOrders,
} from "@/server/orders/service";
import {
  normalizePhone,
  saleLinesError,
  type SaleLineInput,
} from "@/server/orders/rules";
import { createCheckoutPreference } from "@/server/payments/mercadopago";

export type CheckoutState = { error: string };

export async function startCheckoutAction(
  _state: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const context = await requestContext();
  if (!context.originOk) return { error: "No se pudo iniciar la compra." };
  const now = new Date();
  const limit = await consumeLimit(
    prismaRateLimitStore(),
    `checkout:${context.ip}`,
    10,
    15 * 60 * 1000,
    now,
  );
  if (!limit.allowed) return { error: "Demasiados intentos. Probá de nuevo más tarde." };
  if (formData.get("privacy") !== "on") {
    return { error: "Tenés que aceptar el aviso de privacidad." };
  }
  if (!env.MP_ACCESS_TOKEN) {
    return { error: "Mercado Pago no está configurado." };
  }

  const buyer = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.email().max(200),
    })
    .safeParse({
      name: formData.get("buyerName"),
      email: formData.get("buyerEmail"),
    });
  const phone = normalizePhone(String(formData.get("buyerPhone") ?? ""));
  if (!buyer.success || !phone) return { error: "Revisá nombre, email y teléfono." };

  const eventId = formData.get("eventId");
  if (typeof eventId !== "string") return { error: "El evento no existe." };
  await expireDueOrders(now);
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: { where: { active: true } } },
  });
  if (!event || event.status !== "PUBLICADO")
    return { error: "El evento no está a la venta." };

  const lines: SaleLineInput[] = event.ticketTypes.map((type) => {
    const raw = formData.get(`qty_${type.id}`);
    const quantity = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : 0;
    return {
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
      quantity,
    };
  });
  const problem = saleLinesError(lines, now);
  if (problem) return { error: problem };

  const created = await createPendingOrder({
    eventId: event.id,
    buyerName: buyer.data.name,
    buyerEmail: buyer.data.email,
    buyerPhone: phone,
    lines,
    now,
  });
  if ("error" in created) return created;

  try {
    const preference = await createCheckoutPreference({
      accessToken: env.MP_ACCESS_TOKEN,
      orderId: created.orderId,
      appUrl: env.APP_URL,
      items: lines
        .filter((line) => line.quantity > 0)
        .map((line) => ({
          title: `${event.title} — ${line.name}`,
          quantity: line.quantity,
          unitPriceCents: line.priceCents,
        })),
    });
    redirect(preference.url);
  } catch (error) {
    if (isRedirect(error)) throw error;
    await cancelPendingOrder(created.orderId);
    return { error: "No se pudo abrir Mercado Pago. El cupo fue liberado." };
  }
}

function isRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
