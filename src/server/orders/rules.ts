import { lineTotalCents, sumCents } from "@/lib/money";
import { availableSeats, publicSale } from "@/server/events/event-rules";

export const RESERVATION_MS = 15 * 60 * 1000;

export type SaleLineInput = {
  ticketTypeId: string;
  name: string;
  priceCents: number;
  capacity: number;
  soldCount: number;
  reservedCount: number;
  maxPerOrder: number;
  active: boolean;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  quantity: number;
};

export function normalizePhone(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!/^\+?[0-9][0-9 -]{7,18}$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return trimmed;
}

export function selectedLines(
  lines: readonly SaleLineInput[],
  _now: Date,
): SaleLineInput[] {
  return lines.filter((line) => line.quantity > 0);
}

export function saleLinesError(
  lines: readonly SaleLineInput[],
  now: Date,
): string | null {
  const chosen = selectedLines(lines, now);
  if (chosen.length === 0) return "Elegí al menos una entrada.";
  for (const line of chosen) {
    if (!line.active) return `${line.name} no está a la venta.`;
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      return "La cantidad tiene que ser un entero mayor a cero.";
    }
    if (line.quantity > line.maxPerOrder) {
      return `${line.name}: el máximo por compra es ${line.maxPerOrder}.`;
    }
    const sale = publicSale({ ...line, now });
    if (sale === "agotado") return `${line.name} está agotado.`;
    if (sale === "proximamente") return `${line.name} todavía no está a la venta.`;
    if (sale === "finalizada") return `La venta de ${line.name} ya cerró.`;
    if (
      line.quantity > availableSeats(line.capacity, line.soldCount, line.reservedCount)
    ) {
      return `No queda cupo suficiente para ${line.name}.`;
    }
  }
  return null;
}

export function orderTotalCents(lines: readonly SaleLineInput[], now: Date): number {
  return sumCents(
    selectedLines(lines, now).map((line) =>
      lineTotalCents(line.priceCents, line.quantity),
    ),
  );
}
