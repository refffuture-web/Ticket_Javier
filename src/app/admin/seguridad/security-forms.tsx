"use client";

import { useActionState } from "react";

import {
  changePasswordAction,
  confirmTotpAction,
  disableTotpAction,
  type SecurityState,
} from "@/app/admin/seguridad/actions";
import { Field, FormMessage } from "@/components/field";
import { Button } from "@/components/ui/button";

const initialState: SecurityState = { error: "", ok: "" };

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialState);
  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <Field label="Contraseña actual" name="currentPassword" type="password" required />
      <Field
        label="Nueva contraseña"
        name="newPassword"
        type="password"
        hint="Mínimo 12 caracteres, con una letra y un número."
        required
      />
      <FormMessage>{state.error}</FormMessage>
      {state.ok ? <p className="text-sm text-muted-foreground">{state.ok}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}

export function ConfirmTotpForm() {
  const [state, action, pending] = useActionState(confirmTotpAction, initialState);
  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <Field label="Código de 6 dígitos" name="code" inputMode="numeric" required />
      <FormMessage>{state.error}</FormMessage>
      {state.ok ? <p className="text-sm text-muted-foreground">{state.ok}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Verificando…" : "Activar"}
      </Button>
    </form>
  );
}

export function DisableTotpForm() {
  const [state, action, pending] = useActionState(disableTotpAction, initialState);
  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <Field label="Contraseña" name="currentPassword" type="password" required />
      <Field label="Código de 6 dígitos" name="code" inputMode="numeric" required />
      <FormMessage>{state.error}</FormMessage>
      {state.ok ? <p className="text-sm text-muted-foreground">{state.ok}</p> : null}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Desactivando…" : "Desactivar"}
      </Button>
    </form>
  );
}
