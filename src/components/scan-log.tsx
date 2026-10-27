import type { ScanResult } from "@prisma/client";
import Link from "next/link";

import { AttendanceByType } from "@/components/attendance-by-type";
import { formatDate, formatDateTime, formatTimeWithSeconds } from "@/lib/time";
import { db } from "@/server/db";

const RESULT_LABEL: Record<ScanResult, string> = {
  VALIDO: "Ingresó",
  YA_USADO: "Ya había ingresado",
  ANULADO: "Anulada",
  OTRO_EVENTO: "Otro evento",
  INVALIDO: "QR no válido",
};

const RESULT_STYLE: Record<ScanResult, string> = {
  VALIDO: "bg-emerald-100 text-emerald-800",
  YA_USADO: "bg-amber-100 text-amber-800",
  ANULADO: "bg-red-100 text-red-800",
  OTRO_EVENTO: "bg-red-100 text-red-800",
  INVALIDO: "bg-red-100 text-red-800",
};

const FILTERS = {
  todos: { label: "Todos", where: undefined },
  ingresos: { label: "Ingresos", where: ["VALIDO"] },
  errores: {
    label: "Errores",
    where: ["YA_USADO", "ANULADO", "OTRO_EVENTO", "INVALIDO"],
  },
} as const satisfies Record<string, { label: string; where: readonly ScanResult[] | undefined }>;

type Filter = keyof typeof FILTERS;

const LIMIT = 300;

export async function ScanLog({
  basePath,
  eventId,
  filter,
}: {
  basePath: string;
  eventId?: string;
  filter?: string;
}) {
  const events = await db.event.findMany({
    where: { status: { in: ["PUBLICADO", "FINALIZADO"] } },
    orderBy: { startsAt: "desc" },
    select: { id: true, title: true, startsAt: true },
  });
  const selected = events.find((event) => event.id === eventId) ?? events[0] ?? null;
  const active: Filter = filter && filter in FILTERS ? (filter as Filter) : "todos";

  if (!selected) {
    return <p className="text-sm text-muted-foreground">Todavía no hay eventos.</p>;
  }

  const resultFilter = FILTERS[active].where;
  const [counts, scans] = await Promise.all([
    db.ticketScan.groupBy({
      by: ["result"],
      where: { eventId: selected.id },
      _count: { _all: true },
    }),
    db.ticketScan.findMany({
      where: {
        eventId: selected.id,
        ...(resultFilter ? { result: { in: [...resultFilter] } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      include: {
        user: { select: { name: true } },
        ticket: { select: { ticketType: { select: { name: true } } } },
      },
    }),
  ]);
  const count = (result: ScanResult) =>
    counts.find((row) => row.result === result)?._count._all ?? 0;
  const errors = count("YA_USADO") + count("ANULADO") + count("OTRO_EVENTO") + count("INVALIDO");
  const href = (params: { evento?: string; ver?: Filter }) => {
    const query = new URLSearchParams({
      evento: params.evento ?? selected.id,
      ...(params.ver && params.ver !== "todos" ? { ver: params.ver } : {}),
    });
    return `${basePath}?${query.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Evento</h2>
        <div className="flex flex-wrap gap-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={href({ evento: event.id, ver: active })}
              className={`rounded-full border px-3 py-1 text-sm ${
                event.id === selected.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-muted"
              }`}
            >
              {event.title} · {formatDate(event.startsAt)}
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Ingresos por tipo de entrada</h2>
        <AttendanceByType eventId={selected.id} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Errores" value={errors} tone="text-red-700" />
        <Stat label="Ya habían ingresado" value={count("YA_USADO")} tone="text-amber-700" />
        <Stat label="QR no válidos" value={count("INVALIDO")} />
        <Stat label="De otro evento" value={count("OTRO_EVENTO")} />
        <Stat label="Anuladas" value={count("ANULADO")} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(FILTERS) as Filter[]).map((key) => (
            <Link
              key={key}
              href={href({ ver: key })}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                key === active ? "bg-muted font-medium" : "hover:bg-muted"
              }`}
            >
              {FILTERS[key].label}
            </Link>
          ))}
        </div>

        {scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay registros para este filtro.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border text-sm">
            {scans.map((scan) => (
              <li key={scan.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <span className="tabular-nums">
                  <span className="text-muted-foreground">{formatDate(scan.createdAt)}</span>{" "}
                  <span className="font-medium">{formatTimeWithSeconds(scan.createdAt)}</span>
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${RESULT_STYLE[scan.result]}`}
                >
                  {RESULT_LABEL[scan.result]}
                </span>
                {scan.code ? <span className="font-mono">{scan.code}</span> : null}
                {scan.ticket?.ticketType.name ? (
                  <span className="text-muted-foreground">{scan.ticket.ticketType.name}</span>
                ) : null}
                <span className="ml-auto text-muted-foreground">
                  {scan.user?.name ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {scans.length === LIMIT ? (
          <p className="text-xs text-muted-foreground">
            Se muestran los últimos {LIMIT} registros.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Actualizado {formatDateTime(new Date())}. Recargá la página para ver lo último.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
