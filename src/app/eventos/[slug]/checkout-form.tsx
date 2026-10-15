"use client";

import { useActionState } from "react";

import { startCheckoutAction, type CheckoutState } from "./actions";
import { Field, FormMessage } from "@/components/field";
import { Button } from "@/components/ui/button";

const initialState: CheckoutState = { error: "" };

export function CheckoutForm({
  eventId,
  eventTitle,
  tickets,
}: {
  eventId: string;
  eventTitle: string;
  tickets: {
    id: string;
    name: string;
    priceLabel: string;
    maxPerOrder: number;
    onSale: boolean;
  }[];
}) {
  const [state, action, pending] = useActionState(startCheckoutAction, initialState);
  const canBuy = tickets.some((ticket) => ticket.onSale);
  if (!canBuy) return null;
  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border p-4">
      <input type="hidden" name="eventId" value={eventId} />
      <h3 className="font-medium">Comprar entradas para {eventTitle}</h3>
      {tickets.map((ticket) => (
        <Field
          key={ticket.id}
          label={`${ticket.name} · ${ticket.priceLabel}`}
          name={`qty_${ticket.id}`}
          type="number"
          min={0}
          max={ticket.onSale ? ticket.maxPerOrder : 0}
          defaultValue={0}
          disabled={!ticket.onSale}
          hint={
            ticket.onSale
              ? `Máximo ${ticket.maxPerOrder} por compra.`
              : "No está a la venta."
          }
        />
      ))}
      <Field label="Nombre y apellido" name="buyerName" autoComplete="name" required />
      <Field label="Email" name="buyerEmail" type="email" autoComplete="email" required />
      <Field
        label="Teléfono"
        name="buyerPhone"
        type="tel"
        autoComplete="tel"
        required
        hint="Te lo pedimos para ubicar la compra. No va impreso en la entrada."
      />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="privacy" required className="mt-1" />
        <span>
          Leí el aviso de privacidad y acepto que usen estos datos para entregar las
          entradas.
        </span>
      </label>
      <FormMessage>{state.error}</FormMessage>
      <Button type="submit" disabled={pending}>
        {pending ? "Reservando…" : "Pagar con Mercado Pago"}
      </Button>
      <p className="text-sm text-muted-foreground">
        El cupo queda reservado 15 minutos. El reembolso del dinero, si corresponde, se
        hace desde Mercado Pago.
      </p>
    </form>
  );
}
