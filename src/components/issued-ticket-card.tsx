import { markTicketFisicoAction } from "@/app/boleteria/actions";
import { TicketActions } from "@/components/ticket-actions";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/time";
import { PAYMENT_LABEL, STATUS_LABEL, ticketExportData } from "@/lib/ticket-view";

type Props = {
  eventTitle: string;
  startsAt: Date;
  venue: string;
  ticketTypeName: string;
  unitPriceCents: number;
  shortCode: string;
  status: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  paymentMethod: string;
  qrDataUrl: string | null;
  shareUrl: string;
  index: number;
  total: number;
  showActions?: boolean;
  /** Impresión térmica: pedido pendiente / ya marcado. */
  ticketId?: string;
  orderId?: string;
  fisico?: boolean;
  fisicoContext?: { desde?: string; evento?: string };
};

export function IssuedTicketCard({
  eventTitle,
  startsAt,
  venue,
  ticketTypeName,
  unitPriceCents,
  shortCode,
  status,
  buyerName,
  buyerEmail,
  buyerPhone,
  paymentMethod,
  qrDataUrl,
  shareUrl,
  index,
  total,
  showActions = true,
  ticketId,
  orderId,
  fisico = false,
  fisicoContext,
}: Props) {
  const payment = PAYMENT_LABEL[paymentMethod] ?? paymentMethod;
  const statusText = STATUS_LABEL[status] ?? status;
  const whenDate = formatDate(startsAt);
  const whenTime = formatTime(startsAt);

  return (
    <li className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm print:break-inside-avoid print:shadow-none">
      <div className="flex items-center justify-between gap-3 bg-sky-950 px-4 py-3 text-white sm:px-5">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-sky-200/90 uppercase">
            Boletería Mendoza del oeste
          </p>
          <p className="text-sm text-sky-100/80">
            Entrada {index} de {total}
          </p>
        </div>
        <p className="rounded-md bg-white/10 px-2.5 py-1 font-mono text-sm tracking-wider">
          {shortCode}
        </p>
      </div>

      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-semibold tracking-tight text-balance text-zinc-900">
            {eventTitle}
          </h3>
          <p className="text-sm text-zinc-600">{statusText}</p>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
            <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Fecha
            </dt>
            <dd className="mt-0.5 font-medium text-zinc-900">{whenDate}</dd>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
            <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Hora
            </dt>
            <dd className="mt-0.5 font-medium text-zinc-900">{whenTime} hs</dd>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2.5 sm:col-span-2">
            <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Lugar
            </dt>
            <dd className="mt-0.5 font-medium text-zinc-900">{venue}</dd>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
            <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Tipo de entrada
            </dt>
            <dd className="mt-0.5 font-medium text-zinc-900">{ticketTypeName}</dd>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
            <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Precio
            </dt>
            <dd className="mt-0.5 font-medium text-zinc-900">
              {unitPriceCents === 0 ? "Cortesía" : formatArs(unitPriceCents)}
            </dd>
          </div>
        </dl>

        <div className="border-t border-zinc-100 pt-4">
          <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
            Titular
          </p>
          <p className="mt-1 font-medium text-zinc-900">{buyerName}</p>
          {buyerEmail || buyerPhone ? (
            <p className="text-sm text-zinc-600">
              {[buyerEmail, buyerPhone].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-zinc-500">Pago: {payment}</p>
        </div>

        {qrDataUrl && status === "VALIDO" ? (
          <div className="flex flex-col items-start gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`Código QR de la entrada ${shortCode}`}
                className="h-44 w-44"
              />
            </div>
            <div className="flex max-w-sm flex-col gap-2 text-sm text-zinc-600">
              <p className="font-medium text-zinc-900">Acceso al evento</p>
              <p>
                Presentá este QR (en pantalla o impreso) en la puerta. El código{" "}
                <span className="font-mono text-zinc-800">{shortCode}</span> identifica
                esta entrada; no lo compartas si no querés ceder el ingreso.
              </p>
              <p>Llegá con tiempo: las puertas suelen cerrar al inicio del show.</p>
            </div>
          </div>
        ) : null}

        {showActions && status === "VALIDO" ? (
          <div className="flex flex-col gap-3 print:hidden">
            {ticketId && orderId ? (
              <div className="flex flex-wrap items-center gap-2">
                {fisico ? (
                  <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900">
                    En cola de impresión física
                  </p>
                ) : (
                  <form action={markTicketFisicoAction}>
                    <input type="hidden" name="ticketId" value={ticketId} />
                    <input type="hidden" name="orderId" value={orderId} />
                    {fisicoContext?.desde ? (
                      <input type="hidden" name="desde" value={fisicoContext.desde} />
                    ) : null}
                    {fisicoContext?.evento ? (
                      <input type="hidden" name="evento" value={fisicoContext.evento} />
                    ) : null}
                    <Button type="submit" variant="secondary" size="sm">
                      Físico
                    </Button>
                  </form>
                )}
              </div>
            ) : null}
            {qrDataUrl ? (
              <TicketActions
                shareUrl={shareUrl}
                ticket={ticketExportData({
                  eventTitle,
                  startsAt,
                  venue,
                  ticketTypeName,
                  unitPriceCents,
                  shortCode,
                  status,
                  buyerName,
                  buyerEmail,
                  buyerPhone,
                  paymentMethod,
                  qrDataUrl,
                  index,
                  total,
                })}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
