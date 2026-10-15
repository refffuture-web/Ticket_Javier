import { Suspense } from "react";

import { requireArea } from "@/server/auth/guard";

export const instant = false;

export default function BoleteriaPage() {
  return (
    <Suspense fallback={null}>
      <BoleteriaHome />
    </Suspense>
  );
}

async function BoleteriaHome() {
  await requireArea("boleteria");
  return (
    <p className="text-sm text-muted-foreground">
      La venta manual de entradas llega en la Fase 6.
    </p>
  );
}
