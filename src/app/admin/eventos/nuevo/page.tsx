import { Suspense } from "react";
import Link from "next/link";

import { EventDetailsForm } from "@/app/admin/eventos/event-forms";
import { requireArea } from "@/server/auth/guard";

export const instant = false;

export default function NewEventPage() {
  return (
    <Suspense fallback={null}>
      <NewEvent />
    </Suspense>
  );
}

async function NewEvent() {
  await requireArea("admin");
  return (
    <section className="flex max-w-xl flex-col gap-4">
      <h2 className="text-lg font-medium">Nuevo evento</h2>
      <p className="text-sm text-muted-foreground">
        Queda en borrador. Después sumás la grilla y los tipos de entrada, y recién ahí se
        puede publicar.
      </p>
      <EventDetailsForm />
      <Link href="/admin/eventos" className="text-sm underline-offset-4 hover:underline">
        Volver al listado
      </Link>
    </section>
  );
}
