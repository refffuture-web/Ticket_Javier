import { createHmac, timingSafeEqual } from "node:crypto";

export const PENDING_LOGIN_MS = 5 * 60 * 1000;

export function signPendingLogin(
  userId: string,
  expiresAt: number,
  appSecret: string,
): string {
  const body = `${userId}.${expiresAt}`;
  const signature = createHmac("sha256", appSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readPendingLogin(
  token: string,
  appSecret: string,
  now: number,
): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const userId = parts[0];
  const expiresAtRaw = parts[1];
  const signature = parts[2];
  if (!userId || !expiresAtRaw || !signature) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(userId)) return null;

  const expected = createHmac("sha256", appSecret)
    .update(`${userId}.${expiresAtRaw}`)
    .digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return null;
  return userId;
}
