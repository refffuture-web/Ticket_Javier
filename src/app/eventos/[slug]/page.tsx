import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { EventCountdown } from "@/components/event-countdown";
import { PublicHeader } from "@/components/public-header";
import { CheckoutForm } from "./checkout-form";
import { mediaUrl } from "@/lib/media-url";
import { formatArs } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { db } from "@/server/db";
import { expireDueOrders } from "@/server/orders/service";
import { availableSeats, publicSale, readArtistLinks } from "@/server/events/event-rules";

export const instant = false;

export default function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <>
      <PublicHeader />
      <Suspense
        fallback={
          <p className="mx-auto w-full max-w-3xl px-4 text-sm text-muted-foreground">
            Cargando evento…
          </p>
        }
      >
        <EventDetail params={params} />
      </Suspense>
    </>
  );
}

async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const now = new Date();
  await expireDueOrders(now);
  const event = await db.event.findUnique({
    where: { slug },
    include: {
      lineup: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      ticketTypes: { where: { active: true }, orderBy: { priceCents: "asc" } },
    },
  });
  if (!event || event.status !== "PUBLICADO") notFound();

  const upcoming = event.startsAt.getTime() >= now.getTime();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 pt-6 pb-16">
      {event.coverImageKey ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(event.coverImageKey)!}
          alt=""
          className="max-h-80 w-full rounded-2xl object-cover ring-1 ring-black/10"
        />
      ) : null}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-green-800 uppercase">
          {upcoming ? "En cartelera" : "Finalizado"}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
          {event.title}
        </h1>
        <p className="text-sm text-black/70">
          {formatDateTime(event.startsAt)} · {event.venue}
        </p>
        {upcoming ? (
          <EventCountdown
            startsAt={event.startsAt.toISOString()}
            variant="hero"
            surface="light"
          />
        ) : null}
        <p className="whitespace-pre-wrap text-sm text-black/80">{event.description}</p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Entradas</h2>
        {event.ticketTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay entradas a la venta.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {event.ticketTypes.map((type) => {
              const sale = publicSale({
                capacity: type.capacity,
                soldCount: type.soldCount,
                reservedCount: type.reservedCount,
                saleStartsAt: type.saleStartsAt,
                saleEndsAt: type.saleEndsAt,
                now,
              });
              const left = availableSeats(
                type.capacity,
                type.soldCount,
                type.reservedCount,
              );
              return (
                <li key={type.id} className="flex flex-col gap-1 rounded-lg border p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-medium">{type.name}</p>
                    <p>{formatArs(type.priceCents)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {saleLabel(sale, left, type)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <CheckoutForm
          eventId={event.id}
          eventTitle={event.title}
          tickets={event.ticketTypes.map((type) => ({
            id: type.id,
            name: type.name,
            priceLabel: formatArs(type.priceCents),
            maxPerOrder: type.maxPerOrder,
            onSale:
              publicSale({
                capacity: type.capacity,
                soldCount: type.soldCount,
                reservedCount: type.reservedCount,
                saleStartsAt: type.saleStartsAt,
                saleEndsAt: type.saleEndsAt,
                now,
              }) === "disponible",
          }))}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Grilla</h2>
        {event.lineup.length === 0 ? (
          <p className="text-sm text-muted-foreground">La grilla se anuncia pronto.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {event.lineup.map((artist) => {
              const links = readArtistLinks(artist.links);
              return (
                <li key={artist.id} className="flex gap-4">
                  {artist.photoKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(artist.photoKey)!}
                      alt=""
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{artist.name}</p>
                    {artist.startsAt ? (
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(artist.startsAt)}
                      </p>
                    ) : null}
                    <ArtistLinks links={links} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link
        href="/"
        className="w-fit cursor-pointer text-sm font-medium text-green-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-800"
      >
        Volver a los eventos
      </Link>
    </main>
  );
}

function saleLabel(
  sale: ReturnType<typeof publicSale>,
  left: number,
  type: { saleStartsAt: Date | null; saleEndsAt: Date | null },
): string {
  if (sale === "agotado") return "Agotado";
  if (sale === "proximamente" && type.saleStartsAt) {
    return `La venta abre el ${formatDateTime(type.saleStartsAt)}`;
  }
  if (sale === "finalizada") return "Venta cerrada";
  return left === 1 ? "Queda 1" : `Quedan ${left}`;
}

function ArtistLinks({
  links,
}: {
  links: { instagram?: string; spotify?: string; youtube?: string };
}) {
  const items = [
    links.instagram ? { href: links.instagram, label: "Instagram" } : null,
    links.spotify ? { href: links.spotify, label: "Spotify" } : null,
    links.youtube ? { href: links.youtube, label: "YouTube" } : null,
  ].filter((item) => item !== null);
  if (items.length === 0) return null;
  return (
    <p className="flex gap-3 text-sm">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="underline-offset-4 hover:underline"
          rel="noreferrer"
          target="_blank"
        >
          {item.label}
        </a>
      ))}
    </p>
  );
}
