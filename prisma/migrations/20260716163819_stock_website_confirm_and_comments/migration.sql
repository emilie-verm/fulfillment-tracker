-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "stockCheckId" TEXT;

-- AlterTable
ALTER TABLE "StockCheck" ADD COLUMN     "websiteUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "websiteUpdatedById" TEXT;

-- CreateTable
CREATE TABLE "StockCheckComment" (
    "id" TEXT NOT NULL,
    "stockCheckId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCheckComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockCheckComment_stockCheckId_createdAt_idx" ON "StockCheckComment"("stockCheckId", "createdAt");

-- AddForeignKey
ALTER TABLE "StockCheck" ADD CONSTRAINT "StockCheck_websiteUpdatedById_fkey" FOREIGN KEY ("websiteUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCheckComment" ADD CONSTRAINT "StockCheckComment_stockCheckId_fkey" FOREIGN KEY ("stockCheckId") REFERENCES "StockCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCheckComment" ADD CONSTRAINT "StockCheckComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_stockCheckId_fkey" FOREIGN KEY ("stockCheckId") REFERENCES "StockCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
