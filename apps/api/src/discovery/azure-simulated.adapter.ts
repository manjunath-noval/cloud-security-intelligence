
import type {
  CloudDiscoveryAdapter,
  DiscoveredResource,
  DiscoveryContext
} from "./types.js";

export class AzureSimulatedAdapter implements CloudDiscoveryAdapter {
  readonly provider = "AZURE" as const;

  async discover(
    context: DiscoveryContext
  ): Promise<DiscoveredResource[]> {
    if (context.provider !== this.provider) {
      throw new Error(
        "Azure adapter can only discover Azure accounts."
      );
    }

    const region = context.region ?? "centralindia";

    return [
      {
        providerResourceId: `/subscriptions/${context.accountId}/resourceGroups/production-rg/providers/Microsoft.Compute/virtualMachines/web-server-01`,
        name: "web-server-01",
        resourceType: "VIRTUAL_MACHINE",
        provider: "AZURE",
        region,
        discoverySource: "SIMULATED",
        metadata: {
          resourceGroup: "production-rg",
          vmSize: "Standard_D2s_v5",
          operatingSystem: "Ubuntu Linux",
          powerState: "running",
          simulated: true
        }
      },
      {
        providerResourceId: `/subscriptions/${context.accountId}/resourceGroups/production-rg/providers/Microsoft.Storage/storageAccounts/cloudstorage01`,
        name: "cloudstorage01",
        resourceType: "STORAGE_ACCOUNT",
        provider: "AZURE",
        region,
        discoverySource: "SIMULATED",
        metadata: {
          resourceGroup: "production-rg",
          storageType: "StorageV2",
          replication: "LRS",
          publicAccess: "enabled",
          simulated: true
        }
      },
      {
        providerResourceId: `/subscriptions/${context.accountId}/resourceGroups/network-rg/providers/Microsoft.Network/virtualNetworks/production-vnet`,
        name: "production-vnet",
        resourceType: "VIRTUAL_NETWORK",
        provider: "AZURE",
        region,
        discoverySource: "SIMULATED",
        metadata: {
          resourceGroup: "network-rg",
          addressSpace: ["10.0.0.0/16"],
          simulated: true
        }
      },
      {
        providerResourceId: `/subscriptions/${context.accountId}/resourceGroups/network-rg/providers/Microsoft.Network/networkSecurityGroups/web-nsg`,
        name: "web-nsg",
        resourceType: "NETWORK_SECURITY_GROUP",
        provider: "AZURE",
        region,
        discoverySource: "SIMULATED",
        metadata: {
          resourceGroup: "network-rg",
          securityRules: [
            {
              name: "Allow-SSH",
              port: 22,
              protocol: "TCP",
              source: "*",
              access: "Allow"
            }
          ],
          simulated: true
        }
      },
      {
        providerResourceId: `/subscriptions/${context.accountId}/resourceGroups/data-rg/providers/Microsoft.Sql/servers/app-sql-server/databases/application-db`,
        name: "application-db",
        resourceType: "SQL_DATABASE",
        provider: "AZURE",
        region,
        discoverySource: "SIMULATED",
        metadata: {
          resourceGroup: "data-rg",
          serverName: "app-sql-server",
          sku: "Basic",
          simulated: true
        }
      }
    ];
  }
}
