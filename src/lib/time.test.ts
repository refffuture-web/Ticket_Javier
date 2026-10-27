import { describe, expect, it } from "vitest";

import { formatDateTime, mendozaLocalToUtc, utcToMendozaLocalInput } from "./time";

describe("horario de Mendoza", () => {
  it("muestra un instante UTC tres horas atrás", () => {
    expect(formatDateTime(new Date("2026-01-15T03:30:00.000Z"))).toBe(
      "15/01/2026 · 00:30",
    );
  });

  it("convierte un horario local de Mendoza a UTC", () => {
    expect(mendozaLocalToUtc("2026-01-15T00:30")?.toISOString()).toBe(
      "2026-01-15T03:30:00.000Z",
    );
    expect(mendozaLocalToUtc("15/01/2026 00:30")).toBeNull();
    expect(utcToMendozaLocalInput(new Date("2026-01-15T03:30:00.000Z"))).toBe(
      "2026-01-15T00:30",
    );
  });
});
