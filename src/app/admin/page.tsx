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
      Los eventos publicados se venden en la página de inicio y en Boletería. Las ventas y
      anulaciones están en Ventas.
    </p>
  );
}
