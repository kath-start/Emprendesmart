-- AlterTable
ALTER TABLE "Entrepreneur" ADD COLUMN "firebaseUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Entrepreneur_firebaseUid_key" ON "Entrepreneur"("firebaseUid");
