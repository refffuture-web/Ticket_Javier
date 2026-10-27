"use client";

import { useActionState } from "react";

import {
  addArtistAction,
  addGalleryImagesAction,
  createEventAction,
  createTicketTypeAction,
  saveCoverAction,
  setEventStatusAction,
  updateArtistAction,
  updateEventAction,
  updateTicketTypeAction,
  type EventFormState,
} from "@/app/admin/eventos/actions";
import { DateTimeFields } from "@/components/datetime-fields";
import { Field, FormMessage, TextArea } from "@/components/field";
import { Button } from "@/components/ui/button";
import type { EventStatusName } from "@/server/events/event-rules";

const initialState: EventFormState = { error: "", ok: "" };

function Feedback({ state }: { state: EventFormState }) {
  return (
    <>
      <FormMessage>{state.error}</FormMessage>
      {state.ok ? <p className="text-sm text-muted-foreground">{state.ok}</p> : null}
    </>
  );
}

export function EventDetailsForm({
  event,
}: {
  event?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    startsAt: string;
    venue: string;
  };
}) {
  const [state, action, pending] = useActionState(
    event ? updateEventAction : createEventAction,
    initialState,
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <Field
        label="Título"
        name="title"
        defaultValue={event?.title}
        required
        maxLength={120}
      />
      <Field
        label="Dirección"
        name="slug"
        defaultValue={event?.slug}
        hint="Si la dejás vacía al crear, se arma con el título. Solo minúsculas y guiones."
        maxLength={80}
      />
      <TextArea
        label="Descripción"
        name="description"
        defaultValue={event?.description}
        required
        maxLength={4000}
      />
      <DateTimeFields
        name="startsAt"
        dateLabel="Fecha"
        timeLabel="Horario"
        defaultValue={event?.startsAt}
        required
        hint="Día, mes y año, y después el horario (Mendoza)."
      />
      <Field
        label="Lugar"
        name="venue"
        defaultValue={event?.venue}
        required
        maxLength={160}
      />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : event ? "Guardar datos" : "Crear evento"}
      </Button>
    </form>
  );
}

export function CoverForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(saveCoverAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <Field
        label="Imagen de portada"
        name="cover"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hint="JPG, PNG o WebP. Máximo 5 MB."
        required
      />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Subiendo…" : "Subir portada"}
      </Button>
    </form>
  );
}

export function GalleryUploadForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(addGalleryImagesAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <Field
        label="Fotos de la galería"
        name="gallery"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hint="Podés elegir varias. JPG, PNG o WebP. Máximo 5 MB cada una. Hasta 12 en total."
        required
      />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Subiendo…" : "Agregar a la galería"}
      </Button>
    </form>
  );
}

export function StatusActions({
  eventId,
  status,
}: {
  eventId: string;
  status: EventStatusName;
}) {
  const [state, action, pending] = useActionState(setEventStatusAction, initialState);
  const options: {
    value: EventStatusName;
    label: string;
    variant: "default" | "destructive";
  }[] = [];
  if (status === "BORRADOR")
    options.push({ value: "PUBLICADO", label: "Publicar", variant: "default" });
  if (status === "PUBLICADO") {
    options.push({ value: "FINALIZADO", label: "Finalizar", variant: "default" });
    options.push({
      value: "CANCELADO",
      label: "Cancelar evento",
      variant: "destructive",
    });
  }
  if (status === "CANCELADO") {
    options.push({ value: "BORRADOR", label: "Volver a borrador", variant: "default" });
  }
  if (options.length === 0)
    return <p className="text-sm text-muted-foreground">Evento finalizado.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <form action={action} key={option.value}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="status" value={option.value} />
            <Button type="submit" variant={option.variant} disabled={pending}>
              {option.label}
            </Button>
          </form>
        ))}
      </div>
      <Feedback state={state} />
    </div>
  );
}

export function AddArtistForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(addArtistAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <ArtistFields />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando…" : "Agregar artista"}
      </Button>
    </form>
  );
}

export function ArtistEditor({
  eventId,
  artist,
}: {
  eventId: string;
  artist: {
    id: string;
    name: string;
    startsAt: string;
    instagram: string;
    spotify: string;
    youtube: string;
    hasPhoto: boolean;
  };
}) {
  const [state, action, pending] = useActionState(updateArtistAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="artistId" value={artist.id} />
      <ArtistFields artist={artist} />
      <Feedback state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Guardando…" : "Guardar artista"}
      </Button>
    </form>
  );
}

function ArtistFields({
  artist,
}: {
  artist?: {
    name: string;
    startsAt: string;
    instagram: string;
    spotify: string;
    youtube: string;
    hasPhoto: boolean;
  };
}) {
  return (
    <>
      <Field
        label="Nombre"
        name="name"
        defaultValue={artist?.name}
        required
        maxLength={80}
      />
      <DateTimeFields
        name="startsAt"
        dateLabel="Fecha en escena"
        timeLabel="Horario en escena"
        defaultValue={artist?.startsAt}
        hint="Opcional. Día, mes y año, y después el horario (Mendoza)."
      />
      <Field
        label="Instagram"
        name="instagram"
        type="url"
        defaultValue={artist?.instagram}
      />
      <Field label="Spotify" name="spotify" type="url" defaultValue={artist?.spotify} />
      <Field label="YouTube" name="youtube" type="url" defaultValue={artist?.youtube} />
      <Field
        label="Foto"
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
      />
      {artist?.hasPhoto ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="removePhoto" />
          Quitar la foto actual
        </label>
      ) : null}
    </>
  );
}

export function AddTicketTypeForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(createTicketTypeAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <TicketFields />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Agregar tipo"}
      </Button>
    </form>
  );
}

export function TicketTypeEditor({
  eventId,
  ticketType,
}: {
  eventId: string;
  ticketType: {
    id: string;
    name: string;
    price: string;
    capacity: number;
    maxPerOrder: number;
    saleStartsAt: string;
    saleEndsAt: string;
    active: boolean;
    soldCount: number;
    reservedCount: number;
  };
}) {
  const [state, action, pending] = useActionState(updateTicketTypeAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="ticketTypeId" value={ticketType.id} />
      <TicketFields ticketType={ticketType} />
      <p className="text-sm text-muted-foreground">
        Vendidas {ticketType.soldCount} · Reservadas {ticketType.reservedCount} ·
        Disponibles{" "}
        {ticketType.capacity - ticketType.soldCount - ticketType.reservedCount}
      </p>
      <Feedback state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Guardando…" : "Guardar tipo"}
      </Button>
    </form>
  );
}

function TicketFields({
  ticketType,
}: {
  ticketType?: {
    name: string;
    price: string;
    capacity: number;
    maxPerOrder: number;
    saleStartsAt: string;
    saleEndsAt: string;
    active: boolean;
  };
}) {
  return (
    <>
      <Field
        label="Nombre"
        name="name"
        defaultValue={ticketType?.name}
        required
        maxLength={80}
      />
      <Field
        label="Precio"
        name="price"
        inputMode="decimal"
        defaultValue={ticketType?.price}
        placeholder="1500,50"
        hint="Pesos argentinos. Usá coma para los centavos. Cero deja el precio en cortesía, pero el cupo se descuenta igual al vender."
        required
      />
      <Field
        label="Cupo"
        name="capacity"
        type="number"
        min={1}
        defaultValue={ticketType?.capacity ?? 100}
        required
      />
      <Field
        label="Máximo por compra"
        name="maxPerOrder"
        type="number"
        min={1}
        defaultValue={ticketType?.maxPerOrder ?? 4}
        required
      />
      <DateTimeFields
        name="saleStartsAt"
        dateLabel="Inicio de venta — fecha"
        timeLabel="Inicio de venta — horario"
        defaultValue={ticketType?.saleStartsAt}
        hint="Opcional. Día, mes y año, y después el horario (Mendoza)."
      />
      <DateTimeFields
        name="saleEndsAt"
        dateLabel="Fin de venta — fecha"
        timeLabel="Fin de venta — horario"
        defaultValue={ticketType?.saleEndsAt}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={ticketType?.active ?? true}
        />
        Activo para la venta
      </label>
    </>
  );
}
