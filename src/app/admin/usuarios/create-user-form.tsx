"use client";

import { useActionState } from "react";

import { createUserAction, type UserFormState } from "@/app/admin/usuarios/actions";
import { Field, FormMessage } from "@/components/field";
import { Button } from "@/components/ui/button";

const initialState: UserFormState = { error: "", ok: "" };

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nombre" name="name" autoComplete="name" required />
      <Field label="Email" name="email" type="email" autoComplete="off" required />
      <Field
        label="Contraseña inicial"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 12 caracteres, con una letra y un número."
        required
      />
      <label className="flex flex-col gap-1 text-sm" htmlFor="role">
        <span className="font-medium">Rol</span>
        <select
          id="role"
          name="role"
          defaultValue="BOLETERIA"
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="ADMIN">Administrador</option>
          <option value="BOLETERIA">Boletería</option>
          <option value="VALIDADOR">Validador</option>
        </select>
      </label>
      <FormMessage>{state.error}</FormMessage>
      {state.ok ? <p className="text-sm text-muted-foreground">{state.ok}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear usuario"}
      </Button>
    </form>
  );
}
