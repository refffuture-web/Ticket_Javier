import { describe, expect, it } from "vitest";

import { readPendingLogin, signPendingLogin } from "./pending-login";

const secret = "test-app-secret-with-32-characters-min";

describe("login pendiente de 2FA", () => {
  it("acepta un token vigente y rechaza firma, vencimiento y alteraciones", () => {
    const now = 1_700_000_000_000;
    const token = signPendingLogin("user_1", now + 60_000, secret);
    expect(readPendingLogin(token, secret, now)).toBe("user_1");
    expect(readPendingLogin(token, "otro-secreto-distinto-de-32-chars", now)).toBeNull();
    expect(readPendingLogin(token, secret, now + 120_000)).toBeNull();
    expect(readPendingLogin(`${token}x`, secret, now)).toBeNull();
  });
});
