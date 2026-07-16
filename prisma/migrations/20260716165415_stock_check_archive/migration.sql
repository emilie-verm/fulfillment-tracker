-- AlterTable
ALTER TABLE "StockCheck" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT;

-- AddForeignKey
ALTER TABLE "StockCheck" ADD CONSTRAINT "StockCheck_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
