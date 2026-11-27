-- Partners may attach a trade licence (image or PDF) with their application.
ALTER TABLE "WorkerProfile" ADD COLUMN "tradeLicense" TEXT NOT NULL DEFAULT '';
