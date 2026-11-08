-- CreateTable
CREATE TABLE "CloudResource" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "providerResourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "region" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "discoverySource" TEXT NOT NULL DEFAULT 'SIMULATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CloudResource_cloudAccountId_idx" ON "CloudResource"("cloudAccountId");

-- CreateIndex
CREATE INDEX "CloudResource_provider_resourceType_idx" ON "CloudResource"("provider", "resourceType");

-- CreateIndex
CREATE INDEX "CloudResource_region_idx" ON "CloudResource"("region");

-- CreateIndex
CREATE INDEX "CloudResource_discoverySource_idx" ON "CloudResource"("discoverySource");

-- CreateIndex
CREATE UNIQUE INDEX "CloudResource_cloudAccountId_providerResourceId_key" ON "CloudResource"("cloudAccountId", "providerResourceId");

-- CreateIndex
CREATE INDEX "CloudAccount_provider_accountId_idx" ON "CloudAccount"("provider", "accountId");

-- AddForeignKey
ALTER TABLE "CloudResource" ADD CONSTRAINT "CloudResource_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
