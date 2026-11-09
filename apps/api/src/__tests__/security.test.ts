
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, scanCloudAccountMock } = vi.hoisted(() => ({
  prismaMock: {
    securityFinding: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    securityFindingEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
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
  prismaMock.securityFinding.findUnique.mockResolvedValue(null);
  prismaMock.securityFinding.updateMany.mockResolvedValue({ count: 1 });

  prismaMock.securityFindingEvent.create.mockResolvedValue({});
  prismaMock.securityFindingEvent.findMany.mockResolvedValue([]);

  prismaMock.$transaction.mockImplementation(
    async (callback: (transaction: typeof prismaMock) => Promise<unknown>) =>
      callback(prismaMock)
  );
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
    it("should acknowledge an OPEN finding and create an audit event", async () => {
    const finding = {
      id: "7f2f0d56-548c-4ff9-a093-263d22c74afd",
      status: "ACKNOWLEDGED",
    };

    prismaMock.securityFinding.findUnique.mockResolvedValue({
      id: finding.id,
      status: "OPEN",
    });

    // The route reads the finding again after updating it.
    prismaMock.securityFinding.findUnique
      .mockResolvedValueOnce({
        id: finding.id,
        status: "OPEN",
      })
      .mockResolvedValueOnce(finding);

    const response = await request(app)
      .patch(`/api/security/findings/${finding.id}/acknowledge`)
      .expect(200);

    expect(response.body.finding.status).toBe("ACKNOWLEDGED");

    expect(prismaMock.securityFinding.updateMany).toHaveBeenCalledWith({
      where: {
        id: finding.id,
        status: "OPEN",
      },
      data: expect.objectContaining({
        status: "ACKNOWLEDGED",
        acknowledgedAt: expect.any(Date),
      }),
    });

    expect(prismaMock.securityFindingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        findingId: finding.id,
        eventType: "ACKNOWLEDGED",
        fromStatus: "OPEN",
        toStatus: "ACKNOWLEDGED",
        actorType: "USER",
      }),
    });
  });

  it("should return 404 when acknowledging a missing finding", async () => {
    const id = "7f2f0d56-548c-4ff9-a093-263d22c74afd";

    prismaMock.securityFinding.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/security/findings/${id}/acknowledge`)
      .expect(404);

    expect(response.body.message).toBe("Security finding not found.");
    expect(prismaMock.securityFinding.updateMany).not.toHaveBeenCalled();
  });

  it("should reject acknowledging a finding that is not OPEN", async () => {
    const id = "7f2f0d56-548c-4ff9-a093-263d22c74afd";

    prismaMock.securityFinding.findUnique.mockResolvedValue({
      id,
      status: "RESOLVED",
    });

    const response = await request(app)
      .patch(`/api/security/findings/${id}/acknowledge`)
      .expect(409);

    expect(response.body.message).toContain("RESOLVED");
    expect(prismaMock.securityFinding.updateMany).not.toHaveBeenCalled();
  });

  it("should resolve an OPEN finding and record its resolution note", async () => {
    const id = "7f2f0d56-548c-4ff9-a093-263d22c74afd";
    const resolutionNote = "Removed public SSH access from the network rule.";

    prismaMock.securityFinding.findUnique
      .mockResolvedValueOnce({
        id,
        status: "OPEN",
      })
      .mockResolvedValueOnce({
        id,
        status: "RESOLVED",
        resolutionNote,
      });

    const response = await request(app)
      .patch(`/api/security/findings/${id}/resolve`)
      .send({ resolutionNote })
      .expect(200);

    expect(response.body.finding.status).toBe("RESOLVED");

    expect(prismaMock.securityFinding.updateMany).toHaveBeenCalledWith({
      where: {
        id,
        status: "OPEN",
      },
      data: expect.objectContaining({
        status: "RESOLVED",
        resolvedAt: expect.any(Date),
        resolutionNote,
      }),
    });

    expect(prismaMock.securityFindingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        findingId: id,
        eventType: "RESOLVED",
        fromStatus: "OPEN",
        toStatus: "RESOLVED",
        note: resolutionNote,
        actorType: "USER",
      }),
    });
  });

  it("should resolve an ACKNOWLEDGED finding", async () => {
    const id = "7f2f0d56-548c-4ff9-a093-263d22c74afd";
    const resolutionNote = "Corrected the security configuration.";

    prismaMock.securityFinding.findUnique
      .mockResolvedValueOnce({
        id,
        status: "ACKNOWLEDGED",
      })
      .mockResolvedValueOnce({
        id,
        status: "RESOLVED",
        resolutionNote,
      });

    await request(app)
      .patch(`/api/security/findings/${id}/resolve`)
      .send({ resolutionNote })
      .expect(200);

    expect(prismaMock.securityFinding.updateMany).toHaveBeenCalledWith({
      where: {
        id,
        status: "ACKNOWLEDGED",
      },
      data: expect.objectContaining({
        status: "RESOLVED",
        resolutionNote,
      }),
    });

    expect(prismaMock.securityFindingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: "ACKNOWLEDGED",
        toStatus: "RESOLVED",
      }),
    });
  });

  it("should reject a resolution request without a valid resolution note", async () => {
    const id = "7f2f0d56-548c-4ff9-a093-263d22c74afd";

    const response = await request(app)
      .patch(`/api/security/findings/${id}/resolve`)
      .send({ resolutionNote: "no" })
      .expect(400);

    expect(response.body.message).toBe(
      "A valid resolution note is required."
    );

    expect(prismaMock.securityFinding.updateMany).not.toHaveBeenCalled();
  });

  it("should return finding history in chronological order", async () => {
    const id = "7f2f0d56-548c-4ff9-a093-263d22c74afd";

    const history = [
      {
        id: "event-1",
        eventType: "DETECTED",
        fromStatus: null,
        toStatus: "OPEN",
      },
      {
        id: "event-2",
        eventType: "ACKNOWLEDGED",
        fromStatus: "OPEN",
        toStatus: "ACKNOWLEDGED",
      },
    ];

    prismaMock.securityFinding.findUnique.mockResolvedValue({
      id,
      title: "Public SSH access detected",
    });

    prismaMock.securityFindingEvent.findMany.mockResolvedValue(history);

    const response = await request(app)
      .get(`/api/security/findings/${id}/history`)
      .expect(200);

    expect(response.body.history).toEqual(history);

    expect(prismaMock.securityFindingEvent.findMany).toHaveBeenCalledWith({
      where: { findingId: id },
      orderBy: { createdAt: "asc" },
    });
  });

  it("should return 404 when retrieving history for a missing finding", async () => {
    const id = "7f2f0d56-548c-4ff9-a093-263d22c74afd";

    prismaMock.securityFinding.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/security/findings/${id}/history`)
      .expect(404);

    expect(response.body.message).toBe("Security finding not found.");
    expect(prismaMock.securityFindingEvent.findMany).not.toHaveBeenCalled();
  });
});
