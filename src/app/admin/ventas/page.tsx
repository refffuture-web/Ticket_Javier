import { Suspense } from "react";
import Link from "next/link";

import { formatArs } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { requireArea } from "@/server/auth/guard";
import { db } from "@/server/db";

export const instant = false;

export default function SalesPage() {
  return (
    <Suspense fallback={null}>
      <SalesHome />
    </Suspense>
  );
}

async function SalesHome() {
  await requireArea("admin");
  const events = await db.event.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      orders: { where: { status: "PAGADA" }, select: { totalCents: true } },
      tickets: { select: { status: true } },
    },
  });
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { event: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Por evento</h2>
        <ul className="flex flex-col divide-y divide-border rounded-lg border text-sm">
          {events.map((event) => {
            const revenue = event.orders.reduce(
              (sum, order) => sum + order.totalCents,
              0,
            );
            const used = event.tickets.filter(
              (ticket) => ticket.status === "USADO",
            ).length;
            return (
              <li key={event.id} className="flex flex-col gap-1 px-4 py-3">
                <p className="font-medium">{event.title}</p>
                <p className="text-muted-foreground">
                  {formatDateTime(event.startsAt)} · {event.orders.length} pagos ·{" "}
                  {formatArs(revenue)} · {used} ingresos
                </p>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Órdenes</h2>
        <ul className="flex flex-col divide-y divide-border rounded-lg border text-sm">
          {orders.map((order) => (
            <li key={order.id} className="px-4 py-3">
              <Link
                href={`/admin/ventas/${order.id}`}
                className="font-medium hover:underline"
              >
                {order.buyerName}
              </Link>
              <p className="text-muted-foreground">
                {order.event.title} · {order.status} · {order.origin} ·{" "}
                {formatArs(order.totalCents)}
              </p>
            </li>
          ))}
        </ul>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay compras.</p>
        ) : null}
      </section>
    </div>
  );
}
