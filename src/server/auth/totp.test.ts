import { describe, expect, it } from "vitest";

import { createTotpSecret, currentTotp, verifyTotp } from "./totp";

describe("TOTP", () => {
  it("acepta el código vigente y rechaza otro", () => {
    const now = Date.parse("2026-01-15T12:00:00.000Z");
    const secret = createTotpSecret();
    expect(verifyTotp(secret, currentTotp(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, "000000", now)).toBe(false);
    expect(verifyTotp(secret, "12", now)).toBe(false);
  });
});
