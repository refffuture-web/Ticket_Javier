export type TicketDocument = {
  eventTitle: string;
  eventStartsAt: Date;
  venue: string;
  ticketTypeName: string;
  shortCode: string;
  qrToken: string;
  issuedAt: Date;
};

const requiredText = [
  "eventTitle",
  "venue",
  "ticketTypeName",
  "shortCode",
  "qrToken",
] as const;

export function createTicketDocument(input: TicketDocument): TicketDocument {
  for (const key of requiredText) {
    if (input[key].trim().length === 0) {
      throw new Error("El ticket está incompleto");
    }
  }
  if (
    Number.isNaN(input.eventStartsAt.getTime()) ||
    Number.isNaN(input.issuedAt.getTime())
  ) {
    throw new Error("El ticket tiene una fecha inválida");
  }
  return input;
}
