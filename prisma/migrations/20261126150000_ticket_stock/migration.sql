-- Agents hold ticket stock; bookings take from it.
CREATE TABLE "TicketStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "photos" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TicketStock_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketStock_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketStock_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TicketStock_shopId_status_idx" ON "TicketStock"("shopId", "status");
CREATE INDEX "TicketStock_offeringId_status_idx" ON "TicketStock"("offeringId", "status");
CREATE INDEX "TicketStock_workerId_idx" ON "TicketStock"("workerId");
ALTER TABLE "ServiceBooking" ADD COLUMN "ticketStockId" TEXT;
