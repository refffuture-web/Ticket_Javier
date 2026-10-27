"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseArsToCents } from "@/lib/money";
import { mendozaLocalToUtc } from "@/lib/time";
import { detectImageType } from "@/modules/storage/storage-service";
import { writeAudit } from "@/server/audit";
import { requireArea } from "@/server/auth/guard";
import { requestContext } from "@/server/auth/request-context";
import { db } from "@/server/db";
import {
  canTransition,
  isEditableStatus,
  publishBlocker,
  slugify,
  ticketTypeBoundsError,
  type EventStatusName,
} from "@/server/events/event-rules";
import { storage } from "@/server/storage";

export type EventFormState = { error: string; ok: string };

const rejected = "No se pudo completar la acción";

function refreshEvent(eventId: string) {
  revalidatePath(`/admin/eventos/${eventId}`);
  revalidatePath("/admin/eventos");
  revalidatePath("/");
}
const httpUrl = z.url().refine((value) => /^https?:\/\//.test(value));

async function authorized(): Promise<{ userId: string; ip: string } | { error: string }> {
  const session = await requireArea("admin");
  const context = await requestContext();
  if (!context.originOk) return { error: rejected };
  return { userId: session.userId, ip: context.ip };
}

async function availableSlug(base: string, ignoreId?: string): Promise<string | null> {
  const root = slugify(base);
  if (!root) return null;
  let candidate = root;
  for (let suffix = 2; suffix < 50; suffix += 1) {
    const existing = await db.event.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === ignoreId) return candidate;
    const stem = root.slice(0, 70).replace(/-+$/g, "");
    candidate = `${stem}-${suffix}`;
  }
  return null;
}

function optionalInstant(value: FormDataEntryValue | null): Date | null | "invalid" {
  if (typeof value !== "string" || value.trim() === "") return null;
  return mendozaLocalToUtc(value) ?? "invalid";
}

async function storeImage(
  file: FormDataEntryValue | null,
): Promise<{ key: string } | { error: string } | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 5 * 1024 * 1024)
    return { error: "La imagen supera el tamaño permitido" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageType(bytes);
  if (!detected) return { error: "Tipo de imagen no permitido" };
  const stored = await storage.save({ bytes, contentType: detected.contentType });
  return { key: stored.key };
}

function readLinks(
  formData: FormData,
): { links: Prisma.InputJsonValue | null } | { error: string } {
  const names = ["instagram", "spotify", "youtube"] as const;
  const links: Record<string, string> = {};
  for (const name of names) {
    const raw = formData.get(name);
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const parsed = httpUrl.safeParse(raw.trim());
    if (!parsed.success)
      return { error: "Los enlaces tienen que empezar con http:// o https://." };
    links[name] = parsed.data;
  }
  return { links: Object.keys(links).length > 0 ? links : null };
}

const eventFields = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio")
    .max(120, "El título es demasiado largo"),
  slug: z.string().trim().max(80, "La dirección es demasiado larga"),
  description: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria")
    .max(4000, "La descripción es demasiado larga"),
  startsAt: z.string().trim().min(1, "La fecha del evento es obligatoria"),
  venue: z
    .string()
    .trim()
    .min(1, "El lugar es obligatorio")
    .max(160, "El lugar es demasiado largo"),
});

function eventInput(formData: FormData) {
  const parsed = eventFields.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    venue: formData.get("venue"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del evento" };
  }
  const startsAt = mendozaLocalToUtc(parsed.data.startsAt);
  if (!startsAt) return { error: "La fecha del evento no es válida." };
  return { data: { ...parsed.data, startsAt } };
}

export async function createEventAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const auth = await authorized();
  if ("error" in auth) return { error: auth.error, ok: "" };
  const input = eventInput(formData);
  if ("error" in input) return { error: input.error ?? rejected, ok: "" };
  const slug = await availableSlug(input.data.slug || input.data.title);
  if (!slug) return { error: "El título no alcanza para armar una dirección.", ok: "" };

  const event = await db.event.create({
    data: {
      title: input.data.title,
      slug,
      description: input.data.description,
      startsAt: input.data.startsAt,
      venue: input.data.venue,
    },
  });
  await writeAudit({
    userId: auth.userId,
    action: "event.created",
    entity: "Event",
    entityId: event.id,
    ip: auth.ip,
  });
  redirect(`/admin/eventos/${event.id}`);
}

export async function updateEventAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const auth = await authorized();
  if ("error" in auth) return { error: auth.error, ok: "" };
  const event = await editableEvent(formData.get("eventId"));
  if ("error" in event) return { error: event.error ?? rejected, ok: "" };
  const input = eventInput(formData);
  if ("error" in input) return { error: input.error ?? rejected, ok: "" };
  const slug = await availableSlug(input.data.slug || input.data.title, event.id);
  if (!slug) return { error: "Esa dirección no es válida.", ok: "" };

  await db.event.update({
    where: { id: event.id },
    data: {
      title: input.data.title,
      slug,
      description: input.data.description,
      startsAt: input.data.startsAt,
      venue: input.data.venue,
    },
  });
  await writeAudit({
    userId: auth.userId,
    action: "event.updated",
    entity: "Event",
    entityId: event.id,
    ip: auth.ip,
  });
  refreshEvent(event.id);
  return { error: "", ok: "Datos guardados" };
}

export async function setEventStatusAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const auth = await authorized();
  if ("error" in auth) return { error: auth.error, ok: "" };
  const eventId = formData.get("eventId");
  const next = formData.get("status");
  if (typeof eventId !== "string" || !isStatus(next)) return { error: rejected, ok: "" };
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || !isStatus(event.status)) return { error: "El evento no existe.", ok: "" };
  if (!canTransition(event.status, next)) {
    return { error: "Ese cambio de estado no está permitido.", ok: "" };
  }
  if (next === "PUBLICADO") {
    const active = await db.ticketType.count({ where: { eventId, active: true } });
    const blocker = publishBlocker(active);
    if (blocker) return { error: blocker, ok: "" };
  }
  if (event.status === "CANCELADO" && next === "BORRADOR") {
    const paid = await db.order.count({ where: { eventId, status: "PAGADA" } });
    if (paid > 0) return { error: "No se puede reabrir: hay órdenes pagas.", ok: "" };
  }
  await db.event.update({ where: { id: eventId }, data: { status: next } });
  await writeAudit({
    userId: auth.userId,
    action: "event.status",
    entity: "Event",
    entityId: eventId,
    metadata: { from: event.status, to: next },
    ip: auth.ip,
  });
  refreshEvent(eventId);
  return {
    error: "",
    ok: `Estado: ${next === "BORRADOR" ? "borrador" : next.toLowerCase()}`,
  };
}

export async function saveCoverAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const auth = await authorized();
  if ("error" in auth) return { error: auth.error, ok: "" };
  const event = await editableEvent(formData.get("eventId"));
  if ("error" in event) return { error: event.error ?? rejected, ok: "" };
  const image = await storeImage(formData.get("cover"));
  if (!image) return { error: "Elegí una imagen JPG, PNG o WebP.", ok: "" };
  if ("error" in image) return { error: image.error, ok: "" };
  await db.event.update({ where: { id: event.id }, data: { coverImageKey: image.key } });
  if (event.coverImageKey) await storage.delete(event.coverImageKey);
  await writeAudit({
    userId: auth.userId,
    action: "event.cover",
    entity: "Event",
    entityId: event.id,
    ip: auth.ip,
  });
  refreshEvent(event.id);
  return { error: "", ok: "Portada actualizada" };
}

const MAX_GALLERY_IMAGES = 12;

export async function addGalleryImagesAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const auth = await authorized();
  if ("error" in auth) return { error: auth.error, ok: "" };
  const event = await editableEvent(formData.get("eventId"));
  if ("error" in event) return { error: event.error ?? rejected, ok: "" };

  const files = formData
    .getAll("gallery")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) {
    return { error: "Elegí una o más imágenes JPG, PNG o WebP.", ok: "" };
  }

  const existing = await db.eventGalleryImage.count({ where: { eventId: event.id } });
  if (existing + files.length > MAX_GALLERY_IMAGES) {
    return {
      error: `Podés subir hasta ${MAX_GALLERY_IMAGES} fotos en la galería.`,
      ok: "",
    };
  }

  const last = await db.eventGalleryImage.findFirst({
    where: { eventId: event.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  let sortOrder = (last?.sortOrder ?? -1) + 1;
  let saved = 0;

  for (const file of files) {
    const image = await storeImage(file);
    if (!image) continue;
    if ("error" in image) return { error: image.error, ok: "" };
    await db.eventGalleryImage.create({
      data: { eventId: event.id, imageKey: image.key, sortOrder },
    });
    sortOrder += 1;
    saved += 1;
  }

  if (saved === 0) return { error: "Elegí una o más imágenes JPG, PNG o WebP.", ok: "" };

  await writeAudit({
    userId: auth.userId,
    action: "event.gallery.add",
    entity: "Event",
    entityId: event.id,
    metadata: { count: saved },
    ip: auth.ip,
  });
  refreshEvent(event.id);
  return {
    error: "",
    ok: saved === 1 ? "Foto agregada a la galería" : `${saved} fotos agregadas`,
  };
}

export async function deleteGalleryImageAction(
  formData: FormData,
): Promise<void> {
  const auth = await authorized();
  const eventId = formData.get("eventId");
  const imageId = formData.get("imageId");
  if ("error" in auth || typeof eventId !== "string" || typeof imageId !== "string") {
    redirect(back(typeof eventId === "string" ? eventId : "", "accion"));
  }
  const event = await editableEvent(eventId);
  if ("error" in event) redirect(back(eventId, "accion"));

  const image = await db.eventGalleryImage.findFirst({
    where: { id: imageId, eventId: event.id },
  });
  if (!image) redirect(back(eventId, "accion"));

  await db.eventGalleryImage.delete({ where: { id: image.id } });
  await storage.delete(image.imageKey);
  await writeAudit({
    userId: auth.userId,
    action: "event.gallery.delete",
    entity: "EventGalleryImage",
    entityId: image.id,
    ip: auth.ip,
  });
  refreshEvent(eventId);
  redirect(back(eventId, "galeria"));
}

export async function addArtistAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const auth = await authorized();
  if ("error" in auth) return { error: auth.error, ok: "" };
  const event = await editableEvent(formData.get("eventId"));
  if ("error" in event) return { error: event.error ?? rejected, ok: "" };
  const artist = await artistInput(formData);
  if ("error" in artist) return { error: artist.error, ok: "" };
  const last = await db.lineupArtist.findFirst({
    where: { eventId: event.id },
    orderBy: { sortOrder: "desc" },
  });
  const created = await db.lineupArtist.create({
    data: {
      eventId: event.id,
      name: artist.name,
      startsAt: artist.startsAt,
      links: artist.links ?? Prisma.JsonNull,
      photoKey: artist.photoKey,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  await writeAudit({
    userId: auth.userId,
    action: "lineup.created",
    entity: "LineupArtist",
    entityId: created.id,
    ip: auth.ip,
  });
  refreshEvent(event.id);
  return { error: "", ok: "Artista agregado" };
}

export async function updateArtistAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const auth = await authorized();
  if ("error" in auth) return { error: auth.error, ok: "" };
  const event = await editableEvent(formData.get("eventId"));
  if ("error" in event) return { error: event.error ?? rejected, ok: "" };
  const artistId = formData.get("artistId");
  if (typeof artistId !== "string") return { error: rejected, ok: "" };
  const current = await db.lineupArtist.findFirst({
    where: { id: artistId, eventId: event.id },
  });
  if (!current) return { error: "El artista no existe.", ok: "" };
  const artist = await artistInput(formData, current.photoKey);
  if ("error" in artist) return { error: artist.error, ok: "" };
  await db.lineupArtist.update({
    where: { id: current.id },
    data: {
      name: artist.name,
      startsAt: artist.startsAt,
      links: artist.links ?? Prisma.JsonNull,
      photoKey: artist.photoKey,
    },
  });
  if (current.photoKey && current.photoKey !== artist.photoKey) {
    await storage.delete(current.photoKey);
  }
  await writeAudit({
    userId: auth.userId,
    action: "lineup.updated",
    entity: "LineupArtist",
    entityId: current.id,
    ip: auth.ip,
  });
  refreshEvent(event.id);
  return { error: "", ok: "Artista actualizado" };
}

export async function deleteArtistAction(formData: FormData): Promise<void> {
  const auth = await authorized();
  const eventId = stringField(formData, "eventId");
  const artistId = stringField(formData, "artistId");
  if ("error" in auth || !eventId || !artistId) redirect(back(eventId, "accion"));
  const event = await editableEvent(eventId);
  if ("error" in event) redirect(back(eventId, "accion"));
  const artist = await db.lineupArtist.findFirst({ where: { id: artistId, eventId } });
  if (!artist) redirect(back(eventId, "accion"));
  await db.lineupArtist.delete({ where: { id: artist.id } });
  if (artist.photoKey) await storage.delete(artist.photoKey);
  await writeAudit({
    userId: auth.userId,
    action: "lineup.deleted",
    entity: "LineupArtist",
    entityId: artist.id,
    ip: auth.ip,
  });
  refreshEvent(eventId);
  redirect(back(eventId, "artista"));
}

export async function moveArtistAction(formData: FormData): Promise<void> {
  const auth = await authorized();
  const eventId = stringField(formData, "eventId");
  const artistId = stringField(formData, "artistId");
  const direction = formData.get("direction");
  if (
    "error" in auth ||
    !eventId ||
    !artistId ||
    (direction !== "up" && direction !== "down")
  ) {
    redirect(back(eventId, "accion"));
  }
  const event = await editableEvent(eventId);
  if ("error" in event) redirect(back(eventId, "accion"));
  const artists = await db.lineupArtist.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const index = artists.findIndex((artist) => artist.id === artistId);
  const target = index + (direction === "up" ? -1 : 1);
  const current = artists[index];
  const neighbor = artists[target];
  if (!current || !neighbor) redirect(back(eventId));
  const ordered = artists.slice();
  ordered[index] = neighbor;
  ordered[target] = current;
  await db.$transaction(
    ordered.map((artist, sortOrder) =>
      db.lineupArtist.update({ where: { id: artist.id }, data: { sortOrder } }),
    ),
  );
  await writeAudit({
    userId: auth.userId,
    action: "lineup.reordered",
    entity: "Event",
    entityId: eventId,
    ip: auth.ip,
  });
  refreshEvent(eventId);
  redirect(back(eventId));
}

export async function createTicketTypeAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const auth = await authorized();
  if ("error" in auth) return { error: auth.error, ok: "" };
  const event = await editableEvent(formData.get("eventId"));
  if ("error" in event) return { error: event.error ?? rejected, ok: "" };
  const input = ticketInput(formData, 0, 0);
  if ("error" in input) return { error: input.error ?? rejected, ok: "" };
  const created = await db.ticketType.create({
    data: { eventId: event.id, ...input.data },
  });
  await writeAudit({
    userId: auth.userId,
    action: "ticketType.created",
    entity: "TicketType",
    entityId: created.id,
    ip: auth.ip,
  });
  refreshEvent(event.id);
  return { error: "", ok: "Tipo de entrada creado" };
}

export async function updateTicketTypeAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const auth = await authorized();
  if ("error" in auth) return { error: auth.error, ok: "" };
  const event = await editableEvent(formData.get("eventId"));
  if ("error" in event) return { error: event.error ?? rejected, ok: "" };
  const ticketTypeId = stringField(formData, "ticketTypeId");
  if (!ticketTypeId) return { error: rejected, ok: "" };
  const current = await db.ticketType.findFirst({
    where: { id: ticketTypeId, eventId: event.id },
  });
  if (!current) return { error: "El tipo de entrada no existe.", ok: "" };
  const input = ticketInput(formData, current.soldCount, current.reservedCount);
  if ("error" in input) return { error: input.error ?? rejected, ok: "" };
  await db.ticketType.update({ where: { id: current.id }, data: input.data });
  await writeAudit({
    userId: auth.userId,
    action: "ticketType.updated",
    entity: "TicketType",
    entityId: current.id,
    ip: auth.ip,
  });
  refreshEvent(event.id);
  return { error: "", ok: "Tipo de entrada actualizado" };
}

export async function deleteTicketTypeAction(formData: FormData): Promise<void> {
  const auth = await authorized();
  const eventId = stringField(formData, "eventId");
  const ticketTypeId = stringField(formData, "ticketTypeId");
  if ("error" in auth || !eventId || !ticketTypeId) redirect(back(eventId, "accion"));
  const event = await editableEvent(eventId);
  if ("error" in event) redirect(back(eventId, "accion"));
  const current = await db.ticketType.findFirst({ where: { id: ticketTypeId, eventId } });
  if (!current) redirect(back(eventId, "accion"));
  const used = await db.orderItem.count({ where: { ticketTypeId } });
  if (used > 0 || current.soldCount > 0 || current.reservedCount > 0) {
    redirect(back(eventId, "cupo"));
  }
  await db.ticketType.delete({ where: { id: current.id } });
  await writeAudit({
    userId: auth.userId,
    action: "ticketType.deleted",
    entity: "TicketType",
    entityId: current.id,
    ip: auth.ip,
  });
  refreshEvent(eventId);
  redirect(back(eventId, "tipo"));
}

async function editableEvent(id: FormDataEntryValue | null | string) {
  if (typeof id !== "string" || id.length === 0) return { error: rejected };
  const event = await db.event.findUnique({ where: { id } });
  if (!event) return { error: "El evento no existe." };
  if (!isStatus(event.status) || !isEditableStatus(event.status)) {
    return { error: "Este evento ya no se puede editar." };
  }
  return event;
}

async function artistInput(formData: FormData, currentPhoto: string | null = null) {
  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 80) {
    return { error: "El nombre del artista es obligatorio." };
  }
  const startsAt = optionalInstant(formData.get("startsAt"));
  if (startsAt === "invalid") return { error: "El horario del artista no es válido." };
  const links = readLinks(formData);
  if ("error" in links) return links;
  const removePhoto = formData.get("removePhoto") === "on";
  const image = await storeImage(formData.get("photo"));
  if (image && "error" in image) return image;
  const photoKey = image ? image.key : removePhoto ? null : currentPhoto;
  return {
    name: name.trim(),
    startsAt,
    links: links.links,
    photoKey,
  };
}

function ticketInput(formData: FormData, soldCount: number, reservedCount: number) {
  const name = formData.get("name");
  const price = formData.get("price");
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 80) {
    return { error: "El nombre del tipo de entrada es obligatorio." };
  }
  if (typeof price !== "string") return { error: "El precio no es válido." };
  const priceCents = parseArsToCents(price);
  if (priceCents === null)
    return { error: "Escribí el precio en pesos, con coma para los centavos." };
  const capacity = Number(formData.get("capacity"));
  const maxPerOrder = Number(formData.get("maxPerOrder"));
  const saleStartsAt = optionalInstant(formData.get("saleStartsAt"));
  const saleEndsAt = optionalInstant(formData.get("saleEndsAt"));
  if (saleStartsAt === "invalid" || saleEndsAt === "invalid") {
    return { error: "La ventana de venta no es válida." };
  }
  const bounds = ticketTypeBoundsError({
    capacity,
    maxPerOrder,
    soldCount,
    reservedCount,
    saleStartsAt,
    saleEndsAt,
  });
  if (bounds) return { error: bounds };
  return {
    data: {
      name: name.trim(),
      priceCents,
      capacity,
      maxPerOrder,
      saleStartsAt,
      saleEndsAt,
      active: formData.get("active") === "on",
    },
  };
}

function isStatus(value: unknown): value is EventStatusName {
  return (
    value === "BORRADOR" ||
    value === "PUBLICADO" ||
    value === "FINALIZADO" ||
    value === "CANCELADO"
  );
}

function stringField(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function back(eventId: string | null, aviso?: string): string {
  if (!eventId) return "/admin/eventos";
  return aviso ? `/admin/eventos/${eventId}?aviso=${aviso}` : `/admin/eventos/${eventId}`;
}
