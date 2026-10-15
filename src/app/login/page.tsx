import { Suspense } from "react";
import { redirect } from "next/navigation";

import { homeForRole } from "@/server/auth/access";
import { readPendingUserId, getSession } from "@/server/auth/session";

import { PasswordForm, TotpForm } from "./login-form";

export const instant = false;

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ paso?: string; next?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </main>
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ paso?: string; next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));

  const params = await searchParams;
  const pending = params.paso === "codigo" ? await readPendingUserId() : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Ingreso del personal</h1>
        <p className="text-sm text-muted-foreground">
          {pending
            ? "Ingresá el código de 6 dígitos de tu aplicación de autenticación."
            : "Usá el email y la contraseña que te dio el administrador."}
        </p>
      </div>
      {pending ? <TotpForm /> : <PasswordForm next={params.next} />}
    </main>
  );
}
