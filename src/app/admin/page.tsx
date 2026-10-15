import { requireArea } from "@/server/auth/guard";

export default async function AdminPage() {
  await requireArea("admin");
  return (
    <p className="text-sm text-muted-foreground">
      Desde acá vas a gestionar eventos, entradas y reportes. Esos módulos llegan en las
      próximas fases.
    </p>
  );
}
