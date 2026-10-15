import { createHmac, timingSafeEqual } from "node:crypto";

export type PreferenceItem = {
  title: string;
  quantity: number;
  unitPriceCents: number;
};

export type Preference = {
  id: string;
  url: string;
};

export function mercadoPagoSignatureValid(input: {
  secret: string;
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  if (!input.xSignature || !input.xRequestId || !input.dataId) return false;
  const parts = Object.fromEntries(
    input.xSignature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim() ?? "", value?.trim() ?? ""];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
  const given = Buffer.from(v1);
  const target = Buffer.from(expected);
  if (given.length !== target.length) return false;
  return timingSafeEqual(given, target);
}

export async function createCheckoutPreference(input: {
  accessToken: string;
  orderId: string;
  appUrl: string;
  items: PreferenceItem[];
}): Promise<Preference> {
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: input.items.map((item) => ({
        title: item.title.slice(0, 200),
        quantity: item.quantity,
        currency_id: "ARS",
        unit_price: item.unitPriceCents / 100,
      })),
      external_reference: input.orderId,
      notification_url: `${input.appUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${input.appUrl}/compra/${input.orderId}`,
        pending: `${input.appUrl}/compra/${input.orderId}`,
        failure: `${input.appUrl}/compra/${input.orderId}`,
      },
      auto_return: "approved",
    }),
  });
  if (!response.ok) {
    throw new Error("Mercado Pago rechazó la preferencia");
  }
  const body = (await response.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
  };
  const url = input.accessToken.startsWith("TEST-")
    ? body.sandbox_init_point
    : body.init_point;
  if (!body.id || !url) throw new Error("Mercado Pago no devolvió el enlace de pago");
  return { id: body.id, url };
}

export type MercadoPagoPayment = {
  id: string;
  status: string;
  externalReference: string | null;
  amountCents: number | null;
};

export async function fetchPayment(
  accessToken: string,
  paymentId: string,
): Promise<MercadoPagoPayment | null> {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudo consultar el pago");
  const body = (await response.json()) as {
    id?: number | string;
    status?: string;
    external_reference?: string | null;
    transaction_amount?: number;
  };
  if (!body.id || !body.status) return null;
  const amountCents =
    typeof body.transaction_amount === "number"
      ? Math.round(body.transaction_amount * 100)
      : null;
  return {
    id: String(body.id),
    status: body.status,
    externalReference: body.external_reference ?? null,
    amountCents,
  };
}
