import { Suspense } from "react";
import Link from "next/link";

import { ScanLog } from "@/components/scan-log";
import { requireArea } from "@/server/auth/guard";

export const instant = false;

type SearchParams = Promise<{ evento?: string; ver?: string }>;

export default function ValidationLogPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <ValidationLog searchParams={searchParams} />
    </Suspense>
  );
}

async function ValidationLog({ searchParams }: { searchParams: SearchParams }) {
  await requireArea("validar");
  const { evento, ver } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Registro de ingresos</h2>
        <Link
          href={evento ? `/validar?evento=${evento}` : "/validar"}
          className="text-sm underline-offset-4 hover:underline"
        >
          Volver a validar
        </Link>
      </div>
      <ScanLog basePath="/validar/registro" eventId={evento} filter={ver} />
    </div>
  );
}
