import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-6">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Boletería
      </Link>
      <nav className="flex gap-4 text-sm text-muted-foreground">
        <Link href="/privacidad" className="underline-offset-4 hover:underline">
          Privacidad
        </Link>
        <Link href="/login" className="underline-offset-4 hover:underline">
          Personal
        </Link>
      </nav>
    </header>
  );
}
