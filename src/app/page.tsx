import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { PublicHeader } from "@/components/public-header";
import { formatArs } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { db } from "@/server/db";

export const instant = false;

export default function Home() {
  return (
    <>
      <PublicHeader />
      <Suspense
        fallback={
          <p className="mx-auto w-full max-w-3xl px-4 text-sm text-muted-foreground">
            Cargando eventos…
          </p>
        }
      >
        <Catalog />
      </Suspense>
    </>
  );
}

async function Catalog() {
  await connection();
  const events = await db.event.findMany({
    where: { status: "PUBLICADO" },
    orderBy: { startsAt: "asc" },
    include: {
      ticketTypes: {
        where: { active: true },
        select: { priceCents: true },
      },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Próximos eventos</h1>
        <p className="text-sm text-muted-foreground">
          Elegí un evento para ver la grilla y comprar entradas.
        </p>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay eventos publicados.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => {
            const prices = event.ticketTypes.map((type) => type.priceCents);
            const from = prices.length > 0 ? Math.min(...prices) : null;
            return (
              <li key={event.id}>
                <Link
                  href={`/eventos/${event.slug}`}
                  className="flex flex-col gap-3 rounded-lg border p-4 hover:bg-muted/40 sm:flex-row"
                >
                  {event.coverImageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/media/${event.coverImageKey}`}
                      alt=""
                      className="h-36 w-full rounded-md object-cover sm:w-48"
                    />
                  ) : null}
                  <span className="flex flex-col gap-1">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(event.startsAt)} · {event.venue}
                    </span>
                    <span className="text-sm">
                      {from === null
                        ? "Sin entradas activas"
                        : `Desde ${formatArs(from)}`}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
