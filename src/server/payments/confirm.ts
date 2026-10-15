import { db } from "@/server/db";
import { env } from "@/server/env";
import { sendTicketEmail } from "@/server/mail/send-tickets";
import { cancelPendingOrder, markOrderPaid, refundOrder } from "@/server/orders/service";

import { fetchPayment } from "./mercadopago";

export async function confirmFromMercadoPago(paymentId: string): Promise<void> {
  if (!env.MP_ACCESS_TOKEN) return;
  const payment = await fetchPayment(env.MP_ACCESS_TOKEN, paymentId);
  if (!payment?.externalReference) return;
  const order = await db.order.findUnique({ where: { id: payment.externalReference } });
  if (!order) return;

  if (payment.status === "approved") {
    if (payment.amountCents !== null && payment.amountCents !== order.totalCents) return;
    const result = await markOrderPaid(order.id, payment.id);
    if (result !== "paid") return;
    const [tickets, event] = await Promise.all([
      db.ticket.findMany({ where: { orderId: order.id } }),
      db.event.findUnique({ where: { id: order.eventId } }),
    ]);
    if (!event) return;
    try {
      await sendTicketEmail({
        to: order.buyerEmail,
        eventTitle: event.title,
        orderId: order.id,
        shortCodes: tickets.map((ticket) => ticket.shortCode),
      });
    } catch (error) {
      console.error("No se pudo enviar el email de entradas", error);
    }
    return;
  }

  if (payment.status === "rejected" || payment.status === "cancelled") {
    await cancelPendingOrder(order.id);
    return;
  }

  if (payment.status === "refunded") {
    await refundOrder({ orderId: order.id, userId: null, ip: null });
  }
}
