
import { describe, expect, it } from "vitest";
import {
  calculateIamRiskScore,
  IamRiskFinding,
} from "./iam-risk-scoring.js";
import type { IamSecurityDetection } from "./iam.rules.js";

function createFinding(
  ruleId: string,
  severity: IamSecurityDetection["severity"],
  identityId = "identity-1"
): IamRiskFinding {
  return {
    ruleId,
    identityId,
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
      createFinding("IAM-001", "CRITICAL"),
      createFinding("IAM-002", "HIGH"),
      createFinding("IAM-003", "MEDIUM"),
      createFinding("IAM-004", "LOW"),
      createFinding("IAM-005", "INFORMATIONAL"),
    ];

    const result = calculateIamRiskScore(findings);

    expect(result.score).toBe(86);
    expect(result.level).toBe("CRITICAL");
    expect(result.findingCount).toBe(5);
  });

  it("does not count duplicate rule IDs twice", () => {
    const findings = [
      createFinding("IAM-001", "CRITICAL"),
      createFinding("IAM-001", "CRITICAL"),
    ];

    const result = calculateIamRiskScore(findings);

    expect(result.score).toBe(40);
    expect(result.findingCount).toBe(1);
  });

  it("caps the score at 100", () => {
    const findings = Array.from(
      { length: 4 },
      (_, index) => createFinding(`IAM-${index}`, "CRITICAL")
    );

    expect(calculateIamRiskScore(findings).score).toBe(100);
  });
  it("counts the same rule separately for different identities", () => {
  const findings = [
    createFinding("IAM-001", "CRITICAL", "identity-1"),
    createFinding("IAM-001", "CRITICAL", "identity-2"),
  ];

  const result = calculateIamRiskScore(findings);

  expect(result.score).toBe(80);
  expect(result.findingCount).toBe(2);
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
