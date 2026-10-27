import { describe, expect, it } from "vitest";

import { countdownLabel, pad2, remainingParts } from "./countdown";

describe("contador del evento", () => {
  it("parte el tiempo que falta en días, horas, minutos y segundos", () => {
    const now = Date.parse("2026-10-25T12:00:00.000Z");
    const target = now + ((2 * 86_400 + 3 * 3_600 + 4 * 60 + 5) * 1000);
    expect(remainingParts(target, now)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });

  it("no cuenta un evento que ya empezó", () => {
    const now = Date.parse("2026-10-25T12:00:00.000Z");
    expect(remainingParts(now, now)).toBeNull();
    expect(remainingParts(now - 1_000, now)).toBeNull();
    expect(remainingParts(Number.NaN, now)).toBeNull();
  });

  it("arma la etiqueta en español", () => {
    expect(countdownLabel({ days: 1, hours: 0, minutes: 1, seconds: 2 })).toBe(
      "Faltan 1 día, 0 horas, 1 minuto y 2 segundos",
    );
    expect(pad2(4)).toBe("04");
  });
});
