
import { z } from "zod";

const permissionSchema = z.object({
  actions: z.array(z.string()).default([]),
  notActions: z.array(z.string()).default([]),
  dataActions: z.array(z.string()).default([]),
  notDataActions: z.array(z.string()).default([]),
});

export type RolePermissions = z.infer<typeof permissionSchema>;

export type PermissionScopeType =
  | "TENANT"
  | "MANAGEMENT_GROUP"
  | "SUBSCRIPTION"
  | "RESOURCE_GROUP"
  | "RESOURCE"
  | "UNKNOWN";

export type PermissionClassification = {
  hasWildcardManagementAccess: boolean;
  hasReadOnlyManagementPattern: boolean;
  hasAccessManagementPermissions: boolean;
  hasDataPlanePermissions: boolean;
  hasDeclaredExclusions: boolean;
  scopeType: PermissionScopeType;
  managementActions: string[];
  dataActions: string[];
  excludedManagementActions: string[];
  excludedDataActions: string[];
  analysisLimitations: string[];
};

function matchesPattern(
  operation: string,
  pattern: string
): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `^${escaped.replace(/\*/g, ".*")}$`,
    "i"
  );

  return regex.test(operation);
}

function classifyScope(scope: string): PermissionScopeType {
  const normalized = scope.trim().toLowerCase();

  if (normalized === "/") return "TENANT";

  if (normalized.startsWith("/providers/microsoft.management/managementgroups/")) {
    return "MANAGEMENT_GROUP";
  }

  if (/^\/subscriptions\/[^/]+$/.test(normalized)) {
    return "SUBSCRIPTION";
  }

  if (/^\/subscriptions\/[^/]+\/resourcegroups\/[^/]+$/.test(normalized)) {
    return "RESOURCE_GROUP";
  }

  if (
    normalized.startsWith("/subscriptions/") &&
    normalized.includes("/providers/")
  ) {
    return "RESOURCE";
  }

  return "UNKNOWN";
}

export function parseRolePermissions(
  value: unknown
): RolePermissions {
  return permissionSchema.parse(value);
}

export function analyzeRolePermissions(
  permissionsInput: unknown,
  assignmentScope: string
): PermissionClassification {
  const permissions = parseRolePermissions(permissionsInput);

  const hasWildcardManagementAccess =
    permissions.actions.some((action) => action.trim() === "*");

  const hasReadOnlyManagementPattern =
    permissions.actions.some((action) =>
      matchesPattern("Microsoft.Compute/virtualMachines/read", action)
    ) &&
    permissions.actions.every(
      (action) =>
        action.trim() === "*/read" ||
        action.toLowerCase().endsWith("/read")
    );

  const hasAccessManagementPermissions =
    permissions.actions.some((action) =>
      matchesPattern(
        "Microsoft.Authorization/roleAssignments/write",
        action
      )
    );

  const hasDataPlanePermissions =
    permissions.dataActions.length > 0;

  const hasDeclaredExclusions =
    permissions.notActions.length > 0 ||
    permissions.notDataActions.length > 0;

  const analysisLimitations = [
    "This analysis evaluates declared role permission patterns, not complete effective Azure access.",
    "Azure notActions and notDataActions are exclusions from this role definition, not explicit deny rules.",
    "Group membership, inherited assignments, PIM, assignment conditions, and other role assignments are not evaluated.",
    "Wildcard matching is pattern-based and does not reproduce the complete Azure authorization engine."
  ];

  return {
    hasWildcardManagementAccess,
    hasReadOnlyManagementPattern,
    hasAccessManagementPermissions,
    hasDataPlanePermissions,
    hasDeclaredExclusions,
    scopeType: classifyScope(assignmentScope),
    managementActions: permissions.actions,
    dataActions: permissions.dataActions,
    excludedManagementActions: permissions.notActions,
    excludedDataActions: permissions.notDataActions,
    analysisLimitations
  };
}
