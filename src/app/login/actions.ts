"use server";

import { redirect } from "next/navigation";

import { writeAudit } from "@/server/audit";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { prismaAuthRepo } from "@/server/auth/auth-repo";
import {
  authenticateWithPassword,
  emailRateKey,
  GENERIC_LOGIN_ERROR,
  RATE_LIMIT_ERROR,
} from "@/server/auth/authenticate";
import { homeForRole, safeNextPath } from "@/server/auth/access";
import { decryptString } from "@/server/auth/secret-box";
import { requestContext } from "@/server/auth/request-context";
import { loginSchema, totpSchema } from "@/server/auth/schemas";
import { consumeLimit, LOGIN_WINDOW_MS } from "@/server/auth/rate-limit";
import { prismaRateLimitStore } from "@/server/auth/rate-limit-store";
import {
  clearPendingLogin,
  clearSession,
  getSession,
  readPendingUserId,
  setPendingLogin,
  startSession,
} from "@/server/auth/session";
import { verifyTotp } from "@/server/auth/totp";

export type LoginState = { error: string };

const rejectedAction = "No se pudo completar la acción";

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const context = await requestContext();
  if (!context.originOk) return { error: rejectedAction };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: GENERIC_LOGIN_ERROR };

  const result = await authenticateWithPassword(
    prismaAuthRepo(),
    { email: parsed.data.email, password: parsed.data.password, ip: context.ip },
    new Date(),
  );

  if (result.status === "error") {
    await writeAudit({
      action: "auth.login.failure",
      entity: "User",
      metadata: { emailKey: emailRateKey(parsed.data.email) },
      ip: context.ip,
    });
    return { error: result.message };
  }

  if (result.totpEnabled) {
    await setPendingLogin(result.userId);
    redirect("/login?paso=codigo");
  }

  await startSession(result.userId, context);
  await writeAudit({
    userId: result.userId,
    action: "auth.login.success",
    entity: "User",
    entityId: result.userId,
    ip: context.ip,
  });
  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null, result.role));
}

export async function verifyTotpAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const context = await requestContext();
  if (!context.originOk) return { error: rejectedAction };

  const userId = await readPendingUserId();
  if (!userId) return { error: "El código venció. Volvé a ingresar." };

  const parsed = totpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "El código tiene 6 dígitos" };

  const limited = await consumeLimit(
    prismaRateLimitStore(),
    `login:totp:${userId}`,
    5,
    LOGIN_WINDOW_MS,
    new Date(),
  );
  if (!limited.allowed) {
    await clearPendingLogin();
    return { error: RATE_LIMIT_ERROR };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  const secret = user?.totpSecretEnc
    ? decryptString(user.totpSecretEnc, env.APP_SECRET)
    : null;
  if (
    !user?.active ||
    !user.totpEnabled ||
    !secret ||
    !verifyTotp(secret, parsed.data.code)
  ) {
    await writeAudit({
      userId,
      action: "auth.login.totp_failure",
      entity: "User",
      entityId: userId,
      ip: context.ip,
    });
    return { error: "Código incorrecto" };
  }

  await startSession(user.id, context);
  await writeAudit({
    userId: user.id,
    action: "auth.login.success",
    entity: "User",
    entityId: user.id,
    ip: context.ip,
  });
  redirect(homeForRole(user.role));
}

export async function logoutAction(): Promise<void> {
  const context = await requestContext();
  const session = context.originOk ? await getSession() : null;
  if (session) {
    await writeAudit({
      userId: session.userId,
      action: "auth.logout",
      entity: "User",
      entityId: session.userId,
      ip: context.ip,
    });
  }
  await clearSession();
  redirect("/login");
}
