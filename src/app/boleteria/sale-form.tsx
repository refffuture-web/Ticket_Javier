"use client";

import { useActionState } from "react";

import { sellAtBoxOfficeAction, type SaleState } from "./actions";
import { Field, FormMessage } from "@/components/field";
import { Button } from "@/components/ui/button";

const initialState: SaleState = { error: "" };

export function SaleForm({
  eventId,
  tickets,
  /** Tras emitir: "admin" vuelve a /admin/ventas; por defecto boletería. */
  area = "boleteria",
}: {
  eventId: string;
  tickets: { id: string; name: string; priceLabel: string; maxPerOrder: number }[];
  area?: "admin" | "boleteria";
}) {
  const [state, action, pending] = useActionState(sellAtBoxOfficeAction, initialState);
  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="saleArea" value={area} />
      {tickets.map((ticket) => (
        <Field
          key={ticket.id}
          label={`${ticket.name} · ${ticket.priceLabel}`}
          name={`qty_${ticket.id}`}
          type="number"
          min={0}
          max={ticket.maxPerOrder}
          defaultValue={0}
        />
      ))}
      <Field label="Nombre (opcional)" name="buyerName" maxLength={80} />
      <Field
        label="Email (opcional)"
        name="buyerEmail"
        type="email"
        hint="Si lo completás, se envían las entradas por correo."
      />
      <Field label="Teléfono (opcional)" name="buyerPhone" type="tel" />
      <label className="flex flex-col gap-1 text-sm" htmlFor="paymentMethod">
        <span className="font-medium">Pago</span>
        <select
          id="paymentMethod"
          name="paymentMethod"
          defaultValue="EFECTIVO"
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="EFECTIVO">Efectivo</option>
          <option value="TRANSFERENCIA">Transferencia</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="courtesy" />
        Cortesía (precio 0, consume cupo)
      </label>
      <FormMessage>{state.error}</FormMessage>
      <Button type="submit" disabled={pending}>
        {pending ? "Emitiendo…" : "Emitir entradas"}
      </Button>
    </form>
  );
}
