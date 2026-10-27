CREATE TYPE "ContactStatus" AS ENUM ('NUEVO', 'CONTACTADO', 'ARCHIVADO');

CREATE TABLE "OrganizerContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "organization" TEXT,
    "city" TEXT,
    "eventType" TEXT,
    "eventDate" TEXT,
    "audience" TEXT,
    "message" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'NUEVO',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerContact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizerContact_status_createdAt_idx" ON "OrganizerContact"("status", "createdAt");

ALTER TABLE "OrganizerContact" ENABLE ROW LEVEL SECURITY;
