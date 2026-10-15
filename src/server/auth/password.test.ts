import { describe, expect, it } from "vitest";

import { hashPassword, passwordPolicyError, verifyPassword } from "./password";

describe("política de contraseña", () => {
  it("exige 12 caracteres, una letra y un número", () => {
    expect(passwordPolicyError("corta1")).toMatch(/12/);
    expect(passwordPolicyError("sololetraslargas")).toMatch(/número/);
    expect(passwordPolicyError("123456789012")).toMatch(/letra/);
    expect(passwordPolicyError("Correcta1234")).toBeNull();
  });

  it("verifica el hash con argon2id", async () => {
    const passwordHash = await hashPassword("Correcta1234");
    expect(await verifyPassword(passwordHash, "Correcta1234")).toBe(true);
    expect(await verifyPassword(passwordHash, "OtraClave1234")).toBe(false);
  });
});
