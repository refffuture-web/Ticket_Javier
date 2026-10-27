import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { ArtistsCarousel } from "@/components/artists-carousel";
import { EventCountdown } from "@/components/event-countdown";
import { EventGallery } from "@/components/event-gallery";
import { OrganizerContactSection } from "@/components/organizer-contact-section";
import { PublicHeader } from "@/components/public-header";
import { mediaUrl } from "@/lib/media-url";
import { formatArs } from "@/lib/money";
import { formatShortDate, formatTime } from "@/lib/time";
import { db } from "@/server/db";

export const instant = false;

export default function Home() {
  return (
    <>
      <PublicHeader />
      <Suspense
        fallback={
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            Cargando eventos…
          </p>
        }
      >
        <Catalog />
      </Suspense>
      <OrganizerContactSection />
    </>
  );
}

async function Catalog() {
  await connection();
  const now = new Date();

  const events = await db.event.findMany({
    where: { status: "PUBLICADO" },
    orderBy: { startsAt: "asc" },
    include: {
      ticketTypes: {
        where: { active: true },
        select: { priceCents: true },
      },
      gallery: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { imageKey: true },
      },
      lineup: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          photoKey: true,
          sortOrder: true,
        },
      },
    },
  });

  // Próximos primero por fecha; los pasados al final (igual cronológico).
  const upcoming = events.filter((event) => event.startsAt.getTime() >= now.getTime());
  const past = events.filter((event) => event.startsAt.getTime() < now.getTime());
  const ordered = [...upcoming, ...past];

  const artists = ordered.flatMap((event) =>
    event.lineup.map((artist) => ({
      id: artist.id,
      name: artist.name,
      photoSrc: mediaUrl(artist.photoKey),
      eventSlug: event.slug,
      eventTitle: event.title,
    })),
  );

  if (ordered.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <p className="text-sm text-muted-foreground">No hay eventos publicados.</p>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col">
      {artists.length > 0 ? (
        <div className="border-b border-black/10 bg-white px-5 py-10 sm:px-8 sm:py-12">
          <div className="mx-auto w-full max-w-6xl">
            <ArtistsCarousel artists={artists} />
          </div>
        </div>
      ) : null}

      <div className="bg-black px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-6xl text-white">
          <p className="text-xs font-semibold tracking-[0.2em] text-green-400 uppercase">
            Cartelera
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Eventos</h2>
        </div>
      </div>

      {ordered.map((event, index) => (
        <EventBlock
          key={event.id}
          event={event}
          featured={index === 0}
          upcoming={event.startsAt.getTime() >= now.getTime()}
        />
      ))}
    </main>
  );
}

type BannerEvent = {
  id: string;
  slug: string;
  title: string;
  venue: string;
  startsAt: Date;
  coverImageKey: string | null;
  ticketTypes: { priceCents: number }[];
  gallery: { imageKey: string }[];
};

/** Banner del evento y, si hay fotos propias, su galería. */
function EventBlock({
  event,
  featured = false,
  upcoming = false,
}: {
  event: BannerEvent;
  featured?: boolean;
  upcoming?: boolean;
}) {
  const galleryImages = event.gallery.map((photo) => ({
    src: mediaUrl(photo.imageKey)!,
    alt: `Foto de ${event.title}`,
  }));

  return (
    <section className="flex w-full flex-col border-b border-black/10 last:border-b-0">
      <EventBanner event={event} featured={featured} upcoming={upcoming} />
      {galleryImages.length > 0 ? (
        <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
          <EventGallery images={galleryImages} />
        </div>
      ) : null}
    </section>
  );
}

function EventBanner({
  event,
  featured = false,
  upcoming = false,
}: {
  event: BannerEvent;
  featured?: boolean;
  upcoming?: boolean;
}) {
  const prices = event.ticketTypes.map((type) => type.priceCents);
  const from = prices.length > 0 ? Math.min(...prices) : null;
  const height = featured
    ? "min-h-[32rem] sm:min-h-[34rem] lg:min-h-[38rem]"
    : "min-h-[24rem] sm:min-h-[26rem]";

  return (
    <div className="relative w-full overflow-hidden">
      <div className={`relative flex flex-col justify-end ${height}`}>
        {event.coverImageKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(event.coverImageKey)!}
            alt=""
            loading={featured ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-800" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col justify-end gap-6 px-5 pt-24 pb-8 sm:px-10 sm:pb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="flex max-w-2xl flex-col gap-3 text-white">
            {featured || !upcoming ? (
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${
                  upcoming
                    ? "bg-green-500 text-black"
                    : "bg-white/15 text-white ring-1 ring-white/25"
                }`}
              >
                {upcoming ? "Próximo" : "Finalizado"}
              </span>
            ) : null}
            <h2
              className={`font-bold tracking-tight text-balance ${featured ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl lg:text-4xl"}`}
            >
              {event.title}
            </h2>
            <p className="text-sm text-white/85 sm:text-base">
              <span className="font-medium">{formatShortDate(event.startsAt)}</span>
              <span className="mx-2 text-white/40">·</span>
              <span>{formatTime(event.startsAt)}</span>
              <span className="mx-2 text-white/40">·</span>
              <span>{event.venue}</span>
            </p>
          </div>

          <div className="w-full max-w-sm shrink-0 rounded-2xl bg-black p-5 shadow-2xl ring-1 ring-white/10 sm:w-80">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs tracking-[0.16em] text-green-300 uppercase">
                  Desde
                </span>
                <span className="text-3xl font-bold tracking-tight text-white">
                  {from === null ? "—" : formatArs(from)}
                </span>
              </div>
              {upcoming ? (
                <EventCountdown
                  startsAt={event.startsAt.toISOString()}
                  variant="hero"
                  surface="dark"
                />
              ) : null}
              <Link
                href={`/eventos/${event.slug}`}
                className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl bg-green-700 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300 active:translate-y-px"
              >
                {upcoming ? "Comprar entradas" : "Ver evento"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
