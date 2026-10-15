import { describe, expect, it } from "vitest";

import {
  ACCOUNT_LOCK_AFTER,
  consumeLimit,
  isLocked,
  nextLockout,
  type RateLimitStore,
} from "./rate-limit";

function memoryStore(): RateLimitStore & { counts: Map<string, number> } {
  const counts = new Map<string, number>();
  return {
    counts,
    async increment(key, bucketStart) {
      const id = `${key}:${bucketStart.toISOString()}`;
      const next = (counts.get(id) ?? 0) + 1;
      counts.set(id, next);
      return next;
    },
  };
}

describe("rate limit y bloqueo", () => {
  it("bloquea cuando se supera el cupo de la ventana", async () => {
    const store = memoryStore();
    const now = new Date("2026-01-15T12:00:00.000Z");
    expect((await consumeLimit(store, "login:ip:1", 2, 60_000, now)).allowed).toBe(true);
    expect((await consumeLimit(store, "login:ip:1", 2, 60_000, now)).allowed).toBe(true);
    expect((await consumeLimit(store, "login:ip:1", 2, 60_000, now)).allowed).toBe(false);
  });

  it("abre una ventana nueva después del intervalo", async () => {
    const store = memoryStore();
    const first = new Date("2026-01-15T12:00:30.000Z");
    const later = new Date("2026-01-15T12:01:00.000Z");
    await consumeLimit(store, "k", 1, 60_000, first);
    expect((await consumeLimit(store, "k", 1, 60_000, later)).allowed).toBe(true);
  });

  it("bloquea la cuenta al quinto intento", () => {
    const now = new Date("2026-01-15T12:00:00.000Z");
    const fourth = nextLockout(ACCOUNT_LOCK_AFTER - 2, now);
    expect(fourth.lockedUntil).toBeNull();
    const fifth = nextLockout(ACCOUNT_LOCK_AFTER - 1, now);
    expect(fifth.lockedUntil).not.toBeNull();
    expect(isLocked(fifth.lockedUntil, now)).toBe(true);
    expect(isLocked(fifth.lockedUntil, new Date(now.getTime() + 16 * 60 * 1000))).toBe(
      false,
    );
  });
});
