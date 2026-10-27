import { BarChart3, QrCode, Store, Wallet } from "lucide-react";

import { OrganizerContactForm } from "@/app/organizadores/contact-form";

const BENEFITS = [
  { icon: Wallet, text: "Venta online con Mercado Pago y entradas con QR al instante." },
  { icon: Store, text: "Boletería en puerta: efectivo, transferencia y cortesías." },
  { icon: QrCode, text: "Validación con el celular, sin equipos extra." },
  { icon: BarChart3, text: "Ventas e ingresos por tipo de entrada en tiempo real." },
] as const;

export function OrganizerContactSection() {
  return (
    <section
      id="organizadores"
      className="scroll-mt-20 border-t border-zinc-200 bg-zinc-950 px-5 py-14 text-white sm:px-8 sm:py-20"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
        <div className="flex flex-col gap-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-green-400 uppercase">
            Para organizadores
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            ¿Organizás eventos? Vendé tus entradas con nosotros
          </h2>
          <p className="text-base text-white/75">
            Dejanos tus datos y te contactamos para armar la venta de tu próximo evento.
          </p>
          <ul className="flex flex-col gap-3">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-white/85">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4 text-green-400" />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative rounded-2xl bg-white p-5 text-zinc-950 shadow-2xl sm:p-7">
          <OrganizerContactForm />
        </div>
      </div>
    </section>
  );
}
