import type { ReactNode } from "react";
import Link from "next/link";

import { StaffShell } from "@/components/staff-shell";
import { requireArea } from "@/server/auth/guard";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireArea("admin");
  return (
    <StaffShell title="Administración">
      <p className="text-sm text-muted-foreground">
        {session.name}
        {session.totpEnabled
          ? ""
          : " · Te recomendamos activar la autenticación en dos pasos."}
      </p>
      <nav className="flex gap-4 text-sm">
        <Link href="/admin/usuarios" className="underline-offset-4 hover:underline">
          Usuarios
        </Link>
        <Link href="/admin/seguridad" className="underline-offset-4 hover:underline">
          Seguridad
        </Link>
      </nav>
      {children}
    </StaffShell>
  );
}
