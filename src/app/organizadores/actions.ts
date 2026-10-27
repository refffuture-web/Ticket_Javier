"use server";

import { z } from "zod";

import { AUDIENCES, EVENT_TYPES, type ContactFormState } from "@/lib/organizer-contact";
import { consumeLimit } from "@/server/auth/rate-limit";
import { prismaRateLimitStore } from "@/server/auth/rate-limit-store";
import { requestContext } from "@/server/auth/request-context";
import { db } from "@/server/db";
import { normalizePhone } from "@/server/orders/rules";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null));

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.union([z.literal(""), z.email().max(200)]).transform((value) => value || null),
  organization: optional(120),
  city: optional(80),
  eventType: z.enum(EVENT_TYPES).nullable(),
  eventDate: optional(40),
  audience: z.enum(AUDIENCES).nullable(),
  message: optional(2000),
});

export async function sendOrganizerContactAction(
  _state: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const context = await requestContext();
  if (!context.originOk) return { ok: false, error: "No se pudo enviar el formulario." };

  // Campo oculto: solo lo completan los bots.
  if (String(formData.get("website") ?? "").length > 0) return { ok: true, error: "" };

  const limit = await consumeLimit(
    prismaRateLimitStore(),
    `contact:${context.ip}`,
    5,
    60 * 60 * 1000,
    new Date(),
  );
  if (!limit.allowed) {
    return { ok: false, error: "Recibimos varios mensajes desde tu conexión. Probá más tarde." };
  }
  if (formData.get("privacy") !== "on") {
    return { ok: false, error: "Tenés que aceptar el aviso de privacidad." };
  }

  const text = (name: string) => String(formData.get(name) ?? "");
  const choice = (name: string) => (text(name) === "" ? null : text(name));
  const parsed = contactSchema.safeParse({
    name: text("name"),
    email: text("email").trim(),
    organization: text("organization"),
    city: text("city"),
    eventType: choice("eventType"),
    eventDate: text("eventDate"),
    audience: choice("audience"),
    message: text("message"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const messages: Record<string, string> = {
      name: "Escribí tu nombre.",
      email: "El email no es válido.",
    };
    return {
      ok: false,
      error: (typeof field === "string" && messages[field]) || "Revisá los datos del formulario.",
    };
  }
  const rawPhone = text("phone").trim();
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) return { ok: false, error: "El teléfono no es válido." };
  if (!parsed.data.email && !phone) {
    return { ok: false, error: "Dejanos un email o un teléfono para poder contactarte." };
  }

  try {
    await db.organizerContact.create({ data: { ...parsed.data, phone, ip: context.ip } });
  } catch (error) {
    console.error("No se pudo guardar el contacto de organizador", error);
    return { ok: false, error: "No pudimos enviar el formulario. Probá de nuevo en un rato." };
  }
  return { ok: true, error: "" };
}
