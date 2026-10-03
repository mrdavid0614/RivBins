-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PUTAWAY', 'PICK', 'MOVE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'DONE');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "ScoreTrigger" AS ENUM ('SEED', 'MANUAL_RECOMPUTE', 'AUDIT');

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aisle" (
    "id" SERIAL NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Aisle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rack" (
    "id" SERIAL NOT NULL,
    "aisleId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Rack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bin" (
    "id" SERIAL NOT NULL,
    "rackId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "lastAuditedAt" TIMESTAMP(3),
    "currentScoreId" INTEGER,

    CONSTRAINT "Bin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pallet" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "binId" INTEGER NOT NULL,

    CONSTRAINT "Pallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PalletItem" (
    "id" SERIAL NOT NULL,
    "palletId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "PalletItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" SERIAL NOT NULL,
    "type" "MovementType" NOT NULL,
    "binId" INTEGER NOT NULL,
    "fromBinId" INTEGER,
    "palletId" INTEGER NOT NULL,
    "productId" INTEGER,
    "quantityDelta" INTEGER,
    "auditResultId" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BinScore" (
    "id" SERIAL NOT NULL,
    "binId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "trigger" "ScoreTrigger" NOT NULL,
    "auditResultId" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BinScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPlan" (
    "id" SERIAL NOT NULL,
    "requestedN" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditTask" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "binId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "scoreAtCreation" INTEGER NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AuditTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditResult" (
    "id" SERIAL NOT NULL,
    "binId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "autoOutcome" "AuditOutcome" NOT NULL,
    "finalOutcome" "AuditOutcome" NOT NULL,
    "totalExpected" INTEGER NOT NULL,
    "totalCounted" INTEGER NOT NULL,
    "discrepancyRatio" DOUBLE PRECISION NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditResultLine" (
    "id" SERIAL NOT NULL,
    "auditResultId" INTEGER NOT NULL,
    "palletId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "countedQty" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,

    CONSTRAINT "AuditResultLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Aisle_warehouseId_code_key" ON "Aisle"("warehouseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Rack_aisleId_code_key" ON "Rack"("aisleId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Bin_code_key" ON "Bin"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Bin_currentScoreId_key" ON "Bin"("currentScoreId");

-- CreateIndex
CREATE UNIQUE INDEX "Bin_rackId_level_position_key" ON "Bin"("rackId", "level", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Pallet_code_key" ON "Pallet"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PalletItem_palletId_productId_key" ON "PalletItem"("palletId", "productId");

-- CreateIndex
CREATE INDEX "Movement_binId_occurredAt_idx" ON "Movement"("binId", "occurredAt");

-- CreateIndex
CREATE INDEX "Movement_fromBinId_occurredAt_idx" ON "Movement"("fromBinId", "occurredAt");

-- CreateIndex
CREATE INDEX "BinScore_binId_computedAt_idx" ON "BinScore"("binId", "computedAt");

-- CreateIndex
CREATE INDEX "AuditTask_binId_status_idx" ON "AuditTask"("binId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AuditResult_taskId_key" ON "AuditResult"("taskId");

-- CreateIndex
CREATE INDEX "AuditResult_binId_countedAt_idx" ON "AuditResult"("binId", "countedAt");

-- CreateIndex
CREATE INDEX "AuditResultLine_auditResultId_idx" ON "AuditResultLine"("auditResultId");

-- AddForeignKey
ALTER TABLE "Aisle" ADD CONSTRAINT "Aisle_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_aisleId_fkey" FOREIGN KEY ("aisleId") REFERENCES "Aisle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bin" ADD CONSTRAINT "Bin_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bin" ADD CONSTRAINT "Bin_currentScoreId_fkey" FOREIGN KEY ("currentScoreId") REFERENCES "BinScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pallet" ADD CONSTRAINT "Pallet_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalletItem" ADD CONSTRAINT "PalletItem_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "Pallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalletItem" ADD CONSTRAINT "PalletItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_fromBinId_fkey" FOREIGN KEY ("fromBinId") REFERENCES "Bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "Pallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_auditResultId_fkey" FOREIGN KEY ("auditResultId") REFERENCES "AuditResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinScore" ADD CONSTRAINT "BinScore_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinScore" ADD CONSTRAINT "BinScore_auditResultId_fkey" FOREIGN KEY ("auditResultId") REFERENCES "AuditResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTask" ADD CONSTRAINT "AuditTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AuditPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTask" ADD CONSTRAINT "AuditTask_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditResult" ADD CONSTRAINT "AuditResult_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditResult" ADD CONSTRAINT "AuditResult_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AuditTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditResultLine" ADD CONSTRAINT "AuditResultLine_auditResultId_fkey" FOREIGN KEY ("auditResultId") REFERENCES "AuditResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditResultLine" ADD CONSTRAINT "AuditResultLine_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "Pallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditResultLine" ADD CONSTRAINT "AuditResultLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
