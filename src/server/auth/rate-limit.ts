export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_IP_LIMIT = 20;
export const LOGIN_EMAIL_LIMIT = 10;
export const ACCOUNT_LOCK_AFTER = 5;
export const ACCOUNT_LOCK_MS = 15 * 60 * 1000;

export type RateLimitStore = {
  increment(key: string, windowStart: Date): Promise<number>;
};

export function windowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

export async function consumeLimit(
  store: RateLimitStore,
  key: string,
  limit: number,
  windowMs: number,
  now: Date,
): Promise<{ allowed: boolean; count: number }> {
  const count = await store.increment(key, windowStart(now, windowMs));
  return { allowed: count <= limit, count };
}

export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

export function nextLockout(
  failedLoginCount: number,
  now: Date,
): { failedLoginCount: number; lockedUntil: Date | null } {
  const count = failedLoginCount + 1;
  if (count >= ACCOUNT_LOCK_AFTER) {
    return {
      failedLoginCount: count,
      lockedUntil: new Date(now.getTime() + ACCOUNT_LOCK_MS),
    };
  }
  return { failedLoginCount: count, lockedUntil: null };
}
