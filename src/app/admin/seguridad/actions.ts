"use server";

import { redirect } from "next/navigation";

import { writeAudit } from "@/server/audit";
import { requireArea } from "@/server/auth/guard";
import {
  hashPassword,
  passwordPolicyError,
  verifyPassword,
} from "@/server/auth/password";
import { requestContext } from "@/server/auth/request-context";
import { passwordChangeSchema, totpSchema } from "@/server/auth/schemas";
import { decryptString, encryptString } from "@/server/auth/secret-box";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { createTotpSecret, verifyTotp } from "@/server/auth/totp";

export type SecurityState = { error: string; ok: string };

export async function changePasswordAction(
  _state: SecurityState,
  formData: FormData,
): Promise<SecurityState> {
  const session = await requireArea("admin");
  const context = await requestContext();
  if (!context.originOk) return { error: "No se pudo completar la acción", ok: "" };

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: "Revisá las contraseñas", ok: "" };

  const policy = passwordPolicyError(parsed.data.newPassword);
  if (policy) return { error: policy, ok: "" };

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    return { error: "La contraseña actual no coincide", ok: "" };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  await writeAudit({
    userId: user.id,
    action: "user.password_changed",
    entity: "User",
    entityId: user.id,
    ip: context.ip,
  });
  return { error: "", ok: "Contraseña actualizada" };
}

export async function startTotpAction(): Promise<void> {
  const session = await requireArea("admin");
  const context = await requestContext();
  if (!context.originOk) redirect("/admin/seguridad?aviso=accion");
  const secret = createTotpSecret();
  await db.user.update({
    where: { id: session.userId },
    data: { totpSecretEnc: encryptString(secret, env.APP_SECRET), totpEnabled: false },
  });
  await writeAudit({
    userId: session.userId,
    action: "auth.totp.setup_started",
    entity: "User",
    entityId: session.userId,
    ip: context.ip,
  });
  redirect("/admin/seguridad");
}

export async function confirmTotpAction(
  _state: SecurityState,
  formData: FormData,
): Promise<SecurityState> {
  const session = await requireArea("admin");
  const context = await requestContext();
  if (!context.originOk) return { error: "No se pudo completar la acción", ok: "" };

  const parsed = totpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "El código tiene 6 dígitos", ok: "" };

  const user = await db.user.findUnique({ where: { id: session.userId } });
  const secret = user?.totpSecretEnc
    ? decryptString(user.totpSecretEnc, env.APP_SECRET)
    : null;
  if (!secret || !verifyTotp(secret, parsed.data.code)) {
    return { error: "Código incorrecto", ok: "" };
  }

  await db.user.update({ where: { id: session.userId }, data: { totpEnabled: true } });
  await writeAudit({
    userId: session.userId,
    action: "auth.totp.enabled",
    entity: "User",
    entityId: session.userId,
    ip: context.ip,
  });
  return { error: "", ok: "Autenticación en dos pasos activada" };
}

export async function disableTotpAction(
  _state: SecurityState,
  formData: FormData,
): Promise<SecurityState> {
  const session = await requireArea("admin");
  const context = await requestContext();
  if (!context.originOk) return { error: "No se pudo completar la acción", ok: "" };

  const parsed = totpSchema.safeParse({ code: formData.get("code") });
  const password = String(formData.get("currentPassword") ?? "");
  if (!parsed.success) return { error: "El código tiene 6 dígitos", ok: "" };

  const user = await db.user.findUnique({ where: { id: session.userId } });
  const secret = user?.totpSecretEnc
    ? decryptString(user.totpSecretEnc, env.APP_SECRET)
    : null;
  if (
    !user ||
    !secret ||
    !(await verifyPassword(user.passwordHash, password)) ||
    !verifyTotp(secret, parsed.data.code)
  ) {
    return { error: "No se pudo desactivar", ok: "" };
  }

  await db.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecretEnc: null },
  });
  await writeAudit({
    userId: user.id,
    action: "auth.totp.disabled",
    entity: "User",
    entityId: user.id,
    ip: context.ip,
  });
  return { error: "", ok: "Autenticación en dos pasos desactivada" };
}
