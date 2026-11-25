-- Partner helpers, the office-list switch, bill adjustments and the approval queue.
ALTER TABLE "User" ADD COLUMN "helperOfId" TEXT REFERENCES "WorkerProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD COLUMN "helperStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkerProfile" ADD COLUMN "officeList" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ServiceBooking" ADD COLUMN "extraCharge" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ServiceBooking" ADD COLUMN "extraNote" TEXT NOT NULL DEFAULT '';
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requesterId" TEXT NOT NULL,
    "requesterRole" TEXT NOT NULL DEFAULT '',
    "deciderId" TEXT,
    "decisionNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    CONSTRAINT "ChangeRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ServiceBooking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_deciderId_fkey" FOREIGN KEY ("deciderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ChangeRequest_shopId_status_idx" ON "ChangeRequest"("shopId", "status");
CREATE INDEX "ChangeRequest_bookingId_idx" ON "ChangeRequest"("bookingId");
