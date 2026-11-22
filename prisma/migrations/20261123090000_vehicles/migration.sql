-- Partners (outside vehicle owners) and the vehicles customers rent.
ALTER TABLE "WorkerProfile" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'STAFF';
ALTER TABLE "WorkerProfile" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "workerId" TEXT,
    "offeringId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleBn" TEXT NOT NULL,
    "plate" TEXT NOT NULL DEFAULT '',
    "seats" INTEGER NOT NULL DEFAULT 2,
    "photos" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "detailBn" TEXT NOT NULL DEFAULT '',
    "pricePerHour" INTEGER NOT NULL DEFAULT 0,
    "pricePerDay" INTEGER NOT NULL DEFAULT 0,
    "minHours" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectNote" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Vehicle_shopId_status_idx" ON "Vehicle"("shopId", "status");
CREATE INDEX "Vehicle_workerId_idx" ON "Vehicle"("workerId");
CREATE INDEX "Vehicle_offeringId_idx" ON "Vehicle"("offeringId");

ALTER TABLE "ServiceBooking" ADD COLUMN "vehicleId" TEXT REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ServiceBooking_vehicleId_idx" ON "ServiceBooking"("vehicleId");
