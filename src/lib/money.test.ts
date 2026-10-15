import { describe, expect, it } from "vitest";

import {
  assertCents,
  formatArs,
  formatArsInput,
  lineTotalCents,
  parseArsToCents,
  sumCents,
} from "./money";

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

  it("lee un precio escrito con coma decimal", () => {
    expect(parseArsToCents("1500,50")).toBe(150_050);
    expect(parseArsToCents("1.500")).toBe(150_000);
    expect(parseArsToCents("0")).toBe(0);
    expect(parseArsToCents("1.50")).toBeNull();
    expect(parseArsToCents("-10")).toBeNull();
    expect(formatArsInput(150_050)).toBe("1500,50");
    expect(formatArsInput(150_000)).toBe("1500");
  });
});
