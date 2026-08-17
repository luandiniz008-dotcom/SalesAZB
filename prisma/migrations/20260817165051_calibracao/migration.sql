-- CreateTable
CREATE TABLE "CalibracaoLine" (
    "id" TEXT NOT NULL,
    "sam" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "rowKey" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT '',
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalibracaoLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalibracaoLine_mes_idx" ON "CalibracaoLine"("mes");

-- CreateIndex
CREATE INDEX "CalibracaoLine_sam_mes_idx" ON "CalibracaoLine"("sam", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "CalibracaoLine_sam_mes_rowKey_key" ON "CalibracaoLine"("sam", "mes", "rowKey");
