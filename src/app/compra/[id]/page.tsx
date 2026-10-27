import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";

import { IssuedTicketCard } from "@/components/issued-ticket-card";
import { PublicHeader } from "@/components/public-header";
import { ShareAllTickets } from "@/components/share-all-tickets";
import { formatArs } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { ticketExportData } from "@/lib/ticket-view";
import { env } from "@/server/env";
import { db } from "@/server/db";
import { ticketShareUrl, ticketToken } from "@/server/orders/service";
import { confirmFromMercadoPago } from "@/server/payments/confirm";

export const instant = false;

const statusLabel = {
  PENDIENTE: "Pago pendiente",
  PAGADA: "Pago confirmado",
  CANCELADA: "Compra cancelada",
  REEMBOLSADA: "Reembolsada",
  EXPIRADA: "La reserva venció",
} as const;

export default function PurchasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment_id?: string; collection_id?: string }>;
}) {
  return (
    <>
      <PublicHeader />
      <Suspense
        fallback={<p className="px-4 text-sm text-muted-foreground">Cargando compra…</p>}
      >
        <Purchase params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Purchase({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment_id?: string; collection_id?: string }>;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const paymentId = query.payment_id ?? query.collection_id;
  if (paymentId) await confirmFromMercadoPago(paymentId).catch(() => undefined);

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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{order.event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {statusLabel[order.status]} · {formatArs(order.totalCents)} ·{" "}
          {formatDateTime(order.event.startsAt)}
        </p>
      </div>
      {order.status === "PENDIENTE" ? (
        <p className="text-sm text-muted-foreground">
          Si ya pagaste, las entradas aparecen acá cuando Mercado Pago confirma. La
          reserva dura 15 minutos.
        </p>
      ) : null}
      {order.status === "PAGADA" ? (
        <ShareAllTickets tickets={shareAll} shareUrl={`${env.APP_URL}/compra/${order.id}`} />
      ) : null}
      {order.status === "PAGADA" || order.status === "REEMBOLSADA" ? (
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
              buyerEmail=""
              buyerPhone=""
              paymentMethod={order.paymentMethod}
              qrDataUrl={ticket.status === "VALIDO" ? ticket.qr : null}
              shareUrl={ticketShareUrl(ticket.id)}
              index={index + 1}
              total={tickets.length}
              showActions={ticket.status === "VALIDO"}
            />
          ))}
        </ul>
      ) : null}
      <Link href="/" className="text-sm underline-offset-4 hover:underline">
        Volver a los eventos
      </Link>
    </main>
  );
}
