-- Route packages per vehicle, and the route a rental booking was made for.
CREATE TABLE "VehicleRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spots" TEXT NOT NULL DEFAULT '',
    "hours" TEXT NOT NULL DEFAULT '',
    "capacity" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VehicleRoute_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VehicleRoute_vehicleId_idx" ON "VehicleRoute"("vehicleId");
ALTER TABLE "ServiceBooking" ADD COLUMN "routeId" TEXT;
ALTER TABLE "ServiceBooking" ADD COLUMN "routeName" TEXT NOT NULL DEFAULT '';
