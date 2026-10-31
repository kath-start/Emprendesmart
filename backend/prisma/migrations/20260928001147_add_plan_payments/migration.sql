-- CreateEnum
CREATE TYPE "PlanPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "yapeQrUrl" TEXT,
    "yapeHolderName" TEXT,
    "yapePhone" TEXT,
    "deviceKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPayment" (
    "id" TEXT NOT NULL,
    "entrepreneurId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payerName" TEXT NOT NULL,
    "status" "PlanPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notificationId" TEXT,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YapeNotification" (
    "id" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'yape',
    "amount" DECIMAL(10,2),
    "senderName" TEXT,
    "message" TEXT NOT NULL,
    "packageName" TEXT,
    "notifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YapeNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSettings_deviceKey_key" ON "PaymentSettings"("deviceKey");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPayment_notificationId_key" ON "PlanPayment"("notificationId");

-- CreateIndex
CREATE INDEX "PlanPayment_status_amount_idx" ON "PlanPayment"("status", "amount");

-- CreateIndex
CREATE INDEX "PlanPayment_entrepreneurId_createdAt_idx" ON "PlanPayment"("entrepreneurId", "createdAt");

-- CreateIndex
CREATE INDEX "YapeNotification_amount_notifiedAt_idx" ON "YapeNotification"("amount", "notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "YapeNotification_message_notifiedAt_key" ON "YapeNotification"("message", "notifiedAt");

-- AddForeignKey
ALTER TABLE "PlanPayment" ADD CONSTRAINT "PlanPayment_entrepreneurId_fkey" FOREIGN KEY ("entrepreneurId") REFERENCES "Entrepreneur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPayment" ADD CONSTRAINT "PlanPayment_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "YapeNotification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
