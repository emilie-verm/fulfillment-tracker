-- AlterEnum
ALTER TYPE "ResolutionType" ADD VALUE 'ADDRESS_UPDATED';

-- AlterTable
ALTER TABLE "Exception" ADD COLUMN     "carrierClaimFiledAt" TIMESTAMP(3),
ADD COLUMN     "carrierClaimFiledById" TEXT,
ADD COLUMN     "carrierClaimReference" TEXT,
ADD COLUMN     "correctedAddress" TEXT;

-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_carrierClaimFiledById_fkey" FOREIGN KEY ("carrierClaimFiledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
