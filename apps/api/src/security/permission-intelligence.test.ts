
import { describe, expect, it } from "vitest";
import {
  analyzeRolePermissions,
  parseRolePermissions,
} from "./permission-intelligence.js";

describe("parseRolePermissions", () => {
  it("accepts valid Azure role permissions", () => {
    const result = parseRolePermissions({
      actions: ["*"],
      notActions: [],
      dataActions: [],
      notDataActions: [],
    });

    expect(result.actions).toEqual(["*"]);
  });

  it("rejects invalid permission structures", () => {
    expect(() =>
      parseRolePermissions({
        actions: "invalid",
      })
    ).toThrow();
  });

  it("defaults missing permission arrays to empty arrays", () => {
    expect(parseRolePermissions({})).toEqual({
      actions: [],
      notActions: [],
      dataActions: [],
      notDataActions: [],
    });
  });
});

describe("analyzeRolePermissions", () => {
  it("identifies unrestricted management actions", () => {
    const result = analyzeRolePermissions(
      {
        actions: ["*"],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
      "/subscriptions/sub-001"
    );

    expect(result.hasWildcardManagementAccess).toBe(true);
    expect(result.scopeType).toBe("SUBSCRIPTION");
  });

  it("identifies read-only management patterns", () => {
    const result = analyzeRolePermissions(
      {
        actions: ["*/read"],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
      "/subscriptions/sub-001"
    );

    expect(result.hasReadOnlyManagementPattern).toBe(true);
  });

  it("identifies access management permissions", () => {
    const result = analyzeRolePermissions(
      {
        actions: ["Microsoft.Authorization/*/Write"],
        notActions: [],
        dataActions: [],
        notDataActions: [],
      },
      "/subscriptions/sub-001"
    );

    expect(result.hasAccessManagementPermissions).toBe(true);
  });

  it("identifies data-plane permissions separately", () => {
    const result = analyzeRolePermissions(
      {
        actions: ["*/read"],
        notActions: [],
        dataActions: ["Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read"],
        notDataActions: [],
      },
      "/subscriptions/sub-001"
    );

    expect(result.hasDataPlanePermissions).toBe(true);
  });

  it("records declared exclusions without treating them as explicit denies", () => {
    const result = analyzeRolePermissions(
      {
        actions: ["*"],
        notActions: ["Microsoft.Authorization/*"],
        dataActions: [],
        notDataActions: [],
      },
      "/subscriptions/sub-001"
    );

    expect(result.hasDeclaredExclusions).toBe(true);
    expect(result.excludedManagementActions).toEqual([
      "Microsoft.Authorization/*",
    ]);
  });

  it("classifies resource group scope", () => {
    const result = analyzeRolePermissions(
      {},
      "/subscriptions/sub-001/resourceGroups/production-rg"
    );

    expect(result.scopeType).toBe("RESOURCE_GROUP");
  });

  it("classifies tenant scope", () => {
    const result = analyzeRolePermissions({}, "/");

    expect(result.scopeType).toBe("TENANT");
  });

  it("includes analysis limitations", () => {
    const result = analyzeRolePermissions(
      {},
      "/subscriptions/sub-001"
    );

    expect(result.analysisLimitations.length).toBeGreaterThan(0);
  });
});
