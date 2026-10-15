import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SHORT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function signTicket(ticketId: string, secret: string): string {
  const signature = createHmac("sha256", secret).update(ticketId).digest("base64url");
  return `${ticketId}.${signature}`;
}

export function readTicketToken(token: string, secret: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const ticketId = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) {
    return null;
  }
  const expected = createHmac("sha256", secret).update(ticketId).digest("base64url");
  const given = Buffer.from(signature);
  const target = Buffer.from(expected);
  if (given.length !== target.length || !timingSafeEqual(given, target)) return null;
  return ticketId;
}

export function randomShortCode(): string {
  const bytes = randomBytes(8);
  return [...bytes].map((byte) => SHORT_ALPHABET[byte % SHORT_ALPHABET.length]).join("");
}
