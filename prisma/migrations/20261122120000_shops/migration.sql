-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cityBn" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'BRANCH',
    "phone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "addressBn" TEXT NOT NULL DEFAULT '',
    "blurb" TEXT NOT NULL DEFAULT '',
    "blurbBn" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The branch every existing row belongs to: HANDYO Cox's Bazar Sadar.
INSERT INTO "Shop" ("id", "slug", "name", "nameBn", "city", "cityBn", "kind", "address", "addressBn", "sort")
VALUES ('shop_coxs_sadar', 'coxs-bazar', 'HANDYO Cox''s Bazar', 'HANDYO কক্সবাজার', 'Cox''s Bazar Sadar', 'কক্সবাজার সদর', 'BRANCH', 'Kolatoli Main Road, Cox''s Bazar Sadar', 'কলাতলী মেইন রোড, কক্সবাজার সদর', 0);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "shopId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "createdAt", "email", "id", "name", "passwordHash", "phone", "role", "shopId") SELECT "active", "createdAt", "email", "id", "name", "passwordHash", "phone", "role", CASE WHEN "role" IN ('WORKER', 'SUPPORT', 'ADMIN') THEN 'shop_coxs_sadar' ELSE NULL END FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE TABLE "new_WorkerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "photo" TEXT NOT NULL DEFAULT '',
    "nid" TEXT NOT NULL DEFAULT '',
    "nidPhoto" TEXT NOT NULL DEFAULT '',
    "isRider" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "rating" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkerProfile_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorkerProfile" ("available", "id", "isRider", "joinedAt", "nid", "nidPhoto", "photo", "rating", "ratingCount", "userId", "shopId") SELECT "available", "id", "isRider", "joinedAt", "nid", "nidPhoto", "photo", "rating", "ratingCount", "userId", 'shop_coxs_sadar' FROM "WorkerProfile";
DROP TABLE "WorkerProfile";
ALTER TABLE "new_WorkerProfile" RENAME TO "WorkerProfile";
CREATE UNIQUE INDEX "WorkerProfile_userId_key" ON "WorkerProfile"("userId");
CREATE INDEX "WorkerProfile_shopId_idx" ON "WorkerProfile"("shopId");
CREATE TABLE "new_ServiceArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "charge" INTEGER NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ServiceArea_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServiceArea" ("active", "charge", "id", "name", "nameBn", "slug", "sort", "shopId") SELECT "active", "charge", "id", "name", "nameBn", "slug", "sort", 'shop_coxs_sadar' FROM "ServiceArea";
DROP TABLE "ServiceArea";
ALTER TABLE "new_ServiceArea" RENAME TO "ServiceArea";
CREATE UNIQUE INDEX "ServiceArea_shopId_slug_key" ON "ServiceArea"("shopId", "slug");
CREATE TABLE "new_ServiceCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "blurb" TEXT NOT NULL DEFAULT '',
    "blurbBn" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'spark',
    "image" TEXT NOT NULL DEFAULT '',
    "flow" TEXT NOT NULL DEFAULT 'STANDARD',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ServiceCategory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServiceCategory" ("active", "blurb", "blurbBn", "flow", "icon", "id", "image", "name", "nameBn", "slug", "sort", "shopId") SELECT "active", "blurb", "blurbBn", "flow", "icon", "id", "image", "name", "nameBn", "slug", "sort", 'shop_coxs_sadar' FROM "ServiceCategory";
DROP TABLE "ServiceCategory";
ALTER TABLE "new_ServiceCategory" RENAME TO "ServiceCategory";
CREATE UNIQUE INDEX "ServiceCategory_shopId_slug_key" ON "ServiceCategory"("shopId", "slug");
CREATE TABLE "new_ServiceBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "landmark" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "visitDate" TEXT NOT NULL,
    "visitSlot" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "pricing" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "quantity" REAL NOT NULL DEFAULT 1,
    "teamSize" INTEGER NOT NULL DEFAULT 1,
    "days" INTEGER NOT NULL DEFAULT 1,
    "visitCharge" INTEGER NOT NULL DEFAULT 0,
    "estimatedPrice" INTEGER NOT NULL DEFAULT 0,
    "quoteAmount" INTEGER,
    "quoteStatus" TEXT NOT NULL DEFAULT 'NONE',
    "quoteNote" TEXT NOT NULL DEFAULT '',
    "finalPrice" INTEGER,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "workerId" TEXT,
    "cancelReason" TEXT NOT NULL DEFAULT '',
    "refundNote" TEXT NOT NULL DEFAULT '',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "rescheduled" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceBooking_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceBooking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceBooking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceBooking_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceBooking_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "ServiceArea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceBooking_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceBooking" ("addressLine", "adminNote", "areaId", "cancelReason", "categoryId", "code", "completedAt", "contactName", "createdAt", "customerId", "days", "estimatedPrice", "finalPrice", "id", "landmark", "notes", "offeringId", "paymentMethod", "paymentStatus", "phone", "pricing", "quantity", "quoteAmount", "quoteNote", "quoteStatus", "refundNote", "rescheduled", "status", "teamSize", "unitPrice", "updatedAt", "visitCharge", "visitDate", "visitSlot", "workerId", "shopId") SELECT "addressLine", "adminNote", "areaId", "cancelReason", "categoryId", "code", "completedAt", "contactName", "createdAt", "customerId", "days", "estimatedPrice", "finalPrice", "id", "landmark", "notes", "offeringId", "paymentMethod", "paymentStatus", "phone", "pricing", "quantity", "quoteAmount", "quoteNote", "quoteStatus", "refundNote", "rescheduled", "status", "teamSize", "unitPrice", "updatedAt", "visitCharge", "visitDate", "visitSlot", "workerId", 'shop_coxs_sadar' FROM "ServiceBooking";
DROP TABLE "ServiceBooking";
ALTER TABLE "new_ServiceBooking" RENAME TO "ServiceBooking";
CREATE UNIQUE INDEX "ServiceBooking_code_key" ON "ServiceBooking"("code");
CREATE INDEX "ServiceBooking_shopId_status_idx" ON "ServiceBooking"("shopId", "status");
CREATE INDEX "ServiceBooking_shopId_createdAt_idx" ON "ServiceBooking"("shopId", "createdAt");
CREATE INDEX "ServiceBooking_customerId_idx" ON "ServiceBooking"("customerId");
CREATE INDEX "ServiceBooking_workerId_status_idx" ON "ServiceBooking"("workerId", "status");
CREATE INDEX "ServiceBooking_status_visitDate_idx" ON "ServiceBooking"("status", "visitDate");
CREATE INDEX "ServiceBooking_categoryId_idx" ON "ServiceBooking"("categoryId");
CREATE INDEX "ServiceBooking_areaId_idx" ON "ServiceBooking"("areaId");
CREATE TABLE "new_CareThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CareThread_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CareThread_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CareThread_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CareThread" ("assigneeId", "createdAt", "customerId", "id", "status", "updatedAt", "shopId") SELECT "assigneeId", "createdAt", "customerId", "id", "status", "updatedAt", 'shop_coxs_sadar' FROM "CareThread";
DROP TABLE "CareThread";
ALTER TABLE "new_CareThread" RENAME TO "CareThread";
CREATE INDEX "CareThread_shopId_status_idx" ON "CareThread"("shopId", "status");
CREATE UNIQUE INDEX "CareThread_customerId_shopId_key" ON "CareThread"("customerId", "shopId");
CREATE TABLE "new_Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ticket_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ticket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ServiceBooking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("assigneeId", "bookingId", "category", "code", "createdAt", "id", "priority", "status", "subject", "updatedAt", "userId", "shopId") SELECT "assigneeId", "bookingId", "category", "code", "createdAt", "id", "priority", "status", "subject", "updatedAt", "userId", 'shop_coxs_sadar' FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");
CREATE INDEX "Ticket_shopId_status_priority_idx" ON "Ticket"("shopId", "status", "priority");
CREATE TABLE "new_ReplyTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ReplyTemplate_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReplyTemplate" ("body", "id", "sort", "title", "shopId") SELECT "body", "id", "sort", "title", 'shop_coxs_sadar' FROM "ReplyTemplate";
DROP TABLE "ReplyTemplate";
ALTER TABLE "new_ReplyTemplate" RENAME TO "ReplyTemplate";
CREATE INDEX "ReplyTemplate_shopId_idx" ON "ReplyTemplate"("shopId");
CREATE TABLE "new_Setting" (
    "shopId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("shopId", "key"),
    CONSTRAINT "Setting_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Setting" ("key", "value", "shopId") SELECT "key", "value", 'shop_coxs_sadar' FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

