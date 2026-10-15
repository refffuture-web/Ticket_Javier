import { Suspense } from "react";
import Link from "next/link";

import { formatDateTime } from "@/lib/time";
import { requireArea } from "@/server/auth/guard";
import { db } from "@/server/db";
import { STATUS_LABEL, type EventStatusName } from "@/server/events/event-rules";

export const instant = false;

export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <EventsList />
    </Suspense>
  );
}

async function EventsList() {
  await requireArea("admin");
  const events = await db.event.findMany({ orderBy: { startsAt: "desc" } });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Eventos</h2>
        <Link
          href="/admin/eventos/nuevo"
          className="text-sm underline-offset-4 hover:underline"
        >
          Nuevo evento
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay eventos.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border">
          {events.map((event) => (
            <li key={event.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <Link
                href={`/admin/eventos/${event.id}`}
                className="font-medium hover:underline"
              >
                {event.title}
              </Link>
              <p className="text-muted-foreground">
                {statusLabel(event.status)} · {formatDateTime(event.startsAt)} ·{" "}
                {event.venue}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function statusLabel(status: string): string {
  if (status in STATUS_LABEL) return STATUS_LABEL[status as EventStatusName];
  return status;
}
