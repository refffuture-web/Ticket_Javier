import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { mercadoPagoSignatureValid } from "./mercadopago";

describe("firma del webhook de Mercado Pago", () => {
  it("acepta el manifiesto oficial y rechaza una firma cambiada", () => {
    const secret = "webhook-secret";
    const dataId = "123456";
    const requestId = "req-1";
    const ts = "1700000000";
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
    const header = `ts=${ts},v1=${v1}`;
    expect(
      mercadoPagoSignatureValid({
        secret,
        xSignature: header,
        xRequestId: requestId,
        dataId,
      }),
    ).toBe(true);
    expect(
      mercadoPagoSignatureValid({
        secret,
        xSignature: `ts=${ts},v1=${"0".repeat(v1.length)}`,
        xRequestId: requestId,
        dataId,
      }),
    ).toBe(false);
  });
});
