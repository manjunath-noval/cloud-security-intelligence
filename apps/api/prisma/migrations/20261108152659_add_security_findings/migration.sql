-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "SecurityFinding" (
    "id" TEXT NOT NULL,
    "cloudResourceId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "SecuritySeverity" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "remediation" TEXT NOT NULL,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityFinding_severity_status_idx" ON "SecurityFinding"("severity", "status");

-- CreateIndex
CREATE INDEX "SecurityFinding_cloudResourceId_idx" ON "SecurityFinding"("cloudResourceId");

-- CreateIndex
CREATE INDEX "SecurityFinding_ruleId_idx" ON "SecurityFinding"("ruleId");

-- CreateIndex
CREATE INDEX "SecurityFinding_status_idx" ON "SecurityFinding"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityFinding_cloudResourceId_ruleId_key" ON "SecurityFinding"("cloudResourceId", "ruleId");

-- AddForeignKey
ALTER TABLE "SecurityFinding" ADD CONSTRAINT "SecurityFinding_cloudResourceId_fkey" FOREIGN KEY ("cloudResourceId") REFERENCES "CloudResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
