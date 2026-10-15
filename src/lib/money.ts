export function assertCents(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error("El monto debe ser un entero en centavos");
  }
  return value;
}

export function lineTotalCents(unitPriceCents: number, quantity: number): number {
  const unit = assertCents(unitPriceCents);
  if (unit < 0) {
    throw new Error("El precio no puede ser negativo");
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error("La cantidad debe ser un entero mayor a cero");
  }
  const total = unit * quantity;
  if (!Number.isSafeInteger(total)) {
    throw new Error("El total excede el rango seguro de enteros");
  }
  return total;
}

export function sumCents(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => {
    const next = total + assertCents(amount);
    if (!Number.isSafeInteger(next)) {
      throw new Error("El total excede el rango seguro de enteros");
    }
    return next;
  }, 0);
}

export function parseArsToCents(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, "").replace(/^\$/, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(trimmed)) return null;
  const pesos = Number(trimmed.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(pesos) || pesos < 0) return null;
  const cents = Math.round(pesos * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatArsInput(cents: number): string {
  const value = assertCents(cents);
  const abs = Math.abs(value);
  const pesos = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  const body = fraction === "00" ? String(pesos) : `${pesos},${fraction}`;
  return value < 0 ? `-${body}` : body;
}

export function formatArs(cents: number): string {
  const value = assertCents(cents);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value / 100);
}
