
export type CloudProvider = "AZURE" | "AWS" | "GCP";

export type DiscoverySource = "SIMULATED" | "LIVE";

export type DiscoveredResource = {
  providerResourceId: string;
  name: string;
  resourceType: string;
  provider: CloudProvider;
  region?: string;
  metadata: Record<string, unknown>;
  discoverySource: DiscoverySource;
};

export type DiscoveryContext = {
  cloudAccountId: string;
  provider: CloudProvider;
  accountId: string;
  region?: string;
};

export interface CloudDiscoveryAdapter {
  readonly provider: CloudProvider;

  discover(
    context: DiscoveryContext
  ): Promise<DiscoveredResource[]>;
}
