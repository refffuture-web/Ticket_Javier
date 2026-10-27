import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SHORT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// El link para compartir usa otra firma que el QR: quien tenga el link ve la entrada,
// pero el token del link no sirve como código de ingreso.
const SHARE_PREFIX = "share:";

export function signTicket(ticketId: string, secret: string): string {
  return `${ticketId}.${hmac(ticketId, secret)}`;
}

export function readTicketToken(token: string, secret: string): string | null {
  return verify(token, secret, "");
}

export function signShareToken(ticketId: string, secret: string): string {
  return `${ticketId}.${hmac(SHARE_PREFIX + ticketId, secret)}`;
}

export function readShareToken(token: string, secret: string): string | null {
  return verify(token, secret, SHARE_PREFIX);
}

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function verify(token: string, secret: string, prefix: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const ticketId = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) {
    return null;
  }
  const given = Buffer.from(signature);
  const target = Buffer.from(hmac(prefix + ticketId, secret));
  if (given.length !== target.length || !timingSafeEqual(given, target)) return null;
  return ticketId;
}

export function randomShortCode(): string {
  const bytes = randomBytes(8);
  return [...bytes].map((byte) => SHORT_ALPHABET[byte % SHORT_ALPHABET.length]).join("");
}
