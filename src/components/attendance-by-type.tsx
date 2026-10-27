import { db } from "@/server/db";

type Row = { id: string; name: string; used: number; pending: number; voided: number };

export async function AttendanceByType({ eventId }: { eventId: string }) {
  const [types, groups] = await Promise.all([
    db.ticketType.findMany({
      where: { eventId },
      orderBy: [{ priceCents: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
    db.ticket.groupBy({
      by: ["ticketTypeId", "status"],
      where: { eventId },
      _count: { _all: true },
    }),
  ]);
  const count = (ticketTypeId: string, status: "VALIDO" | "USADO" | "ANULADO") =>
    groups.find((group) => group.ticketTypeId === ticketTypeId && group.status === status)?._count
      ._all ?? 0;

  const rows: Row[] = types
    .map((type) => ({
      id: type.id,
      name: type.name,
      used: count(type.id, "USADO"),
      pending: count(type.id, "VALIDO"),
      voided: count(type.id, "ANULADO"),
    }))
    .filter((row) => row.used + row.pending + row.voided > 0);
  const total = rows.reduce(
    (sum, row) => ({
      used: sum.used + row.used,
      pending: sum.pending + row.pending,
      voided: sum.voided + row.voided,
    }),
    { used: 0, pending: 0, voided: 0 },
  );

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay entradas emitidas.</p>;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Total label="Ingresaron" value={total.used} tone="text-emerald-700" />
        <Total label="Faltan entrar" value={total.pending} tone="text-amber-700" />
        <Total label="Total" value={total.used + total.pending} />
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <TypeRow key={row.id} row={row} />
        ))}
      </ul>
      {total.voided > 0 ? (
        <p className="text-xs text-muted-foreground">
          {total.voided} {total.voided === 1 ? "entrada anulada no cuenta" : "entradas anuladas no cuentan"} en
          los totales.
        </p>
      ) : null}
    </section>
  );
}

function TypeRow({ row }: { row: Row }) {
  const issued = row.used + row.pending;
  const percent = issued ? Math.round((row.used / issued) * 100) : 0;
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{row.name}</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {row.used} de {issued} · {percent}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`Ingresos ${row.name}`}
        aria-valuemin={0}
        aria-valuemax={issued}
        aria-valuenow={row.used}
      >
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          <span className="font-semibold tabular-nums text-emerald-700">{row.used}</span>{" "}
          {row.used === 1 ? "ingresó" : "ingresaron"}
        </span>
        <span>
          <span className="font-semibold tabular-nums text-amber-700">{row.pending}</span>{" "}
          {row.pending === 1 ? "falta entrar" : "faltan entrar"}
        </span>
        {row.voided > 0 ? (
          <span className="text-muted-foreground">
            {row.voided} {row.voided === 1 ? "anulada" : "anuladas"}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function Total({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border px-2 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
