"use client";

import { useActionState } from "react";

import { Field, FormMessage } from "@/components/field";
import { Button } from "@/components/ui/button";
import { loginAction, verifyTotpAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: "" };

export function PasswordForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" name="email" type="email" autoComplete="username" required />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormMessage>{state.error}</FormMessage>
      <Button type="submit" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}

export function TotpForm() {
  const [state, action, pending] = useActionState(verifyTotpAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Código de la aplicación"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        required
      />
      <FormMessage>{state.error}</FormMessage>
      <Button type="submit" disabled={pending}>
        {pending ? "Verificando…" : "Confirmar"}
      </Button>
    </form>
  );
}
