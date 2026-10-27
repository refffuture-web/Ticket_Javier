"use client";

import { ShareButton } from "@/components/share-button";
import { ticketToPngFile, withoutContact, type TicketExportData } from "@/lib/ticket-export";

type Props = {
  tickets: TicketExportData[];
  shareUrl: string;
};

export function ShareAllTickets({ tickets, shareUrl }: Props) {
  const first = tickets[0];
  if (!first || tickets.length < 2) return null;

  const text = [
    `${tickets.length} entradas: ${first.eventTitle}`,
    `Fecha: ${first.eventDate} · ${first.eventTime} hs`,
    `Lugar: ${first.venue}`,
    ...tickets.map((ticket) => `• ${ticket.ticketTypeName} · ${ticket.shortCode}`),
  ].join("\n");

  return (
    <div className="print:hidden">
      <ShareButton
        label={`Compartir todas (${tickets.length})`}
        variant="default"
        title={first.eventTitle}
        text={text}
        url={shareUrl}
        subject={`${tickets.length} entradas · ${first.eventTitle}`}
        prepareFiles={() =>
          Promise.all(tickets.map((ticket) => ticketToPngFile(withoutContact(ticket))))
        }
      />
    </div>
  );
}
