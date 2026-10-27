import { Suspense, type ReactNode } from "react";
import Link from "next/link";

import { StaffShell } from "@/components/staff-shell";
import { requireArea } from "@/server/auth/guard";

export const instant = false;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<p className="px-4 py-16 text-sm text-muted-foreground">Cargando…</p>}
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: ReactNode }) {
  const session = await requireArea("admin");
  return (
    <StaffShell title="Administración">
      <p className="text-sm text-muted-foreground">
        {session.name}
        {session.totpEnabled
          ? ""
          : " · Te recomendamos activar la autenticación en dos pasos."}
      </p>
      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href="/admin/eventos" className="underline-offset-4 hover:underline">
          Eventos
        </Link>
        <Link href="/admin/ventas" className="underline-offset-4 hover:underline">
          Ventas
        </Link>
        <Link href="/admin/ingresos" className="underline-offset-4 hover:underline">
          Ingresos
        </Link>
        <Link href="/admin/contactos" className="underline-offset-4 hover:underline">
          Contactos
        </Link>
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
