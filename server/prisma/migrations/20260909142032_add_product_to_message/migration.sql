-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "extra" TEXT,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'text';

-- CreateIndex
CREATE INDEX "Message_productId_idx" ON "Message"("productId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
