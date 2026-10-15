import { describe, expect, it } from "vitest";

import {
  authenticateWithPassword,
  GENERIC_LOGIN_ERROR,
  RATE_LIMIT_ERROR,
  type AuthRepo,
  type AuthUser,
} from "./authenticate";
import { hashPassword } from "./password";
import type { RateLimitStore } from "./rate-limit";

function memoryRateLimit(): RateLimitStore {
  const counts = new Map<string, number>();
  return {
    async increment(key) {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
  };
}

function memoryRepo(users: AuthUser[]): AuthRepo & { users: Map<string, AuthUser> } {
  const map = new Map(users.map((user) => [user.id, { ...user }]));
  return {
    users: map,
    async findByEmail(email) {
      return [...map.values()].find((user) => user.email === email) ?? null;
    },
    async updateLoginState(id, state) {
      const user = map.get(id);
      if (!user) return;
      user.failedLoginCount = state.failedLoginCount;
      user.lockedUntil = state.lockedUntil;
    },
    rateLimit: memoryRateLimit(),
  };
}

describe("autenticación", () => {
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("responde igual si el email no existe o la contraseña es incorrecta", async () => {
    const passwordHash = await hashPassword("Correcta1234");
    const repo = memoryRepo([
      {
        id: "user-1",
        email: "admin@boleteria.local",
        passwordHash,
        active: true,
        failedLoginCount: 0,
        lockedUntil: null,
        totpEnabled: false,
        role: "ADMIN",
      },
    ]);

    const missing = await authenticateWithPassword(
      repo,
      { email: "nadie@boleteria.local", password: "Correcta1234", ip: "10.0.0.1" },
      now,
    );
    const wrong = await authenticateWithPassword(
      repo,
      { email: "admin@boleteria.local", password: "Incorrecta123", ip: "10.0.0.2" },
      now,
    );
    expect(missing).toEqual({ status: "error", message: GENERIC_LOGIN_ERROR });
    expect(wrong).toEqual({ status: "error", message: GENERIC_LOGIN_ERROR });
  });

  it("bloquea la cuenta y no revela el motivo", async () => {
    const passwordHash = await hashPassword("Correcta1234");
    const repo = memoryRepo([
      {
        id: "user-1",
        email: "admin@boleteria.local",
        passwordHash,
        active: true,
        failedLoginCount: 4,
        lockedUntil: null,
        totpEnabled: false,
        role: "ADMIN",
      },
    ]);

    const failed = await authenticateWithPassword(
      repo,
      { email: "admin@boleteria.local", password: "Incorrecta123", ip: "10.0.0.3" },
      now,
    );
    expect(failed).toEqual({ status: "error", message: GENERIC_LOGIN_ERROR });
    expect(repo.users.get("user-1")?.lockedUntil).not.toBeNull();

    const afterLock = await authenticateWithPassword(
      repo,
      { email: "admin@boleteria.local", password: "Correcta1234", ip: "10.0.0.4" },
      now,
    );
    expect(afterLock).toEqual({ status: "error", message: GENERIC_LOGIN_ERROR });
  });

  it("corta por rate limit antes de aceptar la contraseña", async () => {
    const passwordHash = await hashPassword("Correcta1234");
    const repo = memoryRepo([
      {
        id: "user-1",
        email: "admin@boleteria.local",
        passwordHash,
        active: true,
        failedLoginCount: 0,
        lockedUntil: null,
        totpEnabled: true,
        role: "ADMIN",
      },
    ]);

    const limits = { ip: 1, email: 10 };
    await authenticateWithPassword(
      repo,
      { email: "otro@boleteria.local", password: "Incorrecta123", ip: "10.0.0.9" },
      now,
      limits,
    );
    const limited = await authenticateWithPassword(
      repo,
      { email: "admin@boleteria.local", password: "Correcta1234", ip: "10.0.0.9" },
      now,
      limits,
    );
    expect(limited).toEqual({ status: "error", message: RATE_LIMIT_ERROR });
  });
});
