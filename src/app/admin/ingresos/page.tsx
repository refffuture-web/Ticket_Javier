import { Suspense } from "react";

import { ScanLog } from "@/components/scan-log";
import { requireArea } from "@/server/auth/guard";

export const instant = false;

type SearchParams = Promise<{ evento?: string; ver?: string }>;

export default function AdminEntriesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <AdminEntries searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminEntries({ searchParams }: { searchParams: SearchParams }) {
  await requireArea("admin");
  const { evento, ver } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight">Ingresos y validaciones</h2>
      <ScanLog basePath="/admin/ingresos" eventId={evento} filter={ver} />
    </div>
  );
}
