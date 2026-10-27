import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";

import { IssuedTicketCard } from "@/components/issued-ticket-card";
import { PublicHeader } from "@/components/public-header";
import { env } from "@/server/env";
import { db } from "@/server/db";
import { readShareToken } from "@/server/orders/qr";
import { ticketShareUrl, ticketToken } from "@/server/orders/service";

export const instant = false;

export default function SharedTicketPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <>
      <PublicHeader />
      <Suspense
        fallback={<p className="px-4 text-sm text-muted-foreground">Cargando entrada…</p>}
      >
        <SharedTicket params={params} />
      </Suspense>
    </>
  );
}

async function SharedTicket({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const ticketId = readShareToken(decodeURIComponent(token), env.QR_SECRET);
  if (!ticketId) notFound();

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      ticketType: true,
      event: true,
      order: {
        include: {
          items: true,
          tickets: { select: { id: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!ticket || ticket.order.status !== "PAGADA") notFound();

  const unitPriceCents =
    ticket.order.items.find((item) => item.ticketTypeId === ticket.ticketTypeId)
      ?.unitPriceCents ?? ticket.ticketType.priceCents;
  const qr =
    ticket.status === "VALIDO"
      ? await QRCode.toDataURL(ticketToken(ticket.id), { margin: 1, width: 220 })
      : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-16">
      <ul className="flex flex-col gap-5">
        <IssuedTicketCard
          eventTitle={ticket.event.title}
          startsAt={ticket.event.startsAt}
          venue={ticket.event.venue}
          ticketTypeName={ticket.ticketType.name}
          unitPriceCents={unitPriceCents}
          shortCode={ticket.shortCode}
          status={ticket.status}
          buyerName={ticket.order.buyerName}
          buyerEmail=""
          buyerPhone=""
          paymentMethod={ticket.order.paymentMethod}
          qrDataUrl={qr}
          shareUrl={ticketShareUrl(ticket.id)}
          index={ticket.order.tickets.findIndex((item) => item.id === ticket.id) + 1}
          total={ticket.order.tickets.length}
          showActions={ticket.status === "VALIDO"}
        />
      </ul>
      <Link href="/" className="text-sm underline-offset-4 hover:underline">
        Ver otros eventos
      </Link>
    </main>
  );
}
