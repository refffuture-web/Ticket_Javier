import type { TicketDocument } from "@/modules/ticket-render/types";

export interface PrintService {
  print(ticket: TicketDocument): Promise<void>;
}

export class StubPrintService implements PrintService {
  async print(_ticket: TicketDocument): Promise<void> {
    throw new Error("Impresión no configurada");
  }
}
