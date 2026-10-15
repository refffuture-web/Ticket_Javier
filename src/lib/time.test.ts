import { describe, expect, it } from "vitest";

import { formatDateTime } from "./time";

describe("horario de Mendoza", () => {
  it("muestra un instante UTC tres horas atrás", () => {
    expect(formatDateTime(new Date("2026-01-15T03:30:00.000Z"))).toBe(
      "15/01/2026, 00:30",
    );
  });
});
