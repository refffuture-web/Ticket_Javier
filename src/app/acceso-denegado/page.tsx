import Link from "next/link";

export default function AccesoDenegadoPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sin permiso</h1>
      <p className="text-sm text-muted-foreground">
        Tu usuario no puede entrar a esta sección.
      </p>
      <Link href="/login" className="text-sm underline-offset-4 hover:underline">
        Volver al ingreso
      </Link>
    </main>
  );
}
