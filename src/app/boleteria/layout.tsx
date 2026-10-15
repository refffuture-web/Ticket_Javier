import { Suspense, type ReactNode } from "react";

import { StaffShell } from "@/components/staff-shell";
import { requireArea } from "@/server/auth/guard";

export const instant = false;

export default function BoleteriaLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<p className="px-4 py-16 text-sm text-muted-foreground">Cargando…</p>}
    >
      <BoleteriaShell>{children}</BoleteriaShell>
    </Suspense>
  );
}

async function BoleteriaShell({ children }: { children: ReactNode }) {
  await requireArea("boleteria");
  return <StaffShell title="Boletería">{children}</StaffShell>;
}
