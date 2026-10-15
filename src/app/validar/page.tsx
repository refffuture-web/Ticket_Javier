import { requireArea } from "@/server/auth/guard";

export default async function ValidarPage() {
  await requireArea("validar");
  return (
    <p className="text-sm text-muted-foreground">
      El escáner de entradas llega en la Fase 7.
    </p>
  );
}
