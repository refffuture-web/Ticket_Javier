import { Suspense } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/time";
import { requireArea } from "@/server/auth/guard";
import { db } from "@/server/db";

import { setUserActiveAction, setUserRoleAction } from "./actions";
import { CreateUserForm } from "./create-user-form";

const notices: Record<string, string> = {
  ultimo: "Tiene que quedar al menos un administrador activo.",
  propio: "No podés cambiar tu propio usuario desde acá.",
  accion: "No se pudo completar la acción.",
};

const roleLabel = {
  ADMIN: "Administrador",
  BOLETERIA: "Boletería",
  VALIDADOR: "Validador",
} as const;

export const instant = false;

export default function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function UsersContent({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const session = await requireArea("admin");
  const params = await searchParams;
  const notice = params.aviso ? notices[params.aviso] : undefined;
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="flex flex-col gap-8">
      {notice ? <p className="text-sm text-destructive">{notice}</p> : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Usuarios</h2>
        <ul className="flex flex-col divide-y divide-border rounded-lg border">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground">
                  {roleLabel[user.role]} · {user.active ? "Activo" : "Inactivo"} ·{" "}
                  {formatDateTime(user.createdAt)}
                </p>
              </div>
              {user.id === session.userId ? (
                <span className="text-sm text-muted-foreground">Sesión actual</span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <form action={setUserRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      defaultValue={user.role}
                      aria-label={`Rol de ${user.name}`}
                      className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                    >
                      <option value="ADMIN">Administrador</option>
                      <option value="BOLETERIA">Boletería</option>
                      <option value="VALIDADOR">Validador</option>
                    </select>
                    <Button type="submit" variant="outline" size="sm">
                      Guardar rol
                    </Button>
                  </form>
                  <form action={setUserActiveAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={user.active ? "false" : "true"}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      {user.active ? "Desactivar" : "Activar"}
                    </Button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex max-w-md flex-col gap-3">
        <h2 className="text-lg font-medium">Nuevo usuario</h2>
        <CreateUserForm />
      </section>
      <Link href="/admin" className="text-sm underline-offset-4 hover:underline">
        Volver al panel
      </Link>
    </div>
  );
}
