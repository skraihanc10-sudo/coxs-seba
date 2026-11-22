-- AlterTable: two/three-letter prefix in front of each category's booking numbers (CL-10001, CR-10002, ...)
ALTER TABLE "ServiceCategory" ADD COLUMN "codePrefix" TEXT NOT NULL DEFAULT '';

-- CreateTable: named counters; "booking" is the one running serial shared by every category and shop
CREATE TABLE "Sequence" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 0
);
