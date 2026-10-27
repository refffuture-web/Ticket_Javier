import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700"
        >
          <span className="size-2.5 shrink-0 rounded-full bg-green-600" aria-hidden />
          <span className="truncate text-lg font-bold tracking-tight sm:text-xl">
            Boletería{" "}
            <span className="font-medium text-black/60">Mendoza del oeste</span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-4 text-sm text-black/70 sm:gap-5">
          <Link
            href="/#organizadores"
            className="cursor-pointer transition-colors duration-200 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700"
          >
            Organizadores
          </Link>
          <Link
            href="/privacidad"
            className="hidden cursor-pointer transition-colors duration-200 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700 sm:inline"
          >
            Privacidad
          </Link>
          <Link
            href="/login"
            className="cursor-pointer rounded-full bg-black px-3.5 py-1.5 text-white transition-colors duration-200 hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
          >
            Personal
          </Link>
        </nav>
      </div>
    </header>
  );
}
