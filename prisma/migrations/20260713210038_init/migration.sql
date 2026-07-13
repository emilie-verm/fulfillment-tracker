-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FULFILLMENT', 'OUTREACH', 'ADMIN');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('OUT_OF_STOCK', 'LOW_STOCK', 'HIGH_STOCK');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('OUT_OF_STOCK', 'DAMAGED', 'LOST', 'WRONG_ITEM', 'OTHER');

-- CreateEnum
CREATE TYPE "ExceptionStage" AS ENUM ('LOGGED', 'OUTREACH_SENT', 'CUSTOMER_RESPONDED', 'FULFILLED', 'CONFIRMED_RESOLVED', 'CLOSED_NO_RESPONSE');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('REPLACEMENT_SHIPPED', 'REFUNDED', 'NO_RESPONSE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCheck" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "status" "StockStatus" NOT NULL,
    "notes" TEXT,
    "checkedById" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exception" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "exceptionType" "ExceptionType" NOT NULL DEFAULT 'OUT_OF_STOCK',
    "stage" "ExceptionStage" NOT NULL DEFAULT 'LOGGED',
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfillmentNotes" TEXT,
    "trackingNumber" TEXT,
    "carrier" TEXT,
    "shippedAt" TIMESTAMP(3),
    "outreachNotes" TEXT,
    "customerChoice" TEXT,
    "resolutionType" "ResolutionType",
    "confirmedResolvedAt" TIMESTAMP(3),
    "confirmedResolvedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExceptionEvent" (
    "id" TEXT NOT NULL,
    "exceptionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExceptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "StockCheck_productName_checkedAt_idx" ON "StockCheck"("productName", "checkedAt");

-- CreateIndex
CREATE INDEX "Exception_orderNumber_idx" ON "Exception"("orderNumber");

-- CreateIndex
CREATE INDEX "Exception_stage_idx" ON "Exception"("stage");

-- CreateIndex
CREATE INDEX "Exception_productName_idx" ON "Exception"("productName");

-- CreateIndex
CREATE INDEX "ExceptionEvent_exceptionId_createdAt_idx" ON "ExceptionEvent"("exceptionId", "createdAt");

-- AddForeignKey
ALTER TABLE "StockCheck" ADD CONSTRAINT "StockCheck_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_confirmedResolvedById_fkey" FOREIGN KEY ("confirmedResolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionEvent" ADD CONSTRAINT "ExceptionEvent_exceptionId_fkey" FOREIGN KEY ("exceptionId") REFERENCES "Exception"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionEvent" ADD CONSTRAINT "ExceptionEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
