import { describe, expect, it } from "vitest";

import { readTicketToken, signTicket } from "./qr";

const secret = "qr-secret-de-prueba-con-32-caracteres";
const ticketId = "11111111-1111-4111-8111-111111111111";

describe("firma del QR", () => {
  it("acepta el token emitido y rechaza uno alterado", () => {
    const token = signTicket(ticketId, secret);
    expect(readTicketToken(token, secret)).toBe(ticketId);
    expect(readTicketToken(token, "otro-secreto-distinto-de-32-chars")).toBeNull();
    expect(readTicketToken(`${ticketId}.firma-falsa`, secret)).toBeNull();
    expect(readTicketToken("no-es-un-token", secret)).toBeNull();
  });
});
