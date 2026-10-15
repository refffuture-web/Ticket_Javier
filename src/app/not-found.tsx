import Link from "next/link";

import { PublicHeader } from "@/components/public-header";

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">No encontramos esa página</h1>
        <p className="text-sm text-muted-foreground">
          El evento no está publicado o la dirección no existe.
        </p>
        <Link href="/" className="text-sm underline-offset-4 hover:underline">
          Volver a los eventos
        </Link>
      </main>
    </>
  );
}
