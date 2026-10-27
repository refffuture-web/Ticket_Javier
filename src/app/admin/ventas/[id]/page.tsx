import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { refundOrderAction, voidTicketAction } from "@/app/admin/ventas/actions";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/money";
import { requireArea } from "@/server/auth/guard";
import { db } from "@/server/db";

export const instant = false;

const notices: Record<string, string> = {
  anulada: "Entrada anulada. El cupo volvió al evento.",
  reembolso:
    "Orden marcada como reembolsada. El dinero se devuelve a mano en Mercado Pago.",
  accion: "No se pudo completar la acción.",
};

export default function OrderAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <OrderAdmin params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  await requireArea("admin");
  const { id } = await params;
  const { aviso } = await searchParams;
  const order = await db.order.findUnique({
    where: { id },
    include: { event: true, tickets: { include: { ticketType: true } } },
  });
  if (!order) notFound();
  const notice = aviso ? notices[aviso] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">{order.buyerName}</h2>
        <p className="text-sm text-muted-foreground">
          {[
            order.event.title,
            order.status,
            order.buyerEmail,
            order.buyerPhone,
            formatArs(order.totalCents),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {notice ? <p className="mt-2 text-sm">{notice}</p> : null}
      </div>
      {order.status === "PAGADA" ? (
        <form action={refundOrderAction}>
          <input type="hidden" name="orderId" value={order.id} />
          <Button type="submit" variant="destructive">
            Marcar reembolso
          </Button>
        </form>
      ) : null}
      <ul className="flex flex-col gap-3">
        {order.tickets.map((ticket) => (
          <li
            key={ticket.id}
            className="flex flex-col gap-2 rounded-lg border p-4 text-sm"
          >
            <p>
              {ticket.ticketType.name} · {ticket.shortCode} · {ticket.status}
            </p>
            {ticket.status === "VALIDO" ? (
              <form action={voidTicketAction} className="flex flex-col gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="ticketId" value={ticket.id} />
                <input
                  name="reason"
                  placeholder="Motivo"
                  className="h-10 rounded-lg border border-input px-3"
                />
                <Button type="submit" variant="outline">
                  Anular entrada
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          href={`/admin/ventas?evento=${order.eventId}`}
          className="underline-offset-4 hover:underline"
        >
          Volver a ventas del evento
        </Link>
        {(order.origin === "BOLETERIA" || order.origin === "CORTESIA") &&
        order.status === "PAGADA" ? (
          <Link
            href={`/boleteria/orden/${order.id}?desde=admin&evento=${order.eventId}`}
            className="underline-offset-4 hover:underline"
          >
            Ver QR / imprimir
          </Link>
        ) : null}
      </div>
    </div>
  );
}
