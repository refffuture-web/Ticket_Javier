import { Suspense } from "react";
import Link from "next/link";

import { AttendanceByType } from "@/components/attendance-by-type";
import { formatDate, formatTime } from "@/lib/time";
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

  return (
    <div className="flex flex-col gap-6">
      {selected ? (
        <section className="flex flex-col gap-1 rounded-2xl bg-foreground px-4 py-3.5 text-background">
          <span className="text-xs font-medium uppercase tracking-wide opacity-70">
            Validando para
          </span>
          <span className="text-2xl font-bold leading-tight">{selected.title}</span>
          <span className="text-sm opacity-80">
            {[`${formatDate(selected.startsAt)} · ${formatTime(selected.startsAt)}`, selected.venue]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">
            {selected ? "Cambiar de evento" : "Elegí el evento que vas a validar"}
          </h2>
          <Link
            href={selected ? `/validar/registro?evento=${selected.id}` : "/validar/registro"}
            className="text-sm underline-offset-4 hover:underline"
          >
            Ver registro de ingresos
          </Link>
        </div>
        <div className={selected ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/validar?evento=${event.id}`}
              aria-current={event.id === selected?.id ? "page" : undefined}
              className={
                selected
                  ? `rounded-full border px-3 py-1 text-sm ${
                      event.id === selected.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:bg-muted"
                    }`
                  : "flex flex-col rounded-xl border border-border px-4 py-3 hover:bg-muted"
              }
            >
              {selected ? (
                event.title
              ) : (
                <>
                  <span className="font-semibold">{event.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(event.startsAt)} · {formatTime(event.startsAt)}
                    {event.venue ? ` · ${event.venue}` : ""}
                  </span>
                </>
              )}
            </Link>
          ))}
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay eventos publicados.</p>
        ) : null}
      </section>
      {selected ? (
        <section className="flex flex-col gap-4">
          <Scanner eventId={selected.id} eventTitle={selected.title} />
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">Ingresos por tipo de entrada</h2>
            <AttendanceByType eventId={selected.id} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
