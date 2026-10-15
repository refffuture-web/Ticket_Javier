export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Boletería</h1>
      <p className="max-w-md text-muted-foreground">
        Venta y validación de entradas. El panel y la web pública llegan en las próximas
        fases.
      </p>
      <a href="/login" className="text-sm underline-offset-4 hover:underline">
        Ingreso del personal
      </a>
    </main>
  );
}
