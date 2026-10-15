import { Suspense } from "react";
import Link from "next/link";

import { formatArs } from "@/lib/money";
import { requireArea } from "@/server/auth/guard";
import { db } from "@/server/db";

import { SaleForm } from "./sale-form";

export const instant = false;

export default function BoleteriaPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <BoleteriaHome searchParams={searchParams} />
    </Suspense>
  );
}

async function BoleteriaHome({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  await requireArea("boleteria");
  const { evento } = await searchParams;
  const events = await db.event.findMany({
    where: { status: "PUBLICADO" },
    orderBy: { startsAt: "asc" },
    include: { ticketTypes: { where: { active: true }, orderBy: { priceCents: "asc" } } },
  });
  const selected = events.find((event) => event.id === evento) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Evento</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay eventos publicados.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/boleteria?evento=${event.id}`}
                  className={
                    event.id === selected?.id
                      ? "font-medium"
                      : "underline-offset-4 hover:underline"
                  }
                >
                  {event.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {selected ? (
        <SaleForm
          eventId={selected.id}
          tickets={selected.ticketTypes.map((type) => ({
            id: type.id,
            name: type.name,
            priceLabel: formatArs(type.priceCents),
            maxPerOrder: type.maxPerOrder,
          }))}
        />
      ) : null}
    </div>
  );
}
