import type { ContactStatus } from "@prisma/client";
import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/time";
import { requireArea } from "@/server/auth/guard";
import { db } from "@/server/db";

import { setContactStatusAction } from "./actions";

export const instant = false;

const TABS: { key: ContactStatus; label: string }[] = [
  { key: "NUEVO", label: "Nuevos" },
  { key: "CONTACTADO", label: "Contactados" },
  { key: "ARCHIVADO", label: "Archivados" },
];

const STATUS_STYLE: Record<ContactStatus, string> = {
  NUEVO: "bg-amber-100 text-amber-800",
  CONTACTADO: "bg-emerald-100 text-emerald-800",
  ARCHIVADO: "bg-zinc-100 text-zinc-700",
};

export default function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ContactsHome searchParams={searchParams} />
    </Suspense>
  );
}

async function ContactsHome({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await requireArea("admin");
  const { ver } = await searchParams;
  const active = TABS.find((tab) => tab.key === ver)?.key ?? "NUEVO";

  const [counts, contacts] = await Promise.all([
    db.organizerContact.groupBy({ by: ["status"], _count: { _all: true } }),
    db.organizerContact.findMany({
      where: { status: active },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const count = (status: ContactStatus) =>
    counts.find((row) => row.status === status)?._count._all ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">Organizadores que pidieron contacto</h2>
        <p className="text-sm text-muted-foreground">
          Llegan desde el formulario al final de la página principal.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/contactos?ver=${tab.key}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              tab.key === active
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:bg-muted"
            }`}
          >
            {tab.label} ({count(tab.key)})
          </Link>
        ))}
      </nav>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay pedidos en esta lista.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {contacts.map((contact) => {
            const details = [
              contact.eventType,
              contact.audience,
              contact.city,
              contact.eventDate ? `Fecha: ${contact.eventDate}` : null,
            ].filter(Boolean);
            return (
              <li key={contact.id} className="flex flex-col gap-3 rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {contact.name}
                      {contact.organization ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {contact.organization}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(contact.createdAt)}
                    </span>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[contact.status]}`}
                  >
                    {TABS.find((tab) => tab.key === contact.status)?.label.replace(/s$/, "")}
                  </span>
                </div>
                {details.length > 0 ? (
                  <p className="text-sm text-muted-foreground">{details.join(" · ")}</p>
                ) : null}
                {contact.message ? (
                  <p className="text-sm whitespace-pre-wrap">{contact.message}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                    >
                      <Mail className="size-4" />
                      {contact.email}
                    </a>
                  ) : null}
                  {contact.phone ? (
                    <>
                      <a
                        href={`tel:${contact.phone}`}
                        className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                      >
                        <Phone className="size-4" />
                        {contact.phone}
                      </a>
                      <a
                        href={`https://wa.me/${whatsappNumber(contact.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                      >
                        <MessageCircle className="size-4" />
                        WhatsApp
                      </a>
                    </>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {TABS.filter((tab) => tab.key !== contact.status).map((tab) => (
                    <form key={tab.key} action={setContactStatusAction}>
                      <input type="hidden" name="id" value={contact.id} />
                      <input type="hidden" name="status" value={tab.key} />
                      <Button type="submit" variant="outline" size="sm">
                        {tab.key === "NUEVO"
                          ? "Volver a nuevos"
                          : tab.key === "CONTACTADO"
                            ? "Marcar contactado"
                            : "Archivar"}
                      </Button>
                    </form>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Números locales argentinos (261 555 1234, 0261…) pasan a 549 + área + número. */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+") || digits.startsWith("54")) return digits;
  const local = digits.replace(/^0/, "");
  return local.length === 10 ? `549${local}` : local;
}
