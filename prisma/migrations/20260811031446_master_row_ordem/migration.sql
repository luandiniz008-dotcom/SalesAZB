/*
  Warnings:

  - Added the required column `ordem` to the `MasterRow` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "MasterRow_sam_idx";

-- DropIndex
DROP INDEX "MasterRow_sam_sku_idx";

-- AlterTable
ALTER TABLE "MasterRow" ADD COLUMN     "ordem" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "MasterRow_ordem_idx" ON "MasterRow"("ordem");

-- CreateIndex
CREATE INDEX "MasterRow_sam_ordem_idx" ON "MasterRow"("sam", "ordem");

-- CreateIndex
CREATE INDEX "MasterRow_sam_sku_ordem_idx" ON "MasterRow"("sam", "sku", "ordem");
