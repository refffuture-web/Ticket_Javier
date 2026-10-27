import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deleteArtistAction,
  deleteGalleryImageAction,
  deleteTicketTypeAction,
  moveArtistAction,
} from "@/app/admin/eventos/actions";
import {
  AddArtistForm,
  AddTicketTypeForm,
  ArtistEditor,
  CoverForm,
  EventDetailsForm,
  GalleryUploadForm,
  StatusActions,
  TicketTypeEditor,
} from "@/app/admin/eventos/event-forms";
import { Button } from "@/components/ui/button";
import { mediaUrl } from "@/lib/media-url";
import { formatArs, formatArsInput } from "@/lib/money";
import { utcToMendozaLocalInput } from "@/lib/time";
import { requireArea } from "@/server/auth/guard";
import { db } from "@/server/db";
import {
  isEditableStatus,
  readArtistLinks,
  STATUS_LABEL,
  type EventStatusName,
} from "@/server/events/event-rules";

export const instant = false;

const notices: Record<string, string> = {
  artista: "Artista quitado.",
  tipo: "Tipo de entrada borrado.",
  galeria: "Foto quitada de la galería.",
  cupo: "No se puede borrar: ya tiene ventas o reservas. Desactivalo.",
  accion: "No se pudo completar la acción.",
};

export default function EventEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <EventEditor params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EventEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  await requireArea("admin");
  const { id } = await params;
  const { aviso } = await searchParams;
  const event = await db.event.findUnique({
    where: { id },
    include: {
      lineup: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      gallery: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      ticketTypes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!event || !isStatus(event.status)) notFound();
  const editable = isEditableStatus(event.status);
  const notice = aviso ? notices[aviso] : undefined;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{event.title}</h2>
        <p className="text-sm text-muted-foreground">
          {STATUS_LABEL[event.status]} · /{event.slug}
        </p>
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        {event.status === "PUBLICADO" ? (
          <p className="text-sm">
            <Link
              href={`/admin/ventas?evento=${event.id}`}
              className="underline-offset-4 hover:underline"
            >
              Vender entradas (boletería)
            </Link>
          </p>
        ) : null}
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Estado</h3>
        <StatusActions eventId={event.id} status={event.status} />
      </section>

      <section className="flex max-w-xl flex-col gap-3">
        <h3 className="font-medium">Datos</h3>
        {editable ? (
          <EventDetailsForm
            event={{
              id: event.id,
              title: event.title,
              slug: event.slug,
              description: event.description,
              startsAt: utcToMendozaLocalInput(event.startsAt),
              venue: event.venue,
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}
      </section>

      <section className="flex max-w-xl flex-col gap-3">
        <h3 className="font-medium">Portada</h3>
        {event.coverImageKey ? (
          // La portada sale de una ruta propia; next/image no aplica a ese archivo generado.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(event.coverImageKey)!}
            alt=""
            className="max-h-64 w-full rounded-lg object-cover"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Sin portada.</p>
        )}
        {editable ? <CoverForm eventId={event.id} /> : null}
      </section>

      <section className="flex max-w-3xl flex-col gap-3">
        <h3 className="font-medium">Galería del evento</h3>
        <p className="text-sm text-muted-foreground">
          Estas fotos se muestran en el home debajo del banner. No son la grilla
          de artistas.
        </p>
        {event.gallery.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay fotos.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {event.gallery.map((photo) => (
              <li key={photo.id} className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(photo.imageKey)!}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                />
                {editable ? (
                  <form action={deleteGalleryImageAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="imageId" value={photo.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Quitar
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {editable ? <GalleryUploadForm eventId={event.id} /> : null}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-medium">Grilla</h3>
        {event.lineup.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay artistas.</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {event.lineup.map((artist, index) => {
              const links = readArtistLinks(artist.links);
              return (
                <li key={artist.id} className="flex flex-col gap-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{artist.name}</p>
                    {editable ? (
                      <div className="flex gap-2">
                        <MoveButton
                          eventId={event.id}
                          artistId={artist.id}
                          direction="up"
                          disabled={index === 0}
                        />
                        <MoveButton
                          eventId={event.id}
                          artistId={artist.id}
                          direction="down"
                          disabled={index === event.lineup.length - 1}
                        />
                        <form action={deleteArtistAction}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="artistId" value={artist.id} />
                          <Button type="submit" variant="destructive" size="sm">
                            Quitar
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                  {artist.photoKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(artist.photoKey)!}
                      alt=""
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : null}
                  {editable ? (
                    <ArtistEditor
                      eventId={event.id}
                      artist={{
                        id: artist.id,
                        name: artist.name,
                        startsAt: artist.startsAt
                          ? utcToMendozaLocalInput(artist.startsAt)
                          : "",
                        instagram: links.instagram ?? "",
                        spotify: links.spotify ?? "",
                        youtube: links.youtube ?? "",
                        hasPhoto: Boolean(artist.photoKey),
                      }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {editable ? <AddArtistForm eventId={event.id} /> : null}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-medium">Tipos de entrada</h3>
        {event.ticketTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hace falta al menos uno activo para publicar.
          </p>
        ) : (
          <ul className="flex flex-col gap-6">
            {event.ticketTypes.map((ticketType) => (
              <li
                key={ticketType.id}
                className="flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {ticketType.name} · {formatArs(ticketType.priceCents)}
                  </p>
                  {editable ? (
                    <form action={deleteTicketTypeAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="ticketTypeId" value={ticketType.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        Borrar
                      </Button>
                    </form>
                  ) : null}
                </div>
                {editable ? (
                  <TicketTypeEditor
                    eventId={event.id}
                    ticketType={{
                      id: ticketType.id,
                      name: ticketType.name,
                      price: formatArsInput(ticketType.priceCents),
                      capacity: ticketType.capacity,
                      maxPerOrder: ticketType.maxPerOrder,
                      saleStartsAt: ticketType.saleStartsAt
                        ? utcToMendozaLocalInput(ticketType.saleStartsAt)
                        : "",
                      saleEndsAt: ticketType.saleEndsAt
                        ? utcToMendozaLocalInput(ticketType.saleEndsAt)
                        : "",
                      active: ticketType.active,
                      soldCount: ticketType.soldCount,
                      reservedCount: ticketType.reservedCount,
                    }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Cupo {ticketType.capacity} · Vendidas {ticketType.soldCount} ·
                    Reservadas {ticketType.reservedCount}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {editable ? <AddTicketTypeForm eventId={event.id} /> : null}
      </section>

      <Link href="/admin/eventos" className="text-sm underline-offset-4 hover:underline">
        Volver al listado
      </Link>
    </div>
  );
}

function MoveButton({
  eventId,
  artistId,
  direction,
  disabled,
}: {
  eventId: string;
  artistId: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  return (
    <form action={moveArtistAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="artistId" value={artistId} />
      <input type="hidden" name="direction" value={direction} />
      <Button type="submit" variant="outline" size="sm" disabled={disabled}>
        {direction === "up" ? "Subir" : "Bajar"}
      </Button>
    </form>
  );
}

function isStatus(status: string): status is EventStatusName {
  return status in STATUS_LABEL;
}
