-- CreateEnum
CREATE TYPE "SecurityFindingActorType" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "SecurityFinding" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "resolutionNote" TEXT;

-- CreateTable
CREATE TABLE "SecurityFindingEvent" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" "FindingStatus",
    "toStatus" "FindingStatus",
    "note" TEXT,
    "actorType" "SecurityFindingActorType" NOT NULL DEFAULT 'USER',
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityFindingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityFindingEvent_findingId_createdAt_idx" ON "SecurityFindingEvent"("findingId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityFindingEvent_eventType_idx" ON "SecurityFindingEvent"("eventType");

-- CreateIndex
CREATE INDEX "SecurityFindingEvent_actorId_idx" ON "SecurityFindingEvent"("actorId");

-- AddForeignKey
ALTER TABLE "SecurityFindingEvent" ADD CONSTRAINT "SecurityFindingEvent_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "SecurityFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
