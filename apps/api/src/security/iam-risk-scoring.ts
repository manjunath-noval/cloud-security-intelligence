
import type { IamSecurityDetection } from "./iam.rules.js";

export type IamRiskLevel =
  | "NONE"
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "CRITICAL";

export type IamRiskFinding = IamSecurityDetection & {
  identityId: string;
  assignmentIds: string[];
};

export type IamRiskScore = {
  score: number;
  rawScore: number;
  level: IamRiskLevel;
  findingCount: number;
  severityBreakdown: Record<string, number>;
  severityPoints: Record<string, number>;
  wasCapped: boolean;
};

const SEVERITY_POINTS: Record<string, number> = {
  CRITICAL: 40,
  HIGH: 25,
  MEDIUM: 15,
  LOW: 5,
  INFORMATIONAL: 1,
};

function getRiskLevel(score: number): IamRiskLevel {
  if (score === 0) return "NONE";
  if (score <= 24) return "LOW";
  if (score <= 49) return "MODERATE";
  if (score <= 74) return "HIGH";
  return "CRITICAL";
}

export function calculateIamRiskScore(
  findings: IamRiskFinding[]
): IamRiskScore {
  const uniqueFindings = new Map<string, IamRiskFinding>();

  for (const finding of findings) {
    for (const assignmentId of new Set(finding.assignmentIds)) {
      const overlapGroup =
        finding.ruleId === "IAM-AZ-001" ||
        finding.ruleId === "IAM-AZ-002"
          ? "UNRESTRICTED_MANAGEMENT"
          : finding.ruleId;

      const key = [
        finding.identityId,
        assignmentId,
        overlapGroup,
      ].join(":");

      const existing = uniqueFindings.get(key);

      if (
        !existing ||
        SEVERITY_POINTS[finding.severity] >
          SEVERITY_POINTS[existing.severity]
      ) {
        uniqueFindings.set(key, finding);
      }
    }
  }

   const severityBreakdown: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFORMATIONAL: 0,
  };

  const severityPoints: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFORMATIONAL: 0,
  };

  let rawScore = 0;

  for (const finding of uniqueFindings.values()) {
    const points = SEVERITY_POINTS[finding.severity] ?? 0;

    severityBreakdown[finding.severity]++;
    severityPoints[finding.severity] += points;
    rawScore += points;
  }

  const score = Math.min(rawScore, 100);

  return {
    score,
    rawScore,
    level: getRiskLevel(score),
    findingCount: uniqueFindings.size,
    severityBreakdown,
    severityPoints,
    wasCapped: rawScore > 100,
  };
}
