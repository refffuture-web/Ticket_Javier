import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { PrintButton } from "../print-button";
import { markOrderTicketsFisicoAction } from "@/app/boleteria/actions";
import { IssuedTicketCard } from "@/components/issued-ticket-card";
import { ShareAllTickets } from "@/components/share-all-tickets";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { ticketExportData } from "@/lib/ticket-view";
import { env } from "@/server/env";
import { requireArea } from "@/server/auth/guard";
import { db } from "@/server/db";
import { ticketShareUrl, ticketToken } from "@/server/orders/service";

export const instant = false;

export default function BoxOfficeOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string; evento?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <OrderTickets params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderTickets({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string; evento?: string }>;
}) {
  await requireArea("boleteria");
  const { id } = await params;
  const { desde, evento } = await searchParams;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      event: true,
      items: true,
      tickets: { include: { ticketType: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();
  const tickets = await Promise.all(
    order.tickets.map(async (ticket) => ({
      ...ticket,
      qr: await QRCode.toDataURL(ticketToken(ticket.id), { margin: 1, width: 220 }),
    })),
  );

  const priceByType = new Map(
    order.items.map((item) => [item.ticketTypeId, item.unitPriceCents]),
  );

  const shareAll = tickets
    .map((ticket, index) => ({ ticket, index }))
    .filter(({ ticket }) => ticket.status === "VALIDO")
    .map(({ ticket, index }) =>
      ticketExportData({
        eventTitle: order.event.title,
        startsAt: order.event.startsAt,
        venue: order.event.venue,
        ticketTypeName: ticket.ticketType.name,
        unitPriceCents: priceByType.get(ticket.ticketTypeId) ?? ticket.ticketType.priceCents,
        shortCode: ticket.shortCode,
        status: ticket.status,
        buyerName: order.buyerName,
        buyerEmail: "",
        buyerPhone: "",
        paymentMethod: order.paymentMethod,
        qrDataUrl: ticket.qr,
        index: index + 1,
        total: tickets.length,
      }),
    );

  const newSaleHref =
    desde === "admin"
      ? `/admin/ventas?evento=${evento ?? order.eventId}`
      : "/boleteria";

  return (
    <div className="flex flex-col gap-6 print:gap-8">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Orden emitida
          </p>
          <h2 className="text-xl font-semibold tracking-tight">{order.event.title}</h2>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(order.event.startsAt)} · {order.event.venue}
          </p>
          <p className="text-sm text-muted-foreground">
            {order.buyerName} · {tickets.length}{" "}
            {tickets.length === 1 ? "entrada" : "entradas"} · {formatArs(order.totalCents)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {tickets.some((t) => t.status === "VALIDO" && !t.fisico) ? (
            <form action={markOrderTicketsFisicoAction}>
              <input type="hidden" name="orderId" value={order.id} />
              {desde ? <input type="hidden" name="desde" value={desde} /> : null}
              {evento ? <input type="hidden" name="evento" value={evento} /> : null}
              <Button type="submit" variant="secondary" size="sm">
                Todas físicas
              </Button>
            </form>
          ) : null}
          <PrintButton />
        </div>
      </div>

      <ShareAllTickets tickets={shareAll} shareUrl={`${env.APP_URL}/compra/${order.id}`} />

      <ul className="flex flex-col gap-5">
        {tickets.map((ticket, index) => (
          <IssuedTicketCard
            key={ticket.id}
            eventTitle={order.event.title}
            startsAt={order.event.startsAt}
            venue={order.event.venue}
            ticketTypeName={ticket.ticketType.name}
            unitPriceCents={
              priceByType.get(ticket.ticketTypeId) ?? ticket.ticketType.priceCents
            }
            shortCode={ticket.shortCode}
            status={ticket.status}
            buyerName={order.buyerName}
            buyerEmail={order.buyerEmail}
            buyerPhone={order.buyerPhone}
            paymentMethod={order.paymentMethod}
            qrDataUrl={ticket.qr}
            shareUrl={ticketShareUrl(ticket.id)}
            index={index + 1}
            total={tickets.length}
            ticketId={ticket.id}
            orderId={order.id}
            fisico={ticket.fisico}
            fisicoContext={{
              ...(desde ? { desde } : {}),
              ...(evento ? { evento } : {}),
            }}
          />
        ))}
      </ul>

      <div className="flex flex-wrap gap-4 text-sm print:hidden">
        <Link href={newSaleHref} className="underline-offset-4 hover:underline">
          Nueva venta
        </Link>
        {desde === "admin" ? (
          <Link
            href={`/admin/ventas/${order.id}`}
            className="underline-offset-4 hover:underline"
          >
            Ver en ventas
          </Link>
        ) : null}
      </div>
    </div>
  );
}
