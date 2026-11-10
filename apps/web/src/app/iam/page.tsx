
"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Shield,
  KeyRound,
  RefreshCw,
  AlertCircle,
  Cloud,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api";

type CloudAccount = {
  id: string;
  name: string;
  provider: "AZURE" | "AWS" | "GCP";
  accountId: string;
  environment: string;
  isActive: boolean;
};

type AccountsResponse = {
  accounts: CloudAccount[];
};

type CloudIdentity = {
  id: string;
  displayName: string;
  identityType: "USER" | "GROUP" | "SERVICE_PRINCIPAL" | "MANAGED_IDENTITY";
  isEnabled: boolean;
};

type CloudRole = {
  id: string;
  name: string;
};

type RoleAssignment = {
  id: string;
  cloudIdentityId: string;
  cloudRoleDefinitionId: string;
};

type IdentitiesResponse = {
  total: number;
  identities: CloudIdentity[];
};

type RolesResponse = {
  total: number;
  roles: CloudRole[];
};

type AssignmentsResponse = {
  total: number;
  assignments: RoleAssignment[];
};

type PermissionScopeType =
  | "TENANT"
  | "MANAGEMENT_GROUP"
  | "SUBSCRIPTION"
  | "RESOURCE_GROUP"
  | "RESOURCE"
  | "UNKNOWN";

type PermissionAnalysis = {
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
type PermissionAssignment = {
  assignmentId: string;
  scope: string;
  condition: string | null;
  discoverySource: string;
  identity: {
    id: string;
    displayName: string;
    identityType: CloudIdentity["identityType"];
    isEnabled: boolean;
    discoverySource: string;
  };
  analysis: PermissionAnalysis;
};

type PermissionRole = {
  roleId: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  discoverySource: string;
  permissions: {
    actions: string[];
    notActions: string[];
    dataActions: string[];
    notDataActions: string[];
  };
  assignableScopes: string[];
  assignmentCount: number;
  assignments: PermissionAssignment[];
};

type PermissionAnalysisResponse = {
  message: string;
  analysis: {
    cloudAccountId: string;
    accountId: string;
    name: string;
    rolesAnalyzed: number;
    assignmentsAnalyzed: number;
    roles: PermissionRole[];
  };
};


export default function IamPage() {
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [identities, setIdentities] = useState<CloudIdentity[]>([]);
  const [roles, setRoles] = useState<CloudRole[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [iamLoading, setIamLoading] = useState(false);
  const [iamError, setIamError] = useState("");
  const [identitySearch, setIdentitySearch] = useState("");
  const [identityTypeFilter, setIdentityTypeFilter] = useState("ALL");
  const [permissionAnalysis, setPermissionAnalysis] =
  useState<PermissionAnalysisResponse["analysis"] | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await apiRequest<AccountsResponse>("/cloud-accounts");
        const activeAccounts = data.accounts.filter(
          (account) => account.isActive
        );

        setAccounts(activeAccounts);

        const azureAccount = activeAccounts.find(
          (account) => account.provider === "AZURE"
        );

        if (azureAccount) {
          setSelectedAccountId(azureAccount.id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load cloud accounts."
        );
      } finally {
        setLoading(false);
      }
    }
    void loadAccounts();
  }, []);
    useEffect(() => {
        if (!selectedAccountId) {
        setIdentities([]);
        setRoles([]);
        setAssignments([]);
       return;
    }

  async function loadIamData() {
    setIamLoading(true);
    setIamError("");

    try {
      const [identityData, roleData, assignmentData, permissionData] =
        await Promise.all([
          apiRequest<IdentitiesResponse>("/iam/identities", {
            params: { cloudAccountId: selectedAccountId },
          }),
          apiRequest<RolesResponse>("/iam/roles", {
            params: { cloudAccountId: selectedAccountId },
          }),
          apiRequest<AssignmentsResponse>("/iam/assignments", {
            params: { cloudAccountId: selectedAccountId },
          }),
          apiRequest<PermissionAnalysisResponse>("/iam/permission-analysis", {
            params: { cloudAccountId: selectedAccountId },
          }),
        ]);

      setIdentities(identityData.identities);
      setRoles(roleData.roles);
      setAssignments(assignmentData.assignments);
      setPermissionAnalysis(permissionData.analysis);
    } catch (err) {
      setIamError(
        err instanceof Error ? err.message : "Unable to load IAM data."
      );
    } finally {
      setIamLoading(false);
    }
  }

  void loadIamData();
}, [selectedAccountId]);

const filteredIdentities = identities.filter((identity) => {
  const matchesSearch =
    identity.displayName
      .toLowerCase()
      .includes(identitySearch.toLowerCase());

  const matchesType =
    identityTypeFilter === "ALL" ||
    identity.identityType === identityTypeFilter;

  return matchesSearch && matchesType;
});
const roleIntelligence = roles.map((role) => {
  const roleAssignments = assignments.filter(
    (assignment) => assignment.cloudRoleDefinitionId === role.id
  );

  const assignedIdentityIds = new Set(
    roleAssignments.map((assignment) => assignment.cloudIdentityId)
  );

  return {
    ...role,
    assignmentCount: roleAssignments.length,
    identityCount: assignedIdentityIds.size,
  };
});

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );

  return (
    <AppShell
      title="IAM Intelligence"
      description="Identity governance, access analysis and privilege risk intelligence."
    >
      <div className="space-y-8">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              SECURITY INTELLIGENCE
            </span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Identity & Access Intelligence
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Understand identities, inspect role assignments and identify
            excessive cloud permissions across your environments.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        {iamError && (
  <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
    {iamError}
  </div>
)}

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Cloud account scope</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Select an active Azure account to inspect its IAM configuration.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Cloud size={17} className="text-primary" />
              <select
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                disabled={loading || accounts.length === 0}
                className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select an account</option>
                {accounts
                  .filter((account) => account.provider === "AZURE")
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {account.environment}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw size={15} className="animate-spin" />
              Loading cloud accounts...
            </p>
          ) : selectedAccount ? (
            <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Provider</p>
                <p className="mt-1 text-sm font-medium">Microsoft Azure</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Environment</p>
                <p className="mt-1 text-sm font-medium">
                  {selectedAccount.environment}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account ID</p>
                <p className="mt-1 break-all text-sm font-medium">
                  {selectedAccount.accountId}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
              No active Azure account is available. Register or activate an
              Azure account to use IAM Intelligence.
            </p>
          )}
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total identities", icon: Users },
            { label: "Privileged identities", icon: Shield },
            { label: "Role assignments", icon: KeyRound },
            { label: "Disabled identities", icon: AlertCircle },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
                <item.icon size={18} className="text-primary" />
              </div>
              <p className="mt-5 text-2xl font-semibold tabular-nums">
  {iamLoading
    ? "—"
    : item.label === "Total identities"
      ? identities.length
      : item.label === "Privileged identities"
        ? new Set(
            assignments
              .filter(
                (assignment) =>
                  roles.find(
                    (role) => role.id === assignment.cloudRoleDefinitionId
                  )?.name === "Owner"
              )
              .map((assignment) => assignment.cloudIdentityId)
          ).size
        : item.label === "Role assignments"
          ? assignments.length
          : identities.filter((identity) => !identity.isEnabled).length}
</p>
              <p className="mt-1 text-xs text-muted-foreground">
                     {iamLoading ? "Loading IAM data..." : "From discovered IAM configuration"}
                </p>
            </div>
          ))}
        </section>
        <section className="space-y-4">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h3 className="text-lg font-semibold">Identity Inventory</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Review identities and their current access status.
      </p>
    </div>

    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        placeholder="Search identities..."
        value={identitySearch}
        onChange={(event) => setIdentitySearch(event.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <select
        value={identityTypeFilter}
        onChange={(event) => setIdentityTypeFilter(event.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="ALL">All identity types</option>
        <option value="USER">Users</option>
        <option value="GROUP">Groups</option>
        <option value="SERVICE_PRINCIPAL">Service principals</option>
        <option value="MANAGED_IDENTITY">Managed identities</option>
      </select>
    </div>
  </div>

  <div className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-5 py-4 font-medium">Identity</th>
            <th className="px-5 py-4 font-medium">Identity type</th>
            <th className="px-5 py-4 font-medium">Assigned roles</th>
            <th className="px-5 py-4 font-medium">Account status</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {iamLoading ? (
            <tr>
              <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                Loading identities...
              </td>
            </tr>
          ) : filteredIdentities.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                No identities match your search.
              </td>
            </tr>
          ) : (
            filteredIdentities.map((identity) => {
              const identityRoles = assignments
                .filter(
                  (assignment) => assignment.cloudIdentityId === identity.id
                )
                .map(
                  (assignment) =>
                    roles.find(
                      (role) =>
                        role.id === assignment.cloudRoleDefinitionId
                    )?.name
                )
                .filter((role): role is string => Boolean(role));

              return (
                <tr
                  key={identity.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium">{identity.displayName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {identity.id}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-md bg-muted px-2 py-1 text-xs">
                      {identity.identityType.replaceAll("_", " ")}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {identityRoles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {identityRoles.map((role) => (
                          <span
                            key={role}
                            className="rounded-md border border-border px-2 py-1 text-xs"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No assigned roles
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
                        identity.isEnabled
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          identity.isEnabled
                            ? "bg-emerald-400"
                            : "bg-red-400"
                        }`}
                      />
                      {identity.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>

    <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
      Showing {filteredIdentities.length} of {identities.length} identities
      <span className="ml-2">· Simulated discovery data</span>
    </div>
  </div>
</section>
<section className="space-y-4">
  <div>
    <h3 className="text-lg font-semibold">Role Intelligence</h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Understand role definitions and how they are assigned across identities.
    </p>
  </div>

  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {roleIntelligence.map((role) => (
      <div
        key={role.id}
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-semibold">{role.name}</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Azure role definition
            </p>
          </div>

          <Shield size={19} className="shrink-0 text-primary" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Assigned identities</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {role.identityCount}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Assignments</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {role.assignmentCount}
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>

  {!iamLoading && roleIntelligence.length === 0 && (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <Shield className="mx-auto text-muted-foreground" size={24} />
      <p className="mt-3 text-sm font-medium">No role definitions found</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Run IAM discovery to retrieve role definitions.
      </p>
    </div>
  )}

  <p className="text-xs text-muted-foreground">
    Role assignment counts are based on discovered configuration.
    Effective permissions have not yet been calculated.
  </p>
  </section>
<section className="space-y-4">
  <div>
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-lg font-semibold">Permission Intelligence</h3>
      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
        SIMULATED ANALYSIS
      </span>
    </div>
    <p className="mt-1 text-sm text-muted-foreground">
      Inspect declared management permissions, data permissions, exclusions
      and assignment scopes.
    </p>
  </div>
  {iamLoading ? (
    <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      <RefreshCw size={18} className="mx-auto mb-3 animate-spin" />
      Analyzing IAM permissions...
    </div>
  ) : !permissionAnalysis ? (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <Shield size={24} className="mx-auto text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">
        Permission analysis unavailable
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Select an active cloud account to inspect its permission configuration.
      </p>
    </div>
  ) : (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Wildcard management",
            count: permissionAnalysis.roles.reduce(
              (total, role) =>
                total +
                role.assignments.filter(
                  (assignment) =>
                    assignment.analysis.hasWildcardManagementAccess
                ).length,
              0
            ),
          },
          {
            label: "Read-only patterns",
            count: permissionAnalysis.roles.reduce(
              (total, role) =>
                total +
                role.assignments.filter(
                  (assignment) =>
                    assignment.analysis.hasReadOnlyManagementPattern
                ).length,
              0
            ),
          },
          {
            label: "Access management",
            count: permissionAnalysis.roles.reduce(
              (total, role) =>
                total +
                role.assignments.filter(
                  (assignment) =>
                    assignment.analysis.hasAccessManagementPermissions
                ).length,
              0
            ),
          },
          {
            label: "Data-plane permissions",
            count: permissionAnalysis.roles.reduce(
              (total, role) =>
                total +
                role.assignments.filter(
                  (assignment) =>
                    assignment.analysis.hasDataPlanePermissions
                ).length,
              0
            ),
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="mt-4 text-2xl font-semibold tabular-nums">
              {metric.count}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Matching assignments
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {permissionAnalysis.roles.map((role) => (
          <div
            key={role.roleId}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h4 className="font-semibold">{role.name}</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {role.assignmentCount} role assignments analyzed
                </p>
              </div>
              <Shield size={19} className="text-primary" />
            </div>

            <div className="divide-y divide-border">
              {role.assignments.map((assignment) => {
                const analysis = assignment.analysis;

                const indicators = [
                  {
                    label: "Wildcard management access",
                    active: analysis.hasWildcardManagementAccess,
                  },
                  {
                    label: "Read-only management pattern",
                    active: analysis.hasReadOnlyManagementPattern,
                  },
                  {
                    label: "Access management permissions",
                    active: analysis.hasAccessManagementPermissions,
                  },
                  {
                    label: "Data-plane permissions",
                    active: analysis.hasDataPlanePermissions,
                  },
                  {
                    label: "Declared exclusions",
                    active: analysis.hasDeclaredExclusions,
                  },
                ];

                return (
                  <div key={assignment.assignmentId} className="space-y-4 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">
                          {assignment.identity.displayName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {assignment.identity.identityType.replaceAll(
                            "_",
                            " "
                          )}
                          {" · "}
                          {assignment.identity.isEnabled
                            ? "Enabled"
                            : "Disabled"}
                        </p>
                      </div>

                      <span className="w-fit rounded-md border border-border px-2 py-1 text-xs">
                        {analysis.scopeType.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Permission classification
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {indicators.map((indicator) => (
                          <span
                            key={indicator.label}
                            className={`rounded-md px-2.5 py-1.5 text-xs ${
                              indicator.active
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {indicator.active ? "Detected: " : "Not detected: "}
                            {indicator.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Management actions
                        </p>
                        {analysis.managementActions.length > 0 ? (
                          <div className="space-y-1">
                            {analysis.managementActions.map((action, index) => (
                              <code
                                key={`${action}-${index}`}
                                className="block break-all rounded bg-muted/50 px-2 py-1 text-xs"
                              >
                                {action}
                              </code>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No management actions declared.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Data actions
                        </p>
                        {analysis.dataActions.length > 0 ? (
                          <div className="space-y-1">
                            {analysis.dataActions.map((action, index) => (
                              <code
                                key={`${action}-${index}`}
                                className="block break-all rounded bg-muted/50 px-2 py-1 text-xs"
                              >
                                {action}
                              </code>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No data actions declared.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Excluded management actions
                        </p>
                        {analysis.excludedManagementActions.length > 0 ? (
                          <div className="space-y-1">
                            {analysis.excludedManagementActions.map(
                              (action, index) => (
                                <code
                                  key={`${action}-${index}`}
                                  className="block break-all rounded bg-muted/50 px-2 py-1 text-xs"
                                >
                                  {action}
                                </code>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No management exclusions declared.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Excluded data actions
                        </p>
                        {analysis.excludedDataActions.length > 0 ? (
                          <div className="space-y-1">
                            {analysis.excludedDataActions.map(
                              (action, index) => (
                                <code
                                  key={`${action}-${index}`}
                                  className="block break-all rounded bg-muted/50 px-2 py-1 text-xs"
                                >
                                  {action}
                                </code>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No data exclusions declared.
                          </p>
                        )}
                      </div>
                    </div>

                    {analysis.analysisLimitations.length > 0 && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-medium">
                          Analysis limitations
                        </p>
                        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {analysis.analysisLimitations.map((limitation, index) => (
                            <li key={index}>{limitation}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        This is a first-pass analysis of declared role permissions, not a
        complete calculation of effective Azure access. Results use simulated
        discovery data. Group membership, inherited assignments, PIM and
        conditional access are not fully evaluated.
      </p>
    </>
  )}
</section>
      </div>
    </AppShell>
  );
}
