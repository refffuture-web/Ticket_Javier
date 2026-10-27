"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState } from "react";

import { Field, FormMessage, TextArea } from "@/components/field";
import { Button } from "@/components/ui/button";
import { AUDIENCES, EVENT_TYPES, type ContactFormState } from "@/lib/organizer-contact";

import { sendOrganizerContactAction } from "./actions";

const initialState: ContactFormState = { ok: false, error: "" };

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function OrganizerContactForm() {
  const [state, action, pending] = useActionState(sendOrganizerContactAction, initialState);

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-3 px-2 py-10 text-center" role="status">
        <CircleCheck className="size-14 text-emerald-600" strokeWidth={2} />
        <h3 className="text-xl font-semibold">¡Gracias! Recibimos tus datos</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Te vamos a contactar al email o al teléfono que nos dejaste para charlar sobre tu evento.
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      <p className="text-sm text-muted-foreground">
        Solo pedimos tu nombre y un email o teléfono para poder contactarte. El resto es
        opcional.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre y apellido" name="name" autoComplete="name" required maxLength={80} />
        <Field
          label="Productora u organización (opcional)"
          name="organization"
          autoComplete="organization"
          maxLength={120}
        />
        <Field label="Email" name="email" type="email" autoComplete="email" maxLength={200} />
        <Field
          label="Teléfono / WhatsApp"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="Ej. 261 555 1234"
        />
        <label className="flex flex-col gap-1 text-sm" htmlFor="eventType">
          <span className="font-medium">Tipo de evento (opcional)</span>
          <select id="eventType" name="eventType" defaultValue="" className={selectClass}>
            <option value="">Elegí una opción</option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="audience">
          <span className="font-medium">Público estimado (opcional)</span>
          <select id="audience" name="audience" defaultValue="" className={selectClass}>
            <option value="">Elegí una opción</option>
            {AUDIENCES.map((audience) => (
              <option key={audience} value={audience}>
                {audience}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Ciudad (opcional)"
          name="city"
          autoComplete="address-level2"
          maxLength={80}
          placeholder="Ej. Mendoza"
        />
        <Field
          label="Fecha estimada (opcional)"
          name="eventDate"
          maxLength={40}
          placeholder="Ej. marzo 2027"
        />
      </div>
      <TextArea
        label="Mensaje o descripción de lo que buscás (opcional)"
        name="message"
        rows={6}
        maxLength={2000}
        placeholder="Contanos qué evento querés organizar, dónde y cuándo, cuántas entradas pensás vender y qué necesitás de nosotros…"
        hint="Hasta 2.000 caracteres."
      />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="privacy" required className="mt-1" />
        <span>
          Acepto que usen estos datos para contactarme.{" "}
          <Link href="/privacidad" className="underline underline-offset-4">
            Aviso de privacidad
          </Link>
        </span>
      </label>
      <FormMessage>{state.error}</FormMessage>
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Enviando…" : "Quiero que me contacten"}
      </Button>
    </form>
  );
}
