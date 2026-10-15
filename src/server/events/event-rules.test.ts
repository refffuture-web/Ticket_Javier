import { describe, expect, it } from "vitest";

import {
  availableSeats,
  canTransition,
  capacityChangeError,
  publicSale,
  publishBlocker,
  slugify,
  ticketTypeBoundsError,
} from "./event-rules";

describe("reglas de eventos", () => {
  it("arma un slug sin acentos", () => {
    expect(slugify("  Niño en la Fiesta! ")).toBe("nino-en-la-fiesta");
    expect(slugify("---")).toBe("");
  });

  it("permite publicar, finalizar, cancelar y reabrir", () => {
    expect(canTransition("BORRADOR", "PUBLICADO")).toBe(true);
    expect(canTransition("PUBLICADO", "CANCELADO")).toBe(true);
    expect(canTransition("PUBLICADO", "FINALIZADO")).toBe(true);
    expect(canTransition("CANCELADO", "BORRADOR")).toBe(true);
    expect(canTransition("FINALIZADO", "PUBLICADO")).toBe(false);
    expect(canTransition("BORRADOR", "FINALIZADO")).toBe(false);
  });

  it("exige un tipo de entrada activo para publicar", () => {
    expect(publishBlocker(0)).toMatch(/tipo de entrada/);
    expect(publishBlocker(1)).toBeNull();
  });

  it("no deja bajar el cupo por debajo de lo comprometido", () => {
    expect(capacityChangeError(4, 3, 2)).toMatch(/vendido/);
    expect(capacityChangeError(5, 3, 2)).toBeNull();
    expect(
      ticketTypeBoundsError({
        capacity: 10,
        maxPerOrder: 11,
        soldCount: 0,
        reservedCount: 0,
        saleStartsAt: null,
        saleEndsAt: null,
      }),
    ).toMatch(/máximo/);
  });

  it("informa si una entrada se puede ofrecer al público", () => {
    const now = new Date("2026-06-01T18:00:00.000Z");
    expect(availableSeats(10, 3, 2)).toBe(5);
    expect(
      publicSale({
        capacity: 10,
        soldCount: 8,
        reservedCount: 2,
        saleStartsAt: null,
        saleEndsAt: null,
        now,
      }),
    ).toBe("agotado");
    expect(
      publicSale({
        capacity: 10,
        soldCount: 0,
        reservedCount: 0,
        saleStartsAt: new Date("2026-06-02T18:00:00.000Z"),
        saleEndsAt: null,
        now,
      }),
    ).toBe("proximamente");
    expect(
      publicSale({
        capacity: 10,
        soldCount: 0,
        reservedCount: 0,
        saleStartsAt: null,
        saleEndsAt: new Date("2026-06-01T18:00:00.000Z"),
        now,
      }),
    ).toBe("finalizada");
    expect(
      publicSale({
        capacity: 10,
        soldCount: 1,
        reservedCount: 1,
        saleStartsAt: null,
        saleEndsAt: null,
        now,
      }),
    ).toBe("disponible");
  });
});
