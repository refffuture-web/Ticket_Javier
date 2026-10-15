import Link from "next/link";

import { PublicHeader } from "@/components/public-header";

export default function PrivacyPage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-16 text-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Privacidad</h1>
        <p>
          Este texto es un aviso operativo para usar el sistema. No es asesoramiento
          legal. Antes de vender al público, un abogado tiene que revisarlo según la Ley
          25.326.
        </p>
        <p>
          El organizador guarda el nombre, el email y el teléfono de quien compra, y el
          estado de sus entradas, para cobrar, enviar el QR y controlar el ingreso. Las
          entradas no son nominativas: el QR no incluye esos datos.
        </p>
        <p>
          Los pagos los procesa Mercado Pago. El reembolso del dinero se hace desde esa
          cuenta. En esta app, anular una entrada solo impide el ingreso.
        </p>
        <p>
          Podés pedir acceso o corrección de tus datos escribiendo al organizador del
          evento. El personal de boletería y de puerta solo ve lo necesario para vender o
          validar.
        </p>
        <Link href="/" className="underline-offset-4 hover:underline">
          Volver a los eventos
        </Link>
      </main>
    </>
  );
}
