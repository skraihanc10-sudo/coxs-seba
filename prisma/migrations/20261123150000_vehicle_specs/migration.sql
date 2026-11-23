-- Marketplace cards: half-day rate and spec tags on every vehicle.
ALTER TABLE "Vehicle" ADD COLUMN "pricePerHalfDay" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Vehicle" ADD COLUMN "specs" TEXT NOT NULL DEFAULT '';
