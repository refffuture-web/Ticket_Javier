import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";

import { PublicHeader } from "@/components/public-header";
import { formatArs } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { db } from "@/server/db";
import { ticketToken } from "@/server/orders/service";
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
      {order.status === "PAGADA" || order.status === "REEMBOLSADA" ? (
        <ul className="flex flex-col gap-4">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="flex flex-col items-start gap-2 rounded-lg border p-4"
            >
              <p className="font-medium">
                {ticket.ticketType.name} · {ticket.shortCode}
              </p>
              <p className="text-sm text-muted-foreground">
                {ticket.status === "VALIDO"
                  ? "Vigente"
                  : ticket.status === "USADO"
                    ? "Ya ingresó"
                    : "Anulada"}
              </p>
              {ticket.status === "VALIDO" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ticket.qr}
                  alt={`QR ${ticket.shortCode}`}
                  className="h-40 w-40"
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <Link href="/" className="text-sm underline-offset-4 hover:underline">
        Volver a los eventos
      </Link>
    </main>
  );
}
