export const IDLE_SESSION_MS = 8 * 60 * 60 * 1000;
export const ABSOLUTE_SESSION_MS = 16 * 60 * 60 * 1000;

export function sessionExpiry(createdAt: Date, now: Date): Date {
  const idle = now.getTime() + IDLE_SESSION_MS;
  const absolute = createdAt.getTime() + ABSOLUTE_SESSION_MS;
  return new Date(Math.min(idle, absolute));
}

export function sessionIsActive(createdAt: Date, expiresAt: Date, now: Date): boolean {
  return (
    now.getTime() < expiresAt.getTime() &&
    now.getTime() < createdAt.getTime() + ABSOLUTE_SESSION_MS
  );
}
