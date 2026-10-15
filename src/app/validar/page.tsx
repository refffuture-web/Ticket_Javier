import { Suspense } from "react";
import Link from "next/link";

import { requireArea } from "@/server/auth/guard";
import { db } from "@/server/db";

import { Scanner } from "./scanner";

export const instant = false;

export default function ValidarPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ValidarHome searchParams={searchParams} />
    </Suspense>
  );
}

async function ValidarHome({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  await requireArea("validar");
  const { evento } = await searchParams;
  const events = await db.event.findMany({
    where: { status: "PUBLICADO" },
    orderBy: { startsAt: "asc" },
  });
  const selected = events.find((event) => event.id === evento) ?? null;
  const attendance = selected
    ? {
        used: await db.ticket.count({ where: { eventId: selected.id, status: "USADO" } }),
        valid: await db.ticket.count({
          where: { eventId: selected.id, status: "VALIDO" },
        }),
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Evento en puerta</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/validar?evento=${event.id}`}
                className="underline-offset-4 hover:underline"
              >
                {event.title}
              </Link>
            </li>
          ))}
        </ul>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay eventos publicados.</p>
        ) : null}
      </section>
      {selected && attendance ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Ingresaron {attendance.used}. Faltan {attendance.valid}.
          </p>
          <Scanner eventId={selected.id} />
        </section>
      ) : null}
    </div>
  );
}
