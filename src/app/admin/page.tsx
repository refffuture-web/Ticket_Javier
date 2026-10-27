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
      En Ventas podés emitir entradas por evento (igual que Boletería), ver órdenes y
      anular o reembolsar. La venta online está en la página pública de cada evento.
    </p>
  );
}
