export const EVENT_STATUSES = [
  "BORRADOR",
  "PUBLICADO",
  "FINALIZADO",
  "CANCELADO",
] as const;

export type EventStatusName = (typeof EVENT_STATUSES)[number];

export const STATUS_LABEL: Record<EventStatusName, string> = {
  BORRADOR: "Borrador",
  PUBLICADO: "Publicado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const transitions: Record<EventStatusName, readonly EventStatusName[]> = {
  BORRADOR: ["PUBLICADO"],
  PUBLICADO: ["FINALIZADO", "CANCELADO"],
  FINALIZADO: [],
  CANCELADO: ["BORRADOR"],
};

export function canTransition(from: EventStatusName, to: EventStatusName): boolean {
  return transitions[from].includes(to);
}

export function isEditableStatus(status: EventStatusName): boolean {
  return status === "BORRADOR" || status === "PUBLICADO";
}

export function availableSeats(
  capacity: number,
  soldCount: number,
  reservedCount: number,
): number {
  return Math.max(0, capacity - soldCount - reservedCount);
}

export type PublicSale = "disponible" | "agotado" | "proximamente" | "finalizada";

export function publicSale(input: {
  capacity: number;
  soldCount: number;
  reservedCount: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  now: Date;
}): PublicSale {
  if (availableSeats(input.capacity, input.soldCount, input.reservedCount) === 0) {
    return "agotado";
  }
  if (input.saleStartsAt && input.now.getTime() < input.saleStartsAt.getTime()) {
    return "proximamente";
  }
  if (input.saleEndsAt && input.now.getTime() >= input.saleEndsAt.getTime()) {
    return "finalizada";
  }
  return "disponible";
}

export function publishBlocker(activeTicketTypes: number): string | null {
  if (activeTicketTypes < 1) {
    return "Agregá al menos un tipo de entrada activo antes de publicar.";
  }
  return null;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function capacityChangeError(
  nextCapacity: number,
  soldCount: number,
  reservedCount: number,
): string | null {
  if (!Number.isSafeInteger(nextCapacity) || nextCapacity < 1) {
    return "El cupo tiene que ser un entero mayor a cero.";
  }
  if (nextCapacity < soldCount + reservedCount) {
    return "El cupo no puede ser menor que lo vendido y reservado.";
  }
  return null;
}

export function ticketTypeBoundsError(input: {
  capacity: number;
  maxPerOrder: number;
  soldCount: number;
  reservedCount: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
}): string | null {
  const capacity = capacityChangeError(
    input.capacity,
    input.soldCount,
    input.reservedCount,
  );
  if (capacity) return capacity;
  if (!Number.isSafeInteger(input.maxPerOrder) || input.maxPerOrder < 1) {
    return "El máximo por compra tiene que ser un entero mayor a cero.";
  }
  if (input.maxPerOrder > input.capacity) {
    return "El máximo por compra no puede superar el cupo.";
  }
  if (
    input.saleStartsAt &&
    input.saleEndsAt &&
    input.saleEndsAt.getTime() <= input.saleStartsAt.getTime()
  ) {
    return "El fin de venta tiene que ser posterior al inicio.";
  }
  return null;
}

export type ArtistLinks = {
  instagram?: string;
  spotify?: string;
  youtube?: string;
};

export function readArtistLinks(value: unknown): ArtistLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    instagram: typeof record.instagram === "string" ? record.instagram : undefined,
    spotify: typeof record.spotify === "string" ? record.spotify : undefined,
    youtube: typeof record.youtube === "string" ? record.youtube : undefined,
  };
}
