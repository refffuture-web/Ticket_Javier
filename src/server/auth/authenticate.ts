import { createHash } from "node:crypto";

import type { Role } from "./access";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "./password";
import {
  consumeLimit,
  isLocked,
  LOGIN_EMAIL_LIMIT,
  LOGIN_IP_LIMIT,
  LOGIN_WINDOW_MS,
  nextLockout,
  type RateLimitStore,
} from "./rate-limit";

export const GENERIC_LOGIN_ERROR = "Email o contraseña incorrectos";
export const RATE_LIMIT_ERROR = "Demasiados intentos. Probá de nuevo más tarde.";

export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  active: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
  totpEnabled: boolean;
  role: Role;
};

export type AuthRepo = {
  findByEmail(email: string): Promise<AuthUser | null>;
  updateLoginState(
    id: string,
    state: { failedLoginCount: number; lockedUntil: Date | null },
  ): Promise<void>;
  rateLimit: RateLimitStore;
};

export type AuthSuccess = {
  status: "ok";
  userId: string;
  totpEnabled: boolean;
  role: Role;
};

export type AuthFailure = {
  status: "error";
  message: string;
};

type Limits = {
  ip: number;
  email: number;
};

const defaultLimits: Limits = {
  ip: LOGIN_IP_LIMIT,
  email: LOGIN_EMAIL_LIMIT,
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailRateKey(email: string): string {
  const hash = createHash("sha256").update(normalizeEmail(email)).digest("hex");
  return `login:email:${hash}`;
}

export async function authenticateWithPassword(
  repo: AuthRepo,
  input: { email: string; password: string; ip: string },
  now: Date,
  limits: Limits = defaultLimits,
): Promise<AuthSuccess | AuthFailure> {
  const email = normalizeEmail(input.email);
  const ipAllowed = await consumeLimit(
    repo.rateLimit,
    `login:ip:${input.ip}`,
    limits.ip,
    LOGIN_WINDOW_MS,
    now,
  );
  const emailAllowed = await consumeLimit(
    repo.rateLimit,
    emailRateKey(email),
    limits.email,
    LOGIN_WINDOW_MS,
    now,
  );
  if (!ipAllowed.allowed || !emailAllowed.allowed) {
    return { status: "error", message: RATE_LIMIT_ERROR };
  }

  const user = await repo.findByEmail(email);
  const passwordOk = await verifyPassword(
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    input.password,
  );
  const locked = user ? isLocked(user.lockedUntil, now) : false;

  if (!user || !user.active || !passwordOk || locked) {
    if (user && user.active && !locked) {
      await repo.updateLoginState(user.id, nextLockout(user.failedLoginCount, now));
    }
    return { status: "error", message: GENERIC_LOGIN_ERROR };
  }

  await repo.updateLoginState(user.id, { failedLoginCount: 0, lockedUntil: null });
  return {
    status: "ok",
    userId: user.id,
    totpEnabled: user.totpEnabled,
    role: user.role,
  };
}
