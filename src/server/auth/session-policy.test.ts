import { describe, expect, it } from "vitest";

import { ABSOLUTE_SESSION_MS, sessionExpiry, sessionIsActive } from "./session-policy";

describe("vigencia de la sesión", () => {
  it("renueva por actividad sin pasar el tope de 16 horas", () => {
    const createdAt = new Date("2026-01-15T00:00:00.000Z");
    const early = sessionExpiry(createdAt, createdAt);
    expect(early.getTime() - createdAt.getTime()).toBe(8 * 60 * 60 * 1000);

    const nearCap = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);
    expect(sessionExpiry(createdAt, nearCap).getTime()).toBe(
      createdAt.getTime() + ABSOLUTE_SESSION_MS,
    );
    expect(sessionIsActive(createdAt, sessionExpiry(createdAt, nearCap), nearCap)).toBe(
      true,
    );
    expect(
      sessionIsActive(
        createdAt,
        early,
        new Date(createdAt.getTime() + ABSOLUTE_SESSION_MS),
      ),
    ).toBe(false);
  });
});
