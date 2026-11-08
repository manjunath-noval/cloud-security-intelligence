
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  cloudAccount: {
    findUnique: vi.fn(),
  },
  cloudResource: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../db.js", () => ({
  prisma: prismaMock,
}));

import { discoverCloudResources } from "../discovery/discovery.service.js";

describe("Cloud Resource Discovery Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject when the cloud account does not exist", async () => {
    prismaMock.cloudAccount.findUnique.mockResolvedValue(null);

    await expect(
      discoverCloudResources("non-existent-account")
    ).rejects.toThrow("Cloud account not found.");

    expect(prismaMock.cloudAccount.findUnique).toHaveBeenCalledWith({
      where: {
        id: "non-existent-account",
      },
    });
  });

  it("should reject inactive cloud accounts", async () => {
    prismaMock.cloudAccount.findUnique.mockResolvedValue({
      id: "test-account",
      name: "Inactive Azure",
      provider: "AZURE",
      accountId: "azure-test-001",
      region: "centralindia",
      isActive: false,
    } as any);

    await expect(
      discoverCloudResources("test-account")
    ).rejects.toThrow("Cloud account is inactive.");

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("should reject unsupported discovery providers", async () => {
    prismaMock.cloudAccount.findUnique.mockResolvedValue({
      id: "aws-test-account",
      name: "AWS Production",
      provider: "AWS",
      accountId: "aws-prod-001",
      region: "ap-south-1",
      isActive: true,
    } as any);

    await expect(
      discoverCloudResources("aws-test-account")
    ).rejects.toThrow("Discovery is not yet implemented for AWS.");

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("should successfully discover and create five Azure resources", async () => {
    prismaMock.cloudAccount.findUnique.mockResolvedValue({
      id: "test-account",
      name: "Development Azure",
      provider: "AZURE",
      accountId: "azure-test-001",
      region: "centralindia",
      isActive: true,
    });

    const findUnique = vi.fn().mockResolvedValue(null);
    const upsert = vi.fn().mockResolvedValue({});

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        cloudResource: {
          findUnique,
          upsert,
        },
      } as any)
    );

    const result = await discoverCloudResources("test-account");

    expect(result).toMatchObject({
      cloudAccount: {
        id: "test-account",
        name: "Development Azure",
        provider: "AZURE",
      },
      discoverySource: "SIMULATED",
      created: 5,
      updated: 0,
      total: 5,
    });

    expect(findUnique).toHaveBeenCalledTimes(5);
    expect(upsert).toHaveBeenCalledTimes(5);
  });
  it("should update existing resources without creating duplicates", async () => {
  prismaMock.cloudAccount.findUnique.mockResolvedValue({
    id: "test-account",
    name: "Development Azure",
    provider: "AZURE",
    accountId: "azure-test-001",
    region: "centralindia",
    isActive: true,
  });

  const findUnique = vi.fn().mockResolvedValue({
    id: "existing-resource",
  });

  const upsert = vi.fn().mockResolvedValue({});

  prismaMock.$transaction.mockImplementation(async (callback) =>
    callback({
      cloudResource: {
        findUnique,
        upsert,
      },
    } as any)
  );

  const result = await discoverCloudResources("test-account");

  expect(result).toMatchObject({
    created: 0,
    updated: 5,
    total: 5,
  });

  expect(findUnique).toHaveBeenCalledTimes(5);
  expect(upsert).toHaveBeenCalledTimes(5);
});
it("should reject when the database transaction fails", async () => {
  prismaMock.cloudAccount.findUnique.mockResolvedValue({
    id: "test-account",
    name: "Development Azure",
    provider: "AZURE",
    accountId: "azure-test-001",
    region: "centralindia",
    isActive: true,
  });

  prismaMock.$transaction.mockRejectedValue(
    new Error("Database transaction failed")
  );

  await expect(
    discoverCloudResources("test-account")
  ).rejects.toThrow("Database transaction failed");
});
});
