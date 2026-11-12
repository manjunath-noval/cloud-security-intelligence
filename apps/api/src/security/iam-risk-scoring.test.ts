
import { describe, expect, it } from "vitest";
import {
  calculateIamRiskScore,
  IamRiskFinding,
} from "./iam-risk-scoring.js";
import type { IamSecurityDetection } from "./iam.rules.js";

function createFinding(
  ruleId: string,
  severity: IamSecurityDetection["severity"],
  identityId = "identity-1",
  assignmentIds = ["assignment-1"]
): IamRiskFinding {
  return {
    ruleId,
    identityId,
    assignmentIds,
    title: `Test finding ${ruleId}`,
    description: "Test description",
    severity,
    evidence: {},
    remediation: "Test remediation",
  };
}

describe("calculateIamRiskScore", () => {
  it("returns zero risk when there are no findings", () => {
    expect(calculateIamRiskScore([])).toMatchObject({
      score: 0,
      level: "NONE",
      findingCount: 0,
    });
  });

  it("calculates risk points by severity", () => {
    const findings = [
      createFinding("IAM-001", "CRITICAL", "identity-1", ["a1"]),
      createFinding("IAM-002", "HIGH", "identity-1", ["a2"]),
      createFinding("IAM-003", "MEDIUM", "identity-1", ["a3"]),
      createFinding("IAM-004", "LOW", "identity-1", ["a4"]),
      createFinding("IAM-005", "INFORMATIONAL", "identity-1", ["a5"]),
    ];

    const result = calculateIamRiskScore(findings);

    expect(result.score).toBe(86);
    expect(result.level).toBe("CRITICAL");
    expect(result.findingCount).toBe(5);
  });

  it("does not count duplicate rule IDs twice for the same assignment", () => {
    const findings = [
      createFinding("IAM-001", "CRITICAL"),
      createFinding("IAM-001", "CRITICAL"),
    ];

    const result = calculateIamRiskScore(findings);

    expect(result.score).toBe(40);
    expect(result.findingCount).toBe(1);
  });

  it("counts IAM-AZ-001 and IAM-AZ-002 once for the same exposure", () => {
    const findings = [
      createFinding("IAM-AZ-001", "CRITICAL"),
      createFinding("IAM-AZ-002", "CRITICAL"),
    ];

    const result = calculateIamRiskScore(findings);

    expect(result.score).toBe(40);
    expect(result.findingCount).toBe(1);
    expect(result.severityBreakdown.CRITICAL).toBe(1);
  });

  it("counts overlapping rules separately for different assignments", () => {
    const findings = [
      createFinding("IAM-AZ-001", "CRITICAL", "identity-1", ["a1"]),
      createFinding("IAM-AZ-002", "CRITICAL", "identity-1", ["a2"]),
    ];

    const result = calculateIamRiskScore(findings);

    expect(result.score).toBe(80);
    expect(result.findingCount).toBe(2);
  });

  it("counts the same exposure separately for different identities", () => {
    const findings = [
      createFinding("IAM-AZ-001", "CRITICAL", "identity-1", ["a1"]),
      createFinding("IAM-AZ-002", "CRITICAL", "identity-2", ["a1"]),
    ];

    const result = calculateIamRiskScore(findings);

    expect(result.score).toBe(80);
    expect(result.findingCount).toBe(2);
  });

  it("keeps IAM-AZ-003 and IAM-AZ-004 as independent risks", () => {
    const findings = [
      createFinding("IAM-AZ-001", "CRITICAL"),
      createFinding("IAM-AZ-003", "MEDIUM"),
      createFinding("IAM-AZ-004", "HIGH"),
    ];

    const result = calculateIamRiskScore(findings);

    expect(result.score).toBe(80);
    expect(result.findingCount).toBe(3);
  });

  it("caps the score at 100 and preserves the raw score", () => {
  const result = calculateIamRiskScore([
    createFinding("IAM-AZ-001", "CRITICAL", "identity-1", ["assignment-1"]),
    createFinding("IAM-AZ-004", "HIGH", "identity-2", ["assignment-2"]),
    createFinding("IAM-AZ-003", "MEDIUM", "identity-3", ["assignment-3"]),
    createFinding("IAM-AZ-005", "CRITICAL", "identity-4", ["assignment-4"]),
  ]);

  expect(result.score).toBe(100);
  expect(result.rawScore).toBe(120);
  expect(result.wasCapped).toBe(true);
  expect(result.severityBreakdown).toEqual({
    CRITICAL: 2,
    HIGH: 1,
    MEDIUM: 1,
    LOW: 0,
    INFORMATIONAL: 0,
  });
  expect(result.severityPoints).toEqual({
    CRITICAL: 80,
    HIGH: 25,
    MEDIUM: 15,
    LOW: 0,
    INFORMATIONAL: 0,
  });
});

  it("classifies risk levels correctly", () => {
    const cases = [
      { severity: "LOW", expected: "LOW" },
      { severity: "MEDIUM", expected: "LOW" },
      { severity: "HIGH", expected: "MODERATE" },
      { severity: "CRITICAL", expected: "MODERATE" },
    ] as const;

    for (const testCase of cases) {
      const result = calculateIamRiskScore([
        createFinding("IAM-TEST", testCase.severity),
      ]);

      expect(result.level).toBe(testCase.expected);
    }
  });
});
