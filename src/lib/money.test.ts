import { describe, expect, it } from "vitest";

import { assertCents, formatArs, lineTotalCents, sumCents } from "./money";

describe("dinero en centavos", () => {
  it("calcula el total de una línea sin decimales", () => {
    expect(lineTotalCents(250_000, 2)).toBe(500_000);
  });

  it("rechaza precios que no son enteros", () => {
    expect(() => lineTotalCents(10.5, 1)).toThrow(/entero/);
  });

  it("rechaza cantidades menores a uno", () => {
    expect(() => lineTotalCents(100, 0)).toThrow(/cantidad/);
  });

  it("suma importes enteros", () => {
    expect(sumCents([100, 250, 0])).toBe(350);
  });

  it("formatea pesos argentinos desde centavos", () => {
    expect(formatArs(150_050)).toBe(
      new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
        1500.5,
      ),
    );
    expect(assertCents(-100)).toBe(-100);
  });
});
