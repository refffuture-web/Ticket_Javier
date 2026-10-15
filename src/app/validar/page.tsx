import { Suspense } from "react";

import { requireArea } from "@/server/auth/guard";

export const instant = false;

export default function ValidarPage() {
  return (
    <Suspense fallback={null}>
      <ValidarHome />
    </Suspense>
  );
}

async function ValidarHome() {
  await requireArea("validar");
  return (
    <p className="text-sm text-muted-foreground">
      El escáner de entradas llega en la Fase 7.
    </p>
  );
}
