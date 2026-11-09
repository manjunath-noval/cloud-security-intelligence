
import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";

import { AzureIamSimulatedAdapter } from "./azure-iam-simulated.adapter.js";

import type {
  CloudIamDiscoveryAdapter,
  DiscoveredIamConfiguration,
  IamDiscoveryContext
} from "./iam-types.js";

const iamAdapters: Partial<
  Record<IamDiscoveryContext["provider"], CloudIamDiscoveryAdapter>
> = {
  AZURE: new AzureIamSimulatedAdapter()
};

export async function discoverCloudIam(cloudAccountId: string) {
  const account = await prisma.cloudAccount.findUnique({
    where: { id: cloudAccountId }
  });

  if (!account) {
    throw new Error("Cloud account not found.");
  }

  if (!account.isActive) {
    throw new Error("Cloud account is inactive.");
  }

  if (
    account.provider !== "AZURE" &&
    account.provider !== "AWS" &&
    account.provider !== "GCP"
  ) {
    throw new Error("Unsupported cloud provider.");
  }

  const adapter = iamAdapters[account.provider];

  if (!adapter) {
    throw new Error(
      `IAM discovery is not yet implemented for ${account.provider}.`
    );
  }

  const context: IamDiscoveryContext = {
    cloudAccountId: account.id,
    provider: account.provider,
    accountId: account.accountId
  };

  const discovered: DiscoveredIamConfiguration =
    await adapter.discover(context);

  const result = await prisma.$transaction(async (tx) => {
    const counts = {
      identitiesCreated: 0,
      identitiesUpdated: 0,
      rolesCreated: 0,
      rolesUpdated: 0,
      assignmentsCreated: 0,
      assignmentsUpdated: 0
    };

    // Persist identities.
    for (const identity of discovered.identities) {
      const where = {
        cloudAccountId_providerIdentityId: {
          cloudAccountId: account.id,
          providerIdentityId: identity.providerIdentityId
        }
      };

      const existing = await tx.cloudIdentity.findUnique({ where });

      await tx.cloudIdentity.upsert({
        where,
        create: {
          cloudAccountId: account.id,
          ...identity,
          metadata: identity.metadata as Prisma.InputJsonValue
        },
        update: {
          displayName: identity.displayName,
          identityType: identity.identityType,
          userPrincipalName: identity.userPrincipalName,
          isEnabled: identity.isEnabled,
          metadata: identity.metadata as Prisma.InputJsonValue,
          discoverySource: identity.discoverySource
        }
      });

      if (existing) {
        counts.identitiesUpdated++;
      } else {
        counts.identitiesCreated++;
      }
    }

    // Persist role definitions.
    for (const role of discovered.roleDefinitions) {
      const where = {
        cloudAccountId_providerRoleDefinitionId: {
          cloudAccountId: account.id,
          providerRoleDefinitionId: role.providerRoleDefinitionId
        }
      };

      const existing = await tx.cloudRoleDefinition.findUnique({ where });

      await tx.cloudRoleDefinition.upsert({
        where,
        create: {
          cloudAccountId: account.id,
          providerRoleDefinitionId: role.providerRoleDefinitionId,
          name: role.name,
          description: role.description,
          isBuiltIn: role.isBuiltIn,
          permissions: role.permissions as Prisma.InputJsonValue,
          assignableScopes: role.assignableScopes as Prisma.InputJsonValue,
          discoverySource: role.discoverySource
        },
        update: {
          name: role.name,
          description: role.description,
          isBuiltIn: role.isBuiltIn,
          permissions: role.permissions as Prisma.InputJsonValue,
          assignableScopes: role.assignableScopes as Prisma.InputJsonValue,
          discoverySource: role.discoverySource
        }
      });

      if (existing) {
        counts.rolesUpdated++;
      } else {
        counts.rolesCreated++;
      }
    }

    // Persist role assignments.
    for (const assignment of discovered.roleAssignments) {
      const identity = await tx.cloudIdentity.findUnique({
        where: {
          cloudAccountId_providerIdentityId: {
            cloudAccountId: account.id,
            providerIdentityId: assignment.providerIdentityId
          }
        }
      });

      if (!identity) {
        throw new Error(
          `IAM identity not found: ${assignment.providerIdentityId}`
        );
      }

      const roleDefinition = await tx.cloudRoleDefinition.findUnique({
        where: {
          cloudAccountId_providerRoleDefinitionId: {
            cloudAccountId: account.id,
            providerRoleDefinitionId:
              assignment.providerRoleDefinitionId
          }
        }
      });

      if (!roleDefinition) {
        throw new Error(
          `IAM role definition not found: ${assignment.providerRoleDefinitionId}`
        );
      }

      const where = {
        cloudAccountId_providerAssignmentId: {
          cloudAccountId: account.id,
          providerAssignmentId: assignment.providerAssignmentId
        }
      };

      const existing = await tx.cloudRoleAssignment.findUnique({ where });

      await tx.cloudRoleAssignment.upsert({
        where,
        create: {
          cloudAccountId: account.id,
          providerAssignmentId: assignment.providerAssignmentId,
          cloudIdentityId: identity.id,
          cloudRoleDefinitionId: roleDefinition.id,
          scope: assignment.scope,
          condition: assignment.condition,
          conditionVersion: assignment.conditionVersion,
          discoverySource: assignment.discoverySource
        },
        update: {
          cloudIdentityId: identity.id,
          cloudRoleDefinitionId: roleDefinition.id,
          scope: assignment.scope,
          condition: assignment.condition,
          conditionVersion: assignment.conditionVersion,
          discoverySource: assignment.discoverySource
        }
      });

      if (existing) {
        counts.assignmentsUpdated++;
      } else {
        counts.assignmentsCreated++;
      }
    }

    return counts;
  });

  return {
    cloudAccount: {
      id: account.id,
      name: account.name,
      provider: account.provider
    },
    discoverySource: "SIMULATED",
    identitiesDiscovered: discovered.identities.length,
    roleDefinitionsDiscovered: discovered.roleDefinitions.length,
    roleAssignmentsDiscovered: discovered.roleAssignments.length,
    ...result
  };
}
