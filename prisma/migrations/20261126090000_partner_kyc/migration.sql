-- Partner sign-up now carries identity papers and the business name.
ALTER TABLE "WorkerProfile" ADD COLUMN "idType" TEXT NOT NULL DEFAULT 'NID';
ALTER TABLE "WorkerProfile" ADD COLUMN "businessName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WorkerProfile" ADD COLUMN "rejectNote" TEXT NOT NULL DEFAULT '';
