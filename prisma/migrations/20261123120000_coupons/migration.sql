-- Discount codes per shop, and the discount kept on each booking.
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PERCENT',
    "value" INTEGER NOT NULL,
    "minAmount" INTEGER NOT NULL DEFAULT 0,
    "maxDiscount" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "usageLimit" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "perCustomer" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Coupon_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Coupon_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Coupon_shopId_code_key" ON "Coupon"("shopId", "code");
CREATE INDEX "Coupon_shopId_active_idx" ON "Coupon"("shopId", "active");

ALTER TABLE "ServiceBooking" ADD COLUMN "couponId" TEXT REFERENCES "Coupon" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD COLUMN "couponCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ServiceBooking" ADD COLUMN "discount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "ServiceBooking_couponId_idx" ON "ServiceBooking"("couponId");
