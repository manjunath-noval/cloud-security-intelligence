
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db.js";
import { calculateIamRiskScore } from "./iam-risk-scoring.js";
import {
  evaluateIamSecurity,
  type IamEvaluationInput,
  type IamSecurityDetection,
} from "./iam.rules.js";

type IamScanResult = {
  accountId: string;
  accountName: string;
  identitiesScanned: number;
  assignmentsScanned: number;
  findingsCreated: number;
  findingsUpdated: number;
  findingsReopened: number;
  riskScore: number;
  riskLevel: string;
  riskFindingCount: number;
  severityBreakdown: Record<string, number>;
  findings: IamSecurityDetection[];
};

export async function scanCloudAccountIam(
  cloudAccountId: string
): Promise<IamScanResult> {
  const account = await prisma.cloudAccount.findUnique({
    where: { id: cloudAccountId },
    include: {
      identities: {
        include: {
          roleAssignments: {
            include: {
              cloudRoleDefinition: true,
            },
          },
        },
      },
    },
  });

  if (!account) {
    throw new Error("Cloud account not found");
  }

  if (!account.isActive) {
    throw new Error("Cloud account is inactive");
  }

  const detectionsByIdentityAndRule = new Map<
    string,
    {
      cloudIdentityId: string;
      detection: IamSecurityDetection;
      matchingAssignments: Array<{
        assignmentId: string;
        scope: string;
        roleName: string;
        condition: string | null;
      }>;
    }
  >();

  let assignmentsScanned = 0;

  for (const identity of account.identities) {
    for (const assignment of identity.roleAssignments) {
      assignmentsScanned++;

      const roleDefinition = assignment.cloudRoleDefinition;

      const input: IamEvaluationInput = {
        cloudAccountId: account.id,
        accountId: account.accountId,

        identity: {
          id: identity.id,
          displayName: identity.displayName,
          identityType: identity.identityType,
          isEnabled: identity.isEnabled,
          discoverySource: identity.discoverySource,
        },

        roleDefinition: {
          id: roleDefinition.id,
          name: roleDefinition.name,
          permissions:
            roleDefinition.permissions as IamEvaluationInput["roleDefinition"]["permissions"],
        },

        assignment: {
          id: assignment.id,
          scope: assignment.scope,
          condition: assignment.condition,
        },
      };

      const detections = evaluateIamSecurity(input);

      for (const detection of detections) {
        const key = `${identity.id}:${detection.ruleId}`;

        const matchingAssignment = {
          assignmentId: assignment.id,
          scope: assignment.scope,
          roleName: roleDefinition.name,
          condition: assignment.condition,
        };

        const existing = detectionsByIdentityAndRule.get(key);

        if (existing) {
          existing.matchingAssignments.push(matchingAssignment);
        } else {
          detectionsByIdentityAndRule.set(key, {
            cloudIdentityId: identity.id,
            detection,
            matchingAssignments: [matchingAssignment],
          });
        }
      }
    }
  }

  let findingsCreated = 0;
  let findingsUpdated = 0;
  let findingsReopened = 0;

  await prisma.$transaction(async (transaction) => {
    for (const item of detectionsByIdentityAndRule.values()) {
      const { cloudIdentityId, detection, matchingAssignments } = item;

      const evidence = {
        ...detection.evidence,
        matchingAssignments,
        discoverySource: "SIMULATED",
      };

      const existing =
        await transaction.securityFinding.findUnique({
          where: {
            cloudIdentityId_ruleId: {
              cloudIdentityId,
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
          cloudIdentityId_ruleId: {
            cloudIdentityId,
            ruleId: detection.ruleId,
          },
        },

        create: {
          cloudIdentityId,
          ruleId: detection.ruleId,
          title: detection.title,
          description: detection.description,
          severity: detection.severity,
          evidence: evidence as Prisma.InputJsonValue,
          remediation: detection.remediation,
        },

        update: {
          title: detection.title,
          description: detection.description,
          severity: detection.severity,
          evidence: evidence as Prisma.InputJsonValue,
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
            note:
              "IAM security finding detected by the automated scanning engine.",
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
              note:
                "Previously resolved IAM security finding was detected again during a scan.",
              actorType: "SYSTEM",
            },
          });
        }
      }
    }
  });
    const riskFindings = Array.from(
  detectionsByIdentityAndRule.values()
).map((item) => ({
  ...item.detection,
  identityId: item.cloudIdentityId,
  assignmentIds: item.matchingAssignments.map(
    (assignment) => assignment.assignmentId
  ),
}));

  const riskSummary = calculateIamRiskScore(riskFindings);

  return {
    accountId: account.id,
    accountName: account.name,
    riskScore: riskSummary.score,
    riskLevel: riskSummary.level,
    riskFindingCount: riskSummary.findingCount,
    severityBreakdown: riskSummary.severityBreakdown,
    identitiesScanned: account.identities.length,
    assignmentsScanned,
    findingsCreated,
    findingsUpdated,
    findingsReopened,
    findings: Array.from(
      detectionsByIdentityAndRule.values()
    ).map((item) => ({
      ...item.detection,
      evidence: {
        ...item.detection.evidence,
        matchingAssignments: item.matchingAssignments,
        discoverySource: "SIMULATED",
      },
    })),
  };
}
