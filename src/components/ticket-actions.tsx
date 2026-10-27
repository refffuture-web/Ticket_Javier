"use client";

import { useState } from "react";

import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import {
  downloadBlob,
  ticketShareText,
  ticketToPdfBlob,
  ticketToPngBlob,
  ticketToPngFile,
  withoutContact,
  type TicketExportData,
} from "@/lib/ticket-export";

type Props = {
  ticket: TicketExportData;
  shareUrl: string;
};

export function TicketActions({ ticket, shareUrl }: Props) {
  const [busy, setBusy] = useState<"pdf" | "png" | null>(null);
  const [error, setError] = useState("");

  async function download(kind: "pdf" | "png") {
    setError("");
    setBusy(kind);
    try {
      if (kind === "pdf") {
        const blob = await ticketToPdfBlob(ticket);
        downloadBlob(blob, `entrada-${ticket.shortCode}.pdf`);
      } else {
        const blob = await ticketToPngBlob(ticket);
        downloadBlob(blob, `entrada-${ticket.shortCode}.png`);
      }
    } catch {
      setError("No se pudo generar el archivo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 print:hidden">
      <div className="flex flex-wrap items-start gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => download("pdf")}
        >
          {busy === "pdf" ? "Generando…" : "Descargar PDF"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => download("png")}
        >
          {busy === "png" ? "Generando…" : "Descargar imagen"}
        </Button>
        <ShareButton
          label="Compartir"
          title={ticket.eventTitle}
          text={ticketShareText(ticket)}
          url={shareUrl}
          subject={`Entrada ${ticket.shortCode} · ${ticket.eventTitle}`}
          prepareFiles={async () => [await ticketToPngFile(withoutContact(ticket))]}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
