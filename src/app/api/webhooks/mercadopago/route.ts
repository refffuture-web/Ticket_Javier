import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { env } from "@/server/env";
import { confirmFromMercadoPago } from "@/server/payments/confirm";
import { mercadoPagoSignatureValid } from "@/server/payments/mercadopago";

export async function POST(request: Request) {
  if (!env.MP_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }
  const url = new URL(request.url);
  const body = await readJson(request);
  const dataId = firstId(url, body);
  if (
    !mercadoPagoSignatureValid({
      secret: env.MP_WEBHOOK_SECRET,
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    })
  ) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }
  if (!dataId) return NextResponse.json({ ok: true });

  const externalId = `payment:${dataId}`;
  try {
    await db.webhookEvent.create({
      data: {
        externalId,
        topic: "payment",
        payload: (body ?? { id: dataId }) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (!isUnique(error)) throw error;
  }
  await confirmFromMercadoPago(dataId);
  await db.webhookEvent.updateMany({
    where: { externalId, processedAt: null },
    data: { processedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

function firstId(url: URL, body: unknown): string | null {
  const fromQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (fromQuery) return fromQuery;
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: { id?: unknown } }).data;
  if (data?.id === undefined || data.id === null) return null;
  return String(data.id);
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function isUnique(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
