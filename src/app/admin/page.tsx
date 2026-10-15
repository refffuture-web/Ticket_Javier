import { Suspense } from "react";

import { requireArea } from "@/server/auth/guard";

export const instant = false;

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  await requireArea("admin");
  return (
    <p className="text-sm text-muted-foreground">
      El armado de eventos está en Eventos. El público ya puede ver los publicados en la
      página de inicio.
    </p>
  );
}
