"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="text-sm underline print:hidden"
      onClick={() => window.print()}
    >
      Imprimir
    </button>
  );
}
