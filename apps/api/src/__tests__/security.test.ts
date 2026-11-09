
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, scanCloudAccountMock } = vi.hoisted(() => ({
  prismaMock: {
    securityFinding: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
  scanCloudAccountMock: vi.fn(),
}));

vi.mock("../db.js", () => ({
  prisma: prismaMock,
}));

vi.mock("../security/security.service.js", () => ({
  scanCloudAccount: scanCloudAccountMock,
}));

import securityRouter from "../routes/security.js";

const app = express();
app.use(express.json());
app.use("/api/security", securityRouter);

describe("Security Findings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.securityFinding.findMany.mockResolvedValue([]);
    prismaMock.securityFinding.count.mockResolvedValue(0);
  });

  it("should retrieve all findings with default pagination", async () => {
    const response = await request(app)
      .get("/api/security/findings")
      .expect(200);

    expect(response.body).toMatchObject({
      findings: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });

    expect(prismaMock.securityFinding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      })
    );

    expect(prismaMock.securityFinding.count).toHaveBeenCalledTimes(1);
  });

  it("should filter findings by severity and status", async () => {
    await request(app)
      .get("/api/security/findings?severity=CRITICAL&status=OPEN")
      .expect(200);

    const query = prismaMock.securityFinding.findMany.mock.calls[0][0];

    expect(query.where.AND).toContainEqual({
      severity: "CRITICAL",
    });

    expect(query.where.AND).toContainEqual({
      status: "OPEN",
    });
  });

  it("should filter findings by cloud account and provider", async () => {
    const accountId = "7f2f0d56-548c-4ff9-a093-263d22c74afd";

    await request(app)
      .get(
        `/api/security/findings?cloudAccountId=${accountId}&provider=AZURE`
      )
      .expect(200);

    const query = prismaMock.securityFinding.findMany.mock.calls[0][0];

    expect(query.where.AND).toContainEqual({
      cloudResource: {
        is: {
          cloudAccountId: accountId,
          provider: "AZURE",
        },
      },
    });
  });

  it("should filter findings by resource type", async () => {
    await request(app)
      .get("/api/security/findings?resourceType=STORAGE_ACCOUNT")
      .expect(200);

    const query = prismaMock.securityFinding.findMany.mock.calls[0][0];

    expect(query.where.AND).toContainEqual({
      cloudResource: {
        is: {
          resourceType: {
            equals: "STORAGE_ACCOUNT",
            mode: "insensitive",
          },
        },
      },
    });
  });

  it("should search finding titles, descriptions, and resource names", async () => {
    await request(app)
      .get("/api/security/findings?search=SSH")
      .expect(200);

    const query = prismaMock.securityFinding.findMany.mock.calls[0][0];

    expect(query.where.AND).toContainEqual({
      OR: [
        {
          title: {
            contains: "SSH",
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: "SSH",
            mode: "insensitive",
          },
        },
        {
          cloudResource: {
            is: {
              name: {
                contains: "SSH",
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  });

  it("should apply pagination correctly", async () => {
    prismaMock.securityFinding.count.mockResolvedValue(25);

    const response = await request(app)
      .get("/api/security/findings?page=2&limit=10")
      .expect(200);

    expect(prismaMock.securityFinding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );

    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("should reject invalid severity values", async () => {
    const response = await request(app)
      .get("/api/security/findings?severity=URGENT")
      .expect(400);

    expect(response.body.message).toBe(
      "Invalid findings query parameters."
    );

    expect(prismaMock.securityFinding.findMany).not.toHaveBeenCalled();
  });

  it("should reject invalid pagination values", async () => {
    await request(app)
      .get("/api/security/findings?page=0&limit=200")
      .expect(400);

    expect(prismaMock.securityFinding.findMany).not.toHaveBeenCalled();
  });

  it("should return 500 when finding retrieval fails", async () => {
    prismaMock.securityFinding.findMany.mockRejectedValue(
      new Error("Database connection failed")
    );

    const response = await request(app)
      .get("/api/security/findings")
      .expect(500);

    expect(response.body.message).toBe(
      "Unable to retrieve security findings."
    );
  });
});
