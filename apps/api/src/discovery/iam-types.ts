
import type { CloudIdentityType } from "../generated/prisma/client.js";

export type DiscoveredIdentity = {
  providerIdentityId: string;
  displayName: string;
  identityType: CloudIdentityType;
  userPrincipalName?: string;
  isEnabled: boolean;
  metadata: Record<string, unknown>;
  discoverySource: "SIMULATED" | "LIVE";
};

export type DiscoveredRoleDefinition = {
  providerRoleDefinitionId: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
  permissions: {
    actions: string[];
    notActions: string[];
    dataActions: string[];
    notDataActions: string[];
  };
  assignableScopes: string[];
  discoverySource: "SIMULATED" | "LIVE";
};

export type DiscoveredRoleAssignment = {
  providerAssignmentId: string;
  providerIdentityId: string;
  providerRoleDefinitionId: string;
  scope: string;
  condition?: string;
  conditionVersion?: string;
  discoverySource: "SIMULATED" | "LIVE";
};

export type DiscoveredIamConfiguration = {
  identities: DiscoveredIdentity[];
  roleDefinitions: DiscoveredRoleDefinition[];
  roleAssignments: DiscoveredRoleAssignment[];
};

export type IamDiscoveryContext = {
  cloudAccountId: string;
  provider: "AZURE" | "AWS" | "GCP";
  accountId: string;
};

export interface CloudIamDiscoveryAdapter {
  readonly provider: IamDiscoveryContext["provider"];

  discover(
    context: IamDiscoveryContext
  ): Promise<DiscoveredIamConfiguration>;
}
