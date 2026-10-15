import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { StaffShell } from "@/components/staff-shell";
import { requireArea } from "@/server/auth/guard";

export const instant = false;

export const metadata: Metadata = {
  title: "Validar entradas",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Validar" },
};

export default function ValidarLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<p className="px-4 py-16 text-sm text-muted-foreground">Cargando…</p>}
    >
      <ValidarShell>{children}</ValidarShell>
    </Suspense>
  );
}

async function ValidarShell({ children }: { children: ReactNode }) {
  await requireArea("validar");
  return <StaffShell title="Validación">{children}</StaffShell>;
}
