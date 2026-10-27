import { formatArs } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/time";
import type { TicketExportData } from "@/lib/ticket-export";

export const PAYMENT_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  MERCADO_PAGO: "Mercado Pago",
  CORTESIA: "Cortesía",
};

export const STATUS_LABEL: Record<string, string> = {
  VALIDO: "Válida — mostrar QR en la puerta",
  USADO: "Ya ingresó",
  ANULADO: "Entrada anulada",
};

export type TicketViewInput = {
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
  qrDataUrl: string;
  index: number;
  total: number;
};

export function ticketExportData(input: TicketViewInput): TicketExportData {
  const eventDate = formatDate(input.startsAt);
  const eventTime = formatTime(input.startsAt);
  return {
    eventTitle: input.eventTitle,
    eventWhen: `${eventDate} · ${eventTime}`,
    eventDate,
    eventTime,
    venue: input.venue,
    ticketTypeName: input.ticketTypeName,
    priceLabel: input.unitPriceCents === 0 ? "Cortesía" : formatArs(input.unitPriceCents),
    shortCode: input.shortCode,
    qrDataUrl: input.qrDataUrl,
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone,
    paymentLabel: PAYMENT_LABEL[input.paymentMethod] ?? input.paymentMethod,
    statusText: STATUS_LABEL[input.status] ?? input.status,
    index: input.index,
    total: input.total,
  };
}
