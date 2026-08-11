-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SAM');

-- CreateEnum
CREATE TYPE "Fase" AS ENUM ('SE', 'MM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SAM',
    "samName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterRow" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "sam" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "grupo" TEXT NOT NULL DEFAULT '',
    "uf" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "sap" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "MasterRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastLine" (
    "id" TEXT NOT NULL,
    "sam" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "rowKey" TEXT NOT NULL,
    "se" INTEGER NOT NULL DEFAULT 0,
    "riscoSE" TEXT NOT NULL DEFAULT 'Médio',
    "mm" INTEGER NOT NULL DEFAULT 0,
    "riscoMM" TEXT NOT NULL DEFAULT 'Médio',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForecastLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastStatus" (
    "id" TEXT NOT NULL,
    "sam" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "em" TIMESTAMP(3),

    CONSTRAINT "ForecastStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "mesVigente" TEXT NOT NULL,
    "faseAtiva" "Fase" NOT NULL DEFAULT 'SE',

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedFile" (
    "id" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "tipo" "Fase" NOT NULL,
    "filename" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tamanhoKB" INTEGER NOT NULL,

    CONSTRAINT "GeneratedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MasterRow_sam_idx" ON "MasterRow"("sam");

-- CreateIndex
CREATE INDEX "MasterRow_sam_sku_idx" ON "MasterRow"("sam", "sku");

-- CreateIndex
CREATE INDEX "ForecastLine_sam_mes_idx" ON "ForecastLine"("sam", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastLine_sam_mes_rowKey_key" ON "ForecastLine"("sam", "mes", "rowKey");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastStatus_sam_mes_key" ON "ForecastStatus"("sam", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedFile_mes_tipo_key" ON "GeneratedFile"("mes", "tipo");
