-- Partner stores in the product shop, shelves per category, parcels per store, and the partner auto-assign switch.
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "workerId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "photos" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "detailBn" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "addressBn" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectNote" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Store_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Store_shopId_slug_key" ON "Store"("shopId", "slug");
CREATE INDEX "Store_shopId_status_idx" ON "Store"("shopId", "status");
ALTER TABLE "ProductGroup" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Product" ADD COLUMN "storeId" TEXT REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD COLUMN "storeId" TEXT REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkerProfile" ADD COLUMN "autoAssign" BOOLEAN NOT NULL DEFAULT false;
