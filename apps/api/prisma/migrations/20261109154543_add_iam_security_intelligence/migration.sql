/*
  Warnings:

  - A unique constraint covering the columns `[cloudIdentityId,ruleId]` on the table `SecurityFinding` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CloudIdentityType" AS ENUM ('USER', 'GROUP', 'SERVICE_PRINCIPAL', 'MANAGED_IDENTITY');

-- DropIndex
DROP INDEX "SecurityFinding_cloudResourceId_ruleId_key";

-- AlterTable
ALTER TABLE "SecurityFinding" ADD COLUMN     "cloudIdentityId" TEXT,
ALTER COLUMN "cloudResourceId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CloudIdentity" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "providerIdentityId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "identityType" "CloudIdentityType" NOT NULL,
    "userPrincipalName" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "discoverySource" TEXT NOT NULL DEFAULT 'SIMULATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloudRoleDefinition" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "providerRoleDefinitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT true,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "assignableScopes" JSONB NOT NULL DEFAULT '[]',
    "discoverySource" TEXT NOT NULL DEFAULT 'SIMULATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudRoleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloudRoleAssignment" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "providerAssignmentId" TEXT NOT NULL,
    "cloudIdentityId" TEXT NOT NULL,
    "cloudRoleDefinitionId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "condition" TEXT,
    "conditionVersion" TEXT,
    "discoverySource" TEXT NOT NULL DEFAULT 'SIMULATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CloudIdentity_cloudAccountId_idx" ON "CloudIdentity"("cloudAccountId");

-- CreateIndex
CREATE INDEX "CloudIdentity_identityType_idx" ON "CloudIdentity"("identityType");

-- CreateIndex
CREATE INDEX "CloudIdentity_isEnabled_idx" ON "CloudIdentity"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "CloudIdentity_cloudAccountId_providerIdentityId_key" ON "CloudIdentity"("cloudAccountId", "providerIdentityId");

-- CreateIndex
CREATE INDEX "CloudRoleDefinition_cloudAccountId_idx" ON "CloudRoleDefinition"("cloudAccountId");

-- CreateIndex
CREATE INDEX "CloudRoleDefinition_name_idx" ON "CloudRoleDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CloudRoleDefinition_cloudAccountId_providerRoleDefinitionId_key" ON "CloudRoleDefinition"("cloudAccountId", "providerRoleDefinitionId");

-- CreateIndex
CREATE INDEX "CloudRoleAssignment_cloudAccountId_idx" ON "CloudRoleAssignment"("cloudAccountId");

-- CreateIndex
CREATE INDEX "CloudRoleAssignment_cloudIdentityId_idx" ON "CloudRoleAssignment"("cloudIdentityId");

-- CreateIndex
CREATE INDEX "CloudRoleAssignment_cloudRoleDefinitionId_idx" ON "CloudRoleAssignment"("cloudRoleDefinitionId");

-- CreateIndex
CREATE INDEX "CloudRoleAssignment_scope_idx" ON "CloudRoleAssignment"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "CloudRoleAssignment_cloudAccountId_providerAssignmentId_key" ON "CloudRoleAssignment"("cloudAccountId", "providerAssignmentId");

-- CreateIndex
CREATE INDEX "SecurityFinding_cloudIdentityId_idx" ON "SecurityFinding"("cloudIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityFinding_cloudIdentityId_ruleId_key" ON "SecurityFinding"("cloudIdentityId", "ruleId");

-- AddForeignKey
ALTER TABLE "CloudIdentity" ADD CONSTRAINT "CloudIdentity_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudRoleDefinition" ADD CONSTRAINT "CloudRoleDefinition_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudRoleAssignment" ADD CONSTRAINT "CloudRoleAssignment_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudRoleAssignment" ADD CONSTRAINT "CloudRoleAssignment_cloudIdentityId_fkey" FOREIGN KEY ("cloudIdentityId") REFERENCES "CloudIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudRoleAssignment" ADD CONSTRAINT "CloudRoleAssignment_cloudRoleDefinitionId_fkey" FOREIGN KEY ("cloudRoleDefinitionId") REFERENCES "CloudRoleDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityFinding" ADD CONSTRAINT "SecurityFinding_cloudIdentityId_fkey" FOREIGN KEY ("cloudIdentityId") REFERENCES "CloudIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure every security finding has exactly one target.
ALTER TABLE "SecurityFinding"
ADD CONSTRAINT "SecurityFinding_exactly_one_target_check"
CHECK (
    ("cloudResourceId" IS NOT NULL AND "cloudIdentityId" IS NULL)
    OR
    ("cloudResourceId" IS NULL AND "cloudIdentityId" IS NOT NULL)
);