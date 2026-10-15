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

export function formatArs(cents: number): string {
  const value = assertCents(cents);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value / 100);
}
