/*
  Warnings:

  - A unique constraint covering the columns `[cloudResourceId,ruleId]` on the table `SecurityFinding` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SecurityFinding_cloudResourceId_ruleId_key" ON "SecurityFinding"("cloudResourceId", "ruleId");
