"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Salir
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-description"
            className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-background p-5 shadow-xl"
          >
            <div className="flex flex-col gap-1">
              <h2 id="logout-title" className="text-lg font-semibold">
                ¿Cerrar sesión?
              </h2>
              <p id="logout-description" className="text-sm text-muted-foreground">
                Vas a tener que volver a ingresar con tu usuario y contraseña.
              </p>
            </div>
            <form action={logoutAction} className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                autoFocus
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <ConfirmButton />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="lg" disabled={pending}>
      <LogOut />
      {pending ? "Cerrando…" : "Sí, cerrar sesión"}
    </Button>
  );
}
