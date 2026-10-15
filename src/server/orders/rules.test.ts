import { describe, expect, it } from "vitest";

import {
  normalizePhone,
  orderTotalCents,
  saleLinesError,
  type SaleLineInput,
} from "./rules";

const now = new Date("2026-06-01T18:00:00.000Z");

function line(overrides: Partial<SaleLineInput> = {}): SaleLineInput {
  return {
    ticketTypeId: "tipo",
    name: "General",
    priceCents: 150_000,
    capacity: 10,
    soldCount: 0,
    reservedCount: 0,
    maxPerOrder: 4,
    active: true,
    saleStartsAt: null,
    saleEndsAt: null,
    quantity: 2,
    ...overrides,
  };
}

describe("reglas de compra", () => {
  it("normaliza un teléfono argentino", () => {
    expect(normalizePhone("261 555-1234")).toBe("261 555-1234");
    expect(normalizePhone("123")).toBeNull();
  });

  it("rechaza un pedido vacío o por encima del máximo", () => {
    expect(saleLinesError([line({ quantity: 0 })], now)).toMatch(/al menos/);
    expect(saleLinesError([line({ quantity: 5 })], now)).toMatch(/máximo/);
    expect(saleLinesError([line()], now)).toBeNull();
  });

  it("calcula el total en centavos", () => {
    expect(orderTotalCents([line({ quantity: 2 }), line({ quantity: 0 })], now)).toBe(
      300_000,
    );
  });
});
