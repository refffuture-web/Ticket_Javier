import { requireArea } from "@/server/auth/guard";

export default async function BoleteriaPage() {
  await requireArea("boleteria");
  return (
    <p className="text-sm text-muted-foreground">
      La venta manual de entradas llega en la Fase 6.
    </p>
  );
}
