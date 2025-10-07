-- CreateTable for StockBatch
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'ToOrder',
    "costPerUnitUSD" DOUBLE PRECISION NOT NULL,
    "freightCostUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderDate" TIMESTAMP(3),
    "expectedArrival" TIMESTAMP(3),
    "orderNumber" TEXT,
    "arrivedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT,
    "assignedUserId" TEXT,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing item data to stock_batches
INSERT INTO "stock_batches" (
    "id",
    "quantity",
    "status",
    "costPerUnitUSD",
    "freightCostUSD",
    "orderDate",
    "expectedArrival",
    "orderNumber",
    "notes",
    "createdAt",
    "updatedAt",
    "itemId",
    "locationId",
    "assignedUserId"
)
SELECT 
    gen_random_uuid(),
    "quantityInStock",
    "status",
    "costPerUnitUSD",
    "freightCostUSD",
    "orderDate",
    "expectedArrival",
    "orderNumber",
    "notes",
    "createdAt",
    "updatedAt",
    "id",
    "locationId",
    "assignedUserId"
FROM "items"
WHERE "quantityInStock" > 0;

-- Drop old columns from items table
ALTER TABLE "items" DROP COLUMN "status";
ALTER TABLE "items" DROP COLUMN "quantityInStock";
ALTER TABLE "items" DROP COLUMN "freightCostUSD";
ALTER TABLE "items" DROP COLUMN "orderDate";
ALTER TABLE "items" DROP COLUMN "expectedArrival";
ALTER TABLE "items" DROP COLUMN "orderNumber";
ALTER TABLE "items" DROP COLUMN "assignedUserId";
ALTER TABLE "items" DROP COLUMN "locationId";
