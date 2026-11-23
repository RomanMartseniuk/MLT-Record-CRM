-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EXECUTOR');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('PCS', 'L', 'KG', 'M');

-- CreateEnum
CREATE TYPE "PurchaseDestination" AS ENUM ('WAREHOUSE', 'ORDER');

-- CreateEnum
CREATE TYPE "LocalStatus" AS ENUM ('IN_QUEUE', 'IN_WORK', 'DONE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AllocationKind" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('ACTIVE', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('PRODUCT_PHOTO', 'RECEIPT', 'EXPENSE_FILE');

-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('WEBHOOK', 'MANUAL', 'NIGHTLY');

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "roAppId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EXECUTOR',
    "extraPermissions" TEXT[],
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "roAppName" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CategoryKind" NOT NULL DEFAULT 'PRODUCT',
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT[],
    "email" TEXT[],
    "address" TEXT,
    "comment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "unit" "Unit" NOT NULL DEFAULT 'PCS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMPTZ(3) NOT NULL,
    "docNumber" TEXT,
    "comment" TEXT,
    "destination" "PurchaseDestination" NOT NULL DEFAULT 'WAREHOUSE',
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMPTZ(3),
    "orderId" TEXT,
    "supplierId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "cancelledById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" DECIMAL(12,2) NOT NULL,
    "unitPriceKop" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "purchaseItemId" TEXT,
    "qtyReceived" DECIMAL(12,2) NOT NULL,
    "qtyRemaining" DECIMAL(12,2) NOT NULL,
    "unitPriceKop" INTEGER NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adjustment" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "roAppId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isOrganization" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "phone" TEXT[],
    "address" TEXT,
    "syncedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "roAppId" TEXT NOT NULL,
    "uid" TEXT,
    "title" TEXT NOT NULL,
    "color" TEXT,
    "state" TEXT,
    "costKop" INTEGER,
    "kind" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "ownerId" TEXT,
    "syncedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderType" (
    "id" TEXT NOT NULL,
    "roAppId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "OrderType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusMapping" (
    "id" TEXT NOT NULL,
    "raw" TEXT NOT NULL,
    "local" "LocalStatus",
    "label" TEXT NOT NULL,

    CONSTRAINT "StatusMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "roAppId" TEXT NOT NULL,
    "docNumber" TEXT,
    "rawStatus" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "clientId" TEXT,
    "assetId" TEXT,
    "managerName" TEXT,
    "managerRoAppId" TEXT,
    "executorName" TEXT,
    "executorRoAppId" TEXT,
    "address" TEXT,
    "malfunction" TEXT,
    "managerNotes" TEXT,
    "executorNotes" TEXT,
    "accessories" TEXT,
    "estimatedPriceKop" INTEGER,
    "totalPriceKop" INTEGER,
    "paidPriceKop" INTEGER,
    "roCreatedAt" TIMESTAMPTZ(3) NOT NULL,
    "dueDate" TIMESTAMPTZ(3),
    "doneAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "warrantyDate" TIMESTAMPTZ(3),
    "syncedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "kind" "AllocationKind" NOT NULL DEFAULT 'PRODUCT',
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "serviceName" TEXT,
    "qty" DECIMAL(12,2),
    "totalKop" INTEGER NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "transferredFromOrderId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationLine" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "qty" DECIMAL(12,2) NOT NULL,
    "unitPriceKop" INTEGER NOT NULL,

    CONSTRAINT "AllocationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "objectLabel" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "reason" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "SyncSource" NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "added" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "amountKop" INTEGER NOT NULL,
    "date" TIMESTAMPTZ(3) NOT NULL,
    "comment" TEXT,
    "categoryId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "replacedById" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT,
    "purchaseId" TEXT,
    "expenseId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Link_productId_idx" ON "Link"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "User_roAppId_key" ON "User"("roAppId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_number_key" ON "Purchase"("number");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");

-- CreateIndex
CREATE INDEX "Purchase_createdById_idx" ON "Purchase"("createdById");

-- CreateIndex
CREATE INDEX "Purchase_cancelledById_idx" ON "Purchase"("cancelledById");

-- CreateIndex
CREATE INDEX "Purchase_orderId_idx" ON "Purchase"("orderId");

-- CreateIndex
CREATE INDEX "Purchase_date_idx" ON "Purchase"("date");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

-- CreateIndex
CREATE INDEX "Batch_productId_receivedAt_id_idx" ON "Batch"("productId", "receivedAt", "id");

-- CreateIndex
CREATE INDEX "Batch_purchaseId_idx" ON "Batch"("purchaseId");

-- CreateIndex
CREATE INDEX "Batch_purchaseItemId_idx" ON "Batch"("purchaseItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_roAppId_key" ON "Client"("roAppId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_roAppId_key" ON "Asset"("roAppId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_uid_key" ON "Asset"("uid");

-- CreateIndex
CREATE INDEX "Asset_ownerId_idx" ON "Asset"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderType_roAppId_key" ON "OrderType"("roAppId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusMapping_raw_key" ON "StatusMapping"("raw");

-- CreateIndex
CREATE UNIQUE INDEX "Order_roAppId_key" ON "Order"("roAppId");

-- CreateIndex
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");

-- CreateIndex
CREATE INDEX "Order_assetId_idx" ON "Order"("assetId");

-- CreateIndex
CREATE INDEX "Order_typeId_idx" ON "Order"("typeId");

-- CreateIndex
CREATE INDEX "Order_managerRoAppId_idx" ON "Order"("managerRoAppId");

-- CreateIndex
CREATE INDEX "Order_executorRoAppId_idx" ON "Order"("executorRoAppId");

-- CreateIndex
CREATE INDEX "Order_rawStatus_idx" ON "Order"("rawStatus");

-- CreateIndex
CREATE INDEX "Order_roCreatedAt_idx" ON "Order"("roCreatedAt");

-- CreateIndex
CREATE INDEX "Allocation_orderId_idx" ON "Allocation"("orderId");

-- CreateIndex
CREATE INDEX "Allocation_productId_idx" ON "Allocation"("productId");

-- CreateIndex
CREATE INDEX "Allocation_createdById_idx" ON "Allocation"("createdById");

-- CreateIndex
CREATE INDEX "Allocation_transferredFromOrderId_idx" ON "Allocation"("transferredFromOrderId");

-- CreateIndex
CREATE INDEX "AllocationLine_allocationId_idx" ON "AllocationLine"("allocationId");

-- CreateIndex
CREATE INDEX "AllocationLine_batchId_idx" ON "AllocationLine"("batchId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_objectType_objectId_idx" ON "AuditLog"("objectType", "objectId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "SyncLog_at_idx" ON "SyncLog"("at");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_orderId_idx" ON "Expense"("orderId");

-- CreateIndex
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

-- CreateIndex
CREATE INDEX "Attachment_productId_idx" ON "Attachment"("productId");

-- CreateIndex
CREATE INDEX "Attachment_purchaseId_idx" ON "Attachment"("purchaseId");

-- CreateIndex
CREATE INDEX "Attachment_expenseId_idx" ON "Attachment"("expenseId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_userId_key_key" ON "IdempotencyKey"("userId", "key");

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "PurchaseItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "OrderType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_transferredFromOrderId_fkey" FOREIGN KEY ("transferredFromOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationLine" ADD CONSTRAINT "AllocationLine_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationLine" ADD CONSTRAINT "AllocationLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- CHECK constraints (Prisma cannot declare them; see docs/08-database.md, section 8)
-- ---------------------------------------------------------------------------

-- Batch: stock never negative, never above what was received
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_qty_check"
  CHECK ("qtyRemaining" >= 0 AND "qtyRemaining" <= "qtyReceived" AND "unitPriceKop" >= 0);

-- Purchase: destination ORDER <=> orderId is set
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_destination_check"
  CHECK (("destination" = 'ORDER') = ("orderId" IS NOT NULL));

-- PurchaseItem
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_positive_check"
  CHECK ("qty" > 0 AND "unitPriceKop" >= 0);

-- Allocation: product or service
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_kind_check"
  CHECK (
    ("kind" = 'PRODUCT' AND "productId" IS NOT NULL AND "qty" IS NOT NULL AND "qty" > 0)
    OR
    ("kind" = 'SERVICE' AND "serviceName" IS NOT NULL AND "productId" IS NULL AND "qty" IS NULL)
  );
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_total_check" CHECK ("totalKop" >= 0);

-- AllocationLine
ALTER TABLE "AllocationLine" ADD CONSTRAINT "AllocationLine_positive_check"
  CHECK ("qty" > 0 AND "unitPriceKop" >= 0);

-- Expense
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_check" CHECK ("amountKop" >= 0);

-- Attachment: exactly one owner, matching the kind
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_owner_check"
  CHECK (
    ("kind" = 'PRODUCT_PHOTO' AND "productId" IS NOT NULL AND "purchaseId" IS NULL AND "expenseId" IS NULL)
    OR ("kind" = 'RECEIPT' AND "purchaseId" IS NOT NULL AND "productId" IS NULL AND "expenseId" IS NULL)
    OR ("kind" = 'EXPENSE_FILE' AND "expenseId" IS NOT NULL AND "productId" IS NULL AND "purchaseId" IS NULL)
  );
