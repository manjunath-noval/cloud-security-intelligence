
import { prisma } from "../db.js";
import { AzureSimulatedAdapter } from "./azure-simulated.adapter.js";
import type {
  CloudDiscoveryAdapter,
  DiscoveryContext
} from "./types.js";

const adapters: Partial<
  Record<DiscoveryContext["provider"], CloudDiscoveryAdapter>
> = {
  AZURE: new AzureSimulatedAdapter()
};

export async function discoverCloudResources(
  cloudAccountId: string
) {
  const account = await prisma.cloudAccount.findUnique({
    where: {
      id: cloudAccountId
    }
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

  const adapter = adapters[account.provider];

  if (!adapter) {
    throw new Error(
      `Discovery is not yet implemented for ${account.provider}.`
    );
  }

  const context: DiscoveryContext = {
    cloudAccountId: account.id,
    provider: account.provider,
    accountId: account.accountId,
    region: account.region ?? undefined
  };

  const discoveredResources = await adapter.discover(context);

  const results = await prisma.$transaction(async (tx) => {
    let created = 0;
    let updated = 0;

    for (const resource of discoveredResources) {
      const existing = await tx.cloudResource.findUnique({
        where: {
          cloudAccountId_providerResourceId: {
            cloudAccountId: account.id,
            providerResourceId: resource.providerResourceId
          }
        }
      });

      await tx.cloudResource.upsert({
        where: {
          cloudAccountId_providerResourceId: {
            cloudAccountId: account.id,
            providerResourceId: resource.providerResourceId
          }
        },
        create: {
          cloudAccountId: account.id,
          ...resource,
          metadata: resource.metadata as import(
            "../generated/prisma/client.js"
          ).Prisma.InputJsonValue
        },
        update: {
          name: resource.name,
          resourceType: resource.resourceType,
          provider: resource.provider,
          region: resource.region,
          metadata: resource.metadata as import(
            "../generated/prisma/client.js"
          ).Prisma.InputJsonValue,
          discoverySource: resource.discoverySource
        }
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    }

    return {
      created,
      updated,
      total: discoveredResources.length
    };
  });

  return {
    cloudAccount: {
      id: account.id,
      name: account.name,
      provider: account.provider
    },
    discoverySource: "SIMULATED",
    ...results
  };
}
