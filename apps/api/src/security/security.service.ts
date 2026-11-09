import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db.js";
import {
  evaluateResourceSecurity,
  type SecurityDetection,
} from "./security.rules.js";

type DetectionResult = {
  accountId: string;
  accountName: string;
  resourcesScanned: number;
  findingsCreated: number;
  findingsUpdated: number;
  findingsReopened: number;
  findings: SecurityDetection[];
};

export async function scanCloudAccount(
  cloudAccountId: string
): Promise<DetectionResult> {
  const account = await prisma.cloudAccount.findUnique({
    where: { id: cloudAccountId },
    include: {
      resources: true,
    },
  });

  if (!account) {
    throw new Error("Cloud account not found");
  }

  if (!account.isActive) {
    throw new Error("Cloud account is inactive");
  }

  const allDetections: {
    cloudResourceId: string;
    detection: SecurityDetection;
  }[] = [];

  for (const resource of account.resources) {
    const detections = evaluateResourceSecurity({
      providerResourceId: resource.providerResourceId,
      name: resource.name,
      resourceType: resource.resourceType,
      provider: resource.provider as "AZURE" | "AWS" | "GCP",
      region: resource.region ?? undefined,
      metadata: resource.metadata as Record<string, unknown>,
      discoverySource: resource.discoverySource as "SIMULATED" | "LIVE",
    });

    for (const detection of detections) {
      allDetections.push({
        cloudResourceId: resource.id,
        detection,
      });
    }
  }

  let findingsCreated = 0;
  let findingsUpdated = 0;
  let findingsReopened = 0;

  await prisma.$transaction(async (transaction) => {
    for (const item of allDetections) {
      const { cloudResourceId, detection } = item;

      const existing = await transaction.securityFinding.findUnique({
        where: {
          cloudResourceId_ruleId: {
            cloudResourceId,
            ruleId: detection.ruleId,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      const now = new Date();
      const isNew = !existing;
      const shouldReopen = existing?.status === "RESOLVED";

      const finding = await transaction.securityFinding.upsert({
        where: {
          cloudResourceId_ruleId: {
            cloudResourceId,
            ruleId: detection.ruleId,
          },
        },
        create: {
          cloudResourceId,
          ruleId: detection.ruleId,
          title: detection.title,
          description: detection.description,
          severity: detection.severity,
          evidence: detection.evidence as Prisma.InputJsonValue,
          remediation: detection.remediation,
        },
        update: {
          title: detection.title,
          description: detection.description,
          severity: detection.severity,
          evidence: detection.evidence as Prisma.InputJsonValue,
          remediation: detection.remediation,
          lastDetectedAt: now,

          ...(shouldReopen
            ? {
                status: "OPEN" as const,
                resolvedAt: null,
                resolutionNote: null,
                acknowledgedAt: null,
              }
            : {}),
        },
      });

      if (isNew) {
        findingsCreated++;

        await transaction.securityFindingEvent.create({
          data: {
            findingId: finding.id,
            eventType: "DETECTED",
            fromStatus: null,
            toStatus: "OPEN",
            note: "Security finding detected by the automated scanning engine.",
            actorType: "SYSTEM",
          },
        });
      } else {
        findingsUpdated++;

        if (shouldReopen) {
          findingsReopened++;

          await transaction.securityFindingEvent.create({
            data: {
              findingId: finding.id,
              eventType: "REOPENED",
              fromStatus: "RESOLVED",
              toStatus: "OPEN",
              note: "Previously resolved security finding was detected again during a scan.",
              actorType: "SYSTEM",
            },
          });
        }
      }
    }
  });

  return {
    accountId: account.id,
    accountName: account.name,
    resourcesScanned: account.resources.length,
    findingsCreated,
    findingsUpdated,
    findingsReopened,
    findings: allDetections.map((item) => item.detection),
  };
}