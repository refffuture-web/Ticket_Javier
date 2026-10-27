-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "fisico" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Ticket_fisico_idx" ON "Ticket"("fisico");
