import { Suspense } from "react";
import Link from "next/link";

import { SaleForm } from "@/app/boleteria/sale-form";
import { formatArs } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { requireArea } from "@/server/auth/guard";
import { db } from "@/server/db";

export const instant = false;

export default function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <SalesHome searchParams={searchParams} />
    </Suspense>
  );
}

async function SalesHome({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  await requireArea("admin");
  const { evento } = await searchParams;

  const events = await db.event.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      orders: { where: { status: "PAGADA" }, select: { totalCents: true } },
      tickets: { select: { status: true } },
      ticketTypes: {
        where: { active: true },
        orderBy: { priceCents: "asc" },
      },
    },
  });
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { event: true },
    ...(evento ? { where: { eventId: evento } } : {}),
  });

  const selected = events.find((event) => event.id === evento) ?? null;
  const canSell = selected?.status === "PUBLICADO";

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Por evento</h2>
        <p className="text-sm text-muted-foreground">
          Elegí un evento publicado para vender en boletería (efectivo, transferencia o
          cortesía), igual que el rol Boletería.
        </p>
        <ul className="flex flex-col divide-y divide-border rounded-lg border text-sm">
          {events.map((event) => {
            const revenue = event.orders.reduce(
              (sum, order) => sum + order.totalCents,
              0,
            );
            const used = event.tickets.filter(
              (ticket) => ticket.status === "USADO",
            ).length;
            const active = event.id === selected?.id;
            return (
              <li
                key={event.id}
                className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${active ? "bg-muted/40" : ""}`}
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{event.title}</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(event.startsAt)} · {event.orders.length} pagos ·{" "}
                    {formatArs(revenue)} · {used} ingresos · {event.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {event.status === "PUBLICADO" ? (
                    <Link
                      href={`/admin/ventas?evento=${event.id}`}
                      className={
                        active
                          ? "font-medium"
                          : "underline-offset-4 hover:underline"
                      }
                    >
                      {active ? "Vendiendo…" : "Vender"}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No publicado</span>
                  )}
                  <Link
                    href={`/admin/eventos/${event.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    Editar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {selected && canSell ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Vender · {selected.title}</h2>
          {selected.ticketTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este evento no tiene tipos de entrada activos.
            </p>
          ) : (
            <SaleForm
              area="admin"
              eventId={selected.id}
              tickets={selected.ticketTypes.map((type) => ({
                id: type.id,
                name: type.name,
                priceLabel: formatArs(type.priceCents),
                maxPerOrder: type.maxPerOrder,
              }))}
            />
          )}
        </section>
      ) : null}

      {selected && !canSell ? (
        <p className="text-sm text-muted-foreground">
          Publicá el evento para poder vender entradas desde acá.
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">
          Órdenes{selected ? ` · ${selected.title}` : ""}
        </h2>
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
