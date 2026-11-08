
import type { DiscoveredResource } from "../discovery/types.js";

export type SecuritySeverity =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INFORMATIONAL";

export type SecurityDetection = {
  ruleId: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  evidence: Record<string, unknown>;
  remediation: string;
};

type SecurityRule = {
  id: string;
  evaluate: (resource: DiscoveredResource) => SecurityDetection | null;
};

const publicStorageRule: SecurityRule = {
  id: "AZ-STORAGE-001",

  evaluate(resource) {
    if (resource.resourceType !== "STORAGE_ACCOUNT") {
      return null;
    }

    if (
      String(resource.metadata.publicAccess).toLowerCase() !== "enabled"
    ) {
      return null;
    }

    return {
      ruleId: this.id,
      title: "Storage account allows public access",
      description:
        "This storage account is configured to allow public access. Exposed storage may permit unauthorized users to access sensitive data.",

      severity: "HIGH",

      evidence: {
        publicAccess: resource.metadata.publicAccess,
        resourceName: resource.name,
        discoverySource: resource.discoverySource,
      },

      remediation:
        "Disable public access on the storage account. Review existing access policies and use private endpoints or appropriately scoped identity-based access.",
    };
  },
};

const unrestrictedSshRule: SecurityRule = {
  id: "AZ-NSG-001",

  evaluate(resource) {
    if (resource.resourceType !== "NETWORK_SECURITY_GROUP") {
      return null;
    }

    const rules = resource.metadata.securityRules;

    if (!Array.isArray(rules)) {
      return null;
    }

    const exposedRule = rules.find((item) => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const rule = item as Record<string, unknown>;

      return (
        String(rule.port) === "22" &&
        String(rule.source) === "*" &&
        String(rule.access).toLowerCase() === "allow"
      );
    });

    if (!exposedRule) {
      return null;
    }

    return {
      ruleId: this.id,
      title: "SSH exposed to the internet",
      description:
        "This network security group allows SSH traffic on port 22 from any source. This exposes the management interface to potential unauthorized access attempts.",

      severity: "CRITICAL",

      evidence: {
        exposedSecurityRule: exposedRule,
        exposedPort: 22,
        source: "*",
        access: "Allow",
        resourceName: resource.name,
        discoverySource: resource.discoverySource,
      },

      remediation:
        "Restrict SSH access to trusted IP addresses or private networks. Prefer secure administrative access through a controlled management service.",
    };
  },
};

const securityRules: SecurityRule[] = [
  publicStorageRule,
  unrestrictedSshRule,
];

export function evaluateResourceSecurity(
  resource: DiscoveredResource
): SecurityDetection[] {
  return securityRules
    .map((rule) => rule.evaluate(resource))
    .filter(
      (finding): finding is SecurityDetection => finding !== null
    );
}
