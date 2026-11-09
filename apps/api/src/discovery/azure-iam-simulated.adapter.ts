
import type {
  CloudIamDiscoveryAdapter,
  IamDiscoveryContext,
  DiscoveredIamConfiguration
} from "./iam-types.js";

export class AzureIamSimulatedAdapter
  implements CloudIamDiscoveryAdapter
{
  readonly provider = "AZURE" as const;

  async discover(
    context: IamDiscoveryContext
  ): Promise<DiscoveredIamConfiguration> {
    if (context.provider !== this.provider) {
      throw new Error(
        "Azure IAM adapter can only discover Azure accounts."
      );
    }

    const subscriptionScope =
      `/subscriptions/${context.accountId}`;

    const identities = [
      {
        providerIdentityId: "user-admin-001",
        displayName: "Alex Morgan",
        identityType: "USER" as const,
        userPrincipalName: "alex.morgan@example.com",
        isEnabled: true,
        metadata: { simulated: true, department: "IT" },
        discoverySource: "SIMULATED" as const
      },
      {
        providerIdentityId: "user-developer-001",
        displayName: "Jordan Lee",
        identityType: "USER" as const,
        userPrincipalName: "jordan.lee@example.com",
        isEnabled: true,
        metadata: { simulated: true, department: "Engineering" },
        discoverySource: "SIMULATED" as const
      },
      {
        providerIdentityId: "sp-automation-001",
        displayName: "Deployment Automation",
        identityType: "SERVICE_PRINCIPAL" as const,
        isEnabled: true,
        metadata: { simulated: true, applicationId: "app-001" },
        discoverySource: "SIMULATED" as const
      },
      {
        providerIdentityId: "mi-web-server-001",
        displayName: "Web Server Managed Identity",
        identityType: "MANAGED_IDENTITY" as const,
        isEnabled: true,
        metadata: { simulated: true, resourceName: "web-server-01" },
        discoverySource: "SIMULATED" as const
      },
      {
        providerIdentityId: "user-disabled-001",
        displayName: "Former Administrator",
        identityType: "USER" as const,
        userPrincipalName: "former.admin@example.com",
        isEnabled: false,
        metadata: { simulated: true, department: "IT" },
        discoverySource: "SIMULATED" as const
      }
    ];

    const roleDefinitions = [
      {
        providerRoleDefinitionId: "role-owner",
        name: "Owner",
        description: "Grants full access to manage resources and assign roles.",
        isBuiltIn: true,
        permissions: {
          actions: ["*"],
          notActions: [],
          dataActions: [],
          notDataActions: []
        },
        assignableScopes: ["/"],
        discoverySource: "SIMULATED" as const
      },
      {
        providerRoleDefinitionId: "role-reader",
        name: "Reader",
        description: "Can view existing resources.",
        isBuiltIn: true,
        permissions: {
          actions: ["*/read"],
          notActions: [],
          dataActions: [],
          notDataActions: []
        },
        assignableScopes: ["/"],
        discoverySource: "SIMULATED" as const
      },
      {
        providerRoleDefinitionId: "role-user-access-admin",
        name: "User Access Administrator",
        description: "Can manage user access to Azure resources.",
        isBuiltIn: true,
        permissions: {
          actions: ["Microsoft.Authorization/*/Write"],
          notActions: [],
          dataActions: [],
          notDataActions: []
        },
        assignableScopes: ["/"],
        discoverySource: "SIMULATED" as const
      }
    ];

    const roleAssignments = [
      {
        providerAssignmentId: "assignment-001",
        providerIdentityId: "user-admin-001",
        providerRoleDefinitionId: "role-owner",
        scope: subscriptionScope,
        discoverySource: "SIMULATED" as const
      },
      {
        providerAssignmentId: "assignment-002",
        providerIdentityId: "user-developer-001",
        providerRoleDefinitionId: "role-reader",
        scope: subscriptionScope,
        discoverySource: "SIMULATED" as const
      },
      {
        providerAssignmentId: "assignment-003",
        providerIdentityId: "sp-automation-001",
        providerRoleDefinitionId: "role-owner",
        scope: subscriptionScope,
        discoverySource: "SIMULATED" as const
      },
      {
        providerAssignmentId: "assignment-004",
        providerIdentityId: "mi-web-server-001",
        providerRoleDefinitionId: "role-reader",
        scope: `${subscriptionScope}/resourceGroups/production-rg`,
        discoverySource: "SIMULATED" as const
      },
      {
        providerAssignmentId: "assignment-005",
        providerIdentityId: "user-disabled-001",
        providerRoleDefinitionId: "role-user-access-admin",
        scope: subscriptionScope,
        discoverySource: "SIMULATED" as const
      }
    ];

    return {
      identities,
      roleDefinitions,
      roleAssignments
    };
  }
}
