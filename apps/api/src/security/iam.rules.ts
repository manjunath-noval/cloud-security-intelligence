
export type IamSecuritySeverity =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INFORMATIONAL";

export type IamSecurityDetection = {
  ruleId: string;
  title: string;
  description: string;
  severity: IamSecuritySeverity;
  evidence: Record<string, unknown>;
  remediation: string;
};

export type IamEvaluationInput = {
  cloudAccountId: string;
  accountId: string;
  identity: {
    id: string;
    displayName: string;
    identityType:
      | "USER"
      | "GROUP"
      | "SERVICE_PRINCIPAL"
      | "MANAGED_IDENTITY";
    isEnabled: boolean;
    discoverySource: string;
  };
  roleDefinition: {
    id: string;
    name: string;
    permissions: {
      actions: string[];
      notActions: string[];
      dataActions: string[];
      notDataActions: string[];
    };
  };
  assignment: {
    id: string;
    scope: string;
    condition: string | null;
  };
};

type IamSecurityRule = {
  id: string;
  evaluate: (
    input: IamEvaluationInput
  ) => IamSecurityDetection | null;
};

function isSubscriptionScope(
  scope: string,
  accountId: string
): boolean {
  const normalized = scope.toLowerCase();

  return (
    normalized === "/" ||
    normalized === `/subscriptions/${accountId}`.toLowerCase()
  );
}

function hasUnrestrictedManagementActions(
  permissions: IamEvaluationInput["roleDefinition"]["permissions"]
): boolean {
  return (
    permissions.actions.includes("*") &&
    permissions.notActions.length === 0
  );
}

// Rule 1: Broad management permissions at subscription scope.
const broadManagementPermissionsRule: IamSecurityRule = {
  id: "IAM-AZ-001",

  evaluate(input) {
    const { identity, roleDefinition, assignment } = input;

    if (
      !isSubscriptionScope(assignment.scope, input.accountId) ||
      !hasUnrestrictedManagementActions(roleDefinition.permissions)
    ) {
      return null;
    }

    return {
      ruleId: this.id,
      title: "Unrestricted management permissions at subscription scope",
      description:
        "This identity has a role assignment with unrestricted management actions at subscription scope. Such permissions can expose a broad range of cloud resources and management operations to misuse.",

      severity: "CRITICAL",

      evidence: {
        identityId: identity.id,
        identityName: identity.displayName,
        identityType: identity.identityType,
        roleName: roleDefinition.name,
        actions: roleDefinition.permissions.actions,
        notActions: roleDefinition.permissions.notActions,
        assignmentScope: assignment.scope,
        discoverySource: identity.discoverySource,
      },

      remediation:
        "Review whether this identity requires unrestricted subscription-level management access. Prefer least-privilege custom or built-in roles, narrower scopes, and time-bound privileged access where appropriate.",
    };
  },
};

// Rule 2: Broad permissions assigned to workload identities.
const privilegedServicePrincipalRule: IamSecurityRule = {
  id: "IAM-AZ-002",

  evaluate(input) {
    const { identity, roleDefinition, assignment } = input;

    if (
      identity.identityType !== "SERVICE_PRINCIPAL" &&
      identity.identityType !== "MANAGED_IDENTITY"
    ) {
      return null;
    }

    if (
      !isSubscriptionScope(assignment.scope, input.accountId) ||
      !hasUnrestrictedManagementActions(roleDefinition.permissions)
    ) {
      return null;
    }

    return {
      ruleId: this.id,
      title: "Workload identity has unrestricted subscription permissions",
      description:
        "A service principal or managed identity has unrestricted management actions at subscription scope. Compromise of this workload identity could provide extensive control-plane access.",

      severity: "CRITICAL",

      evidence: {
        identityId: identity.id,
        identityName: identity.displayName,
        identityType: identity.identityType,
        roleName: roleDefinition.name,
        actions: roleDefinition.permissions.actions,
        assignmentScope: assignment.scope,
        discoverySource: identity.discoverySource,
      },

      remediation:
        "Review the workload identity's actual operational requirements. Replace broad permissions with narrowly scoped roles, rotate or secure its credentials, and monitor its authentication and privileged operations.",
    };
  },
};

// Rule 3: Disabled identities retaining privileged assignments.
const disabledPrivilegedIdentityRule: IamSecurityRule = {
  id: "IAM-AZ-003",

  evaluate(input) {
    const { identity, roleDefinition, assignment } = input;

    if (identity.isEnabled) {
      return null;
    }

    const hasPrivilegedPermissions =
      hasUnrestrictedManagementActions(roleDefinition.permissions) ||
      roleDefinition.permissions.actions.includes(
        "Microsoft.Authorization/*/Write"
      );

    if (!hasPrivilegedPermissions) {
      return null;
    }

    return {
      ruleId: this.id,
      title: "Disabled identity retains privileged role assignment",
      description:
        "A disabled identity still has a privileged role assignment. Although the disabled identity should not be able to authenticate normally, the stale assignment creates governance and access-management risk if the identity is re-enabled or its state changes.",

      severity: "MEDIUM",

      evidence: {
        identityId: identity.id,
        identityName: identity.displayName,
        identityEnabled: identity.isEnabled,
        roleName: roleDefinition.name,
        assignmentScope: assignment.scope,
        discoverySource: identity.discoverySource,
      },

      remediation:
        "Review the identity's ownership and business requirement. Remove obsolete role assignments and verify that no other enabled identity or credential can exercise the same access.",
    };
  },
};

// Rule 4: Subscription-level role assignment management permissions.
const roleAssignmentManagementRule: IamSecurityRule = {
  id: "IAM-AZ-004",

  evaluate(input) {
    const { identity, roleDefinition, assignment } = input;

    if (
      !isSubscriptionScope(assignment.scope, input.accountId) ||
      !roleDefinition.permissions.actions.includes(
        "Microsoft.Authorization/*/Write"
      )
    ) {
      return null;
    }

    return {
      ruleId: this.id,
      title: "Subscription-level role assignment management access",
      description:
        "This identity can perform role assignment management operations at subscription scope. Such access can enable privilege changes and should be tightly controlled.",

      severity: "HIGH",

      evidence: {
        identityId: identity.id,
        identityName: identity.displayName,
        identityType: identity.identityType,
        roleName: roleDefinition.name,
        actions: roleDefinition.permissions.actions,
        assignmentScope: assignment.scope,
        discoverySource: identity.discoverySource,
      },

      remediation:
        "Restrict role assignment management permissions to trusted administrators. Review role assignments, use narrowly scoped access, and monitor changes to privileged permissions.",
    };
  },
};

const iamSecurityRules: IamSecurityRule[] = [
  broadManagementPermissionsRule,
  privilegedServicePrincipalRule,
  disabledPrivilegedIdentityRule,
  roleAssignmentManagementRule,
];

export function evaluateIamSecurity(
  input: IamEvaluationInput
): IamSecurityDetection[] {
  return iamSecurityRules
    .map((rule) => rule.evaluate(input))
    .filter(
      (finding): finding is IamSecurityDetection =>
        finding !== null
    );
}
