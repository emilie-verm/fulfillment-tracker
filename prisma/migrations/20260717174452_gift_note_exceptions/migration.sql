-- AlterEnum
ALTER TYPE "ExceptionType" ADD VALUE 'GIFT_NOTE';

-- AlterEnum
ALTER TYPE "ResolutionType" ADD VALUE 'GIFT_NOTE_ADDED';

-- AlterTable
ALTER TABLE "Exception" ADD COLUMN     "giftNoteInvoicePaidAt" TIMESTAMP(3),
ADD COLUMN     "giftNoteInvoicePaidById" TEXT,
ADD COLUMN     "giftNoteText" TEXT;

-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_giftNoteInvoicePaidById_fkey" FOREIGN KEY ("giftNoteInvoicePaidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
