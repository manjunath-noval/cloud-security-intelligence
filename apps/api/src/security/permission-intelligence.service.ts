
import { prisma } from "../db.js";
import { analyzeRolePermissions } from "./permission-intelligence.js";

export async function getPermissionIntelligence(
  cloudAccountId: string
) {
  const account = await prisma.cloudAccount.findUnique({
    where: {
      id: cloudAccountId,
    },
    select: {
      id: true,
      accountId: true,
      name: true,
      isActive: true,
    },
  });

  if (!account) {
    throw new Error("Cloud account not found");
  }

  if (!account.isActive) {
    throw new Error("Cloud account is inactive");
  }

  const roles = await prisma.cloudRoleDefinition.findMany({
    where: {
      cloudAccountId: account.id,
    },
    include: {
      roleAssignments: {
        include: {
          cloudIdentity: {
            select: {
              id: true,
              displayName: true,
              identityType: true,
              isEnabled: true,
              discoverySource: true,
            },
          },
        },
        orderBy: {
          scope: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  let assignmentsAnalyzed = 0;

  const analyzedRoles = roles.map((role) => {
    const assignments = role.roleAssignments.map((assignment) => {
      assignmentsAnalyzed++;

      const analysis = analyzeRolePermissions(
        role.permissions,
        assignment.scope
      );

      return {
        assignmentId: assignment.id,
        scope: assignment.scope,
        condition: assignment.condition,
        discoverySource: assignment.discoverySource,

        identity: assignment.cloudIdentity,

        analysis,
      };
    });

    return {
      roleId: role.id,
      name: role.name,
      description: role.description,
      isBuiltIn: role.isBuiltIn,
      discoverySource: role.discoverySource,

      permissions: role.permissions,
      assignableScopes: role.assignableScopes,

      assignmentCount: assignments.length,
      assignments,
    };
  });

  return {
    cloudAccountId: account.id,
    accountId: account.accountId,
    accountName: account.name,

    rolesAnalyzed: analyzedRoles.length,
    assignmentsAnalyzed,

    roles: analyzedRoles,
  };
}
