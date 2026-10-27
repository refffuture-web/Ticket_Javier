-- CreateTable
CREATE TABLE "EventGalleryImage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventGalleryImage_eventId_sortOrder_idx" ON "EventGalleryImage"("eventId", "sortOrder");

-- AddForeignKey
ALTER TABLE "EventGalleryImage" ADD CONSTRAINT "EventGalleryImage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
