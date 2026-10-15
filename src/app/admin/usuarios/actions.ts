"use server";

import { redirect } from "next/navigation";

import { writeAudit } from "@/server/audit";
import { normalizeEmail } from "@/server/auth/authenticate";
import { requireArea } from "@/server/auth/guard";
import { hashPassword, passwordPolicyError } from "@/server/auth/password";
import { requestContext } from "@/server/auth/request-context";
import { createUserSchema } from "@/server/auth/schemas";
import { db } from "@/server/db";

import type { Role } from "@/server/auth/access";

export type UserFormState = { error: string; ok: string };

function uniqueEmail(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN" || !user.active) return false;
  const admins = await db.user.count({ where: { role: "ADMIN", active: true } });
  return admins <= 1;
}

export async function createUserAction(
  _state: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const session = await requireArea("admin");
  const context = await requestContext();
  if (!context.originOk) return { error: "No se pudo completar la acción", ok: "" };

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Revisá los datos del usuario", ok: "" };

  const policy = passwordPolicyError(parsed.data.password);
  if (policy) return { error: policy, ok: "" };

  try {
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: normalizeEmail(parsed.data.email),
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
      },
    });
    await writeAudit({
      userId: session.userId,
      action: "user.created",
      entity: "User",
      entityId: user.id,
      metadata: { role: user.role },
      ip: context.ip,
    });
    return { error: "", ok: "Usuario creado" };
  } catch (error) {
    if (uniqueEmail(error)) return { error: "Ese email ya está registrado", ok: "" };
    console.error("No se pudo crear el usuario");
    return { error: "No se pudo crear el usuario", ok: "" };
  }
}

export async function setUserActiveAction(formData: FormData): Promise<void> {
  const session = await requireArea("admin");
  const context = await requestContext();
  if (!context.originOk) redirect("/admin/usuarios?aviso=accion");

  const userId = String(formData.get("userId") ?? "");
  const active = formData.get("active") === "true";
  if (userId === session.userId && !active) redirect("/admin/usuarios?aviso=propio");
  if (!active && (await isLastActiveAdmin(userId)))
    redirect("/admin/usuarios?aviso=ultimo");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/admin/usuarios?aviso=accion");

  await db.user.update({ where: { id: userId }, data: { active } });
  await writeAudit({
    userId: session.userId,
    action: active ? "user.reactivated" : "user.deactivated",
    entity: "User",
    entityId: userId,
    ip: context.ip,
  });
  redirect("/admin/usuarios");
}

export async function setUserRoleAction(formData: FormData): Promise<void> {
  const session = await requireArea("admin");
  const context = await requestContext();
  if (!context.originOk) redirect("/admin/usuarios?aviso=accion");

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (role !== "ADMIN" && role !== "BOLETERIA" && role !== "VALIDADOR") {
    redirect("/admin/usuarios?aviso=accion");
  }
  if (userId === session.userId) redirect("/admin/usuarios?aviso=propio");
  if (role !== "ADMIN" && (await isLastActiveAdmin(userId))) {
    redirect("/admin/usuarios?aviso=ultimo");
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/admin/usuarios?aviso=accion");

  await db.user.update({ where: { id: userId }, data: { role: role as Role } });
  await writeAudit({
    userId: session.userId,
    action: "user.role_changed",
    entity: "User",
    entityId: userId,
    metadata: { role },
    ip: context.ip,
  });
  redirect("/admin/usuarios");
}
