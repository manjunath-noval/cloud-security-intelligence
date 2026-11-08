
import { describe, expect, it } from "vitest";
import { AzureSimulatedAdapter } from "../discovery/azure-simulated.adapter.js";
import type { DiscoveryContext } from "../discovery/types.js";

describe("Azure Simulated Discovery Adapter", () => {
  const adapter = new AzureSimulatedAdapter();

  const context: DiscoveryContext = {
    cloudAccountId: "test-account",
    provider: "AZURE",
    accountId: "azure-test-001",
    region: "centralindia",
  };

  it("should discover exactly five resources", async () => {
    const resources = await adapter.discover(context);
    expect(resources).toHaveLength(5);
  });

  it("should reject non-Azure accounts", async () => {
    const invalidContext: DiscoveryContext = {
      ...context,
      provider: "AWS",
    };

    await expect(adapter.discover(invalidContext)).rejects.toThrow(
      "Azure adapter can only discover Azure accounts."
    );
  });

  it("should return only Azure resources", async () => {
    const resources = await adapter.discover(context);
    expect(resources.every((resource) => resource.provider === "AZURE")).toBe(true);
  });

  it("should mark every resource as simulated", async () => {
    const resources = await adapter.discover(context);
    expect(resources.every((resource) => resource.discoverySource === "SIMULATED")).toBe(true);
  });

  it("should return the expected resource types", async () => {
    const resources = await adapter.discover(context);

    expect(resources.map((resource) => resource.resourceType)).toEqual(
      expect.arrayContaining([
        "VIRTUAL_MACHINE",
        "STORAGE_ACCOUNT",
        "VIRTUAL_NETWORK",
        "NETWORK_SECURITY_GROUP",
        "SQL_DATABASE",
      ])
    );
  });
});
