-- Status de previsão passa a ter SE e MM independentes, e entra o módulo de
-- confirmação de faturamento (reconciliação com o dashboard publicado).

-- ForecastStatus: concluido/em -> concluidoSE/emSE + concluidoMM/emMM.
-- Preserva o dado existente: o dashboard original, ao migrar, tratava o campo
-- genérico legado `concluido` como "SE concluído".
ALTER TABLE "ForecastStatus" ADD COLUMN "concluidoSE" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ForecastStatus" ADD COLUMN "emSE" TIMESTAMP(3);
ALTER TABLE "ForecastStatus" ADD COLUMN "concluidoMM" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ForecastStatus" ADD COLUMN "emMM" TIMESTAMP(3);

UPDATE "ForecastStatus" SET "concluidoSE" = "concluido", "emSE" = "em";

ALTER TABLE "ForecastStatus" DROP COLUMN "concluido";
ALTER TABLE "ForecastStatus" DROP COLUMN "em";

-- Tipo do relatório gerado: SE/MM oficiais + PARCIAL (prévia sem trava).
CREATE TYPE "TipoRelatorio" AS ENUM ('SE', 'MM', 'PARCIAL');

ALTER TABLE "GeneratedFile" DROP CONSTRAINT IF EXISTS "GeneratedFile_mes_tipo_key";
DROP INDEX IF EXISTS "GeneratedFile_mes_tipo_key";
ALTER TABLE "GeneratedFile"
  ALTER COLUMN "tipo" TYPE "TipoRelatorio"
  USING ("tipo"::text::"TipoRelatorio");
CREATE UNIQUE INDEX "GeneratedFile_mes_tipo_key" ON "GeneratedFile"("mes", "tipo");

-- Confirmação de faturamento por linha (cnpj|sku|sap).
CREATE TYPE "FaturaStatus" AS ENUM ('FATURADO', 'NAO_FATURADO', 'FATURADO_PARCIALMENTE');

CREATE TABLE "FaturamentoLine" (
    "id" TEXT NOT NULL,
    "sam" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "rowKey" TEXT NOT NULL,
    "status" "FaturaStatus",
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaturamentoLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FaturamentoLine_sam_mes_idx" ON "FaturamentoLine"("sam", "mes");
CREATE UNIQUE INDEX "FaturamentoLine_sam_mes_rowKey_key" ON "FaturamentoLine"("sam", "mes", "rowKey");

CREATE TABLE "FaturamentoStatus" (
    "id" TEXT NOT NULL,
    "sam" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "em" TIMESTAMP(3),

    CONSTRAINT "FaturamentoStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FaturamentoStatus_sam_mes_key" ON "FaturamentoStatus"("sam", "mes");
