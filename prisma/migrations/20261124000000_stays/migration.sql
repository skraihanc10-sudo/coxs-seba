-- Resort & hotel booking: properties, room types, and stay fields on bookings.
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "workerId" TEXT,
    "areaId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'RESORT',
    "name" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "addressBn" TEXT NOT NULL DEFAULT '',
    "photos" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "detailBn" TEXT NOT NULL DEFAULT '',
    "amenities" TEXT NOT NULL DEFAULT '',
    "checkIn" TEXT NOT NULL DEFAULT '14:00',
    "checkOut" TEXT NOT NULL DEFAULT '12:00',
    "policy" TEXT NOT NULL DEFAULT '',
    "policyBn" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectNote" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Property_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Property_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "ServiceArea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Property_shopId_status_idx" ON "Property"("shopId", "status");
CREATE INDEX "Property_workerId_idx" ON "Property"("workerId");

CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL DEFAULT '',
    "sleeps" INTEGER NOT NULL DEFAULT 2,
    "pricePerNight" INTEGER NOT NULL,
    "totalRooms" INTEGER NOT NULL DEFAULT 1,
    "amenities" TEXT NOT NULL DEFAULT '',
    "photos" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "RoomType_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "RoomType_propertyId_idx" ON "RoomType"("propertyId");

ALTER TABLE "ServiceBooking" ADD COLUMN "propertyId" TEXT REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD COLUMN "roomTypeId" TEXT REFERENCES "RoomType" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD COLUMN "checkOut" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ServiceBooking" ADD COLUMN "nights" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ServiceBooking" ADD COLUMN "rooms" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ServiceBooking" ADD COLUMN "guests" INTEGER NOT NULL DEFAULT 1;
