-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('VALIDO', 'YA_USADO', 'ANULADO', 'OTRO_EVENTO', 'INVALIDO');

-- CreateTable
CREATE TABLE "TicketScan" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketId" TEXT,
    "userId" TEXT,
    "result" "ScanResult" NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketScan_eventId_createdAt_idx" ON "TicketScan"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketScan_eventId_result_idx" ON "TicketScan"("eventId", "result");

-- CreateIndex
CREATE INDEX "TicketScan_ticketId_idx" ON "TicketScan"("ticketId");

-- AddForeignKey
ALTER TABLE "TicketScan" ADD CONSTRAINT "TicketScan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketScan" ADD CONSTRAINT "TicketScan_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketScan" ADD CONSTRAINT "TicketScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ingresos anteriores a este registro.
INSERT INTO "TicketScan" ("id", "eventId", "ticketId", "userId", "result", "code", "createdAt")
SELECT 'scan_' || "id", "eventId", "id", "usedById", 'VALIDO', "shortCode", "usedAt"
FROM "Ticket"
WHERE "status" = 'USADO' AND "usedAt" IS NOT NULL;
