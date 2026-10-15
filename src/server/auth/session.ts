import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { connection } from "next/server";

import { db } from "@/server/db";
import { env } from "@/server/env";

import type { Role } from "./access";
import { PENDING_LOGIN_MS, readPendingLogin, signPendingLogin } from "./pending-login";
import { sessionExpiry, sessionIsActive } from "./session-policy";

export const SESSION_COOKIE = "boleteria_session";
export const PENDING_COOKIE = "boleteria_pending";

export type CurrentSession = {
  userId: string;
  role: Role;
  email: string;
  name: string;
  totpEnabled: boolean;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function readSessionByToken(
  token: string | undefined,
  now: Date,
): Promise<{ session: CurrentSession | null; clearCookie: boolean }> {
  if (!token) return { session: null, clearCookie: false };

  const row = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!row || !row.user.active || !sessionIsActive(row.createdAt, row.expiresAt, now)) {
    if (row) {
      await db.session.delete({ where: { id: row.id } });
    }
    return { session: null, clearCookie: Boolean(token) };
  }

  if (row.expiresAt.getTime() - now.getTime() < 2 * 60 * 60 * 1000) {
    await db.session.update({
      where: { id: row.id },
      data: { expiresAt: sessionExpiry(row.createdAt, now) },
    });
  }

  return {
    clearCookie: false,
    session: {
      userId: row.user.id,
      role: row.user.role,
      email: row.user.email,
      name: row.user.name,
      totpEnabled: row.user.totpEnabled,
    },
  };
}

export async function getSession(): Promise<CurrentSession | null> {
  await connection();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const result = await readSessionByToken(token, new Date());
  return result.session;
}

export async function startSession(
  userId: string,
  meta: { ip: string; userAgent: string | null },
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = sessionExpiry(now, now);
  await db.session.deleteMany({ where: { userId } });
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 200) ?? null,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  jar.delete(PENDING_COOKIE);
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(PENDING_COOKIE);
}

export async function setPendingLogin(userId: string): Promise<void> {
  const expiresAt = Date.now() + PENDING_LOGIN_MS;
  const token = signPendingLogin(userId, expiresAt, env.APP_SECRET);
  const jar = await cookies();
  jar.set(PENDING_COOKIE, token, cookieOptions(new Date(expiresAt)));
}

export async function readPendingUserId(): Promise<string | null> {
  await connection();
  const jar = await cookies();
  const token = jar.get(PENDING_COOKIE)?.value;
  if (!token) return null;
  return readPendingLogin(token, env.APP_SECRET, Date.now());
}

export async function clearPendingLogin(): Promise<void> {
  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
}
