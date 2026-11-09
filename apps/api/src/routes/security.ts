
import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { scanCloudAccount } from "../security/security.service.js";
import { Prisma } from "../generated/prisma/client.js";

const router = Router();

const scanParamsSchema = z.object({
  cloudAccountId: z.string().uuid(),
});

const findingParamsSchema = z.object({
  id: z.string().uuid(),
});

const resolveBodySchema = z.object({
  resolutionNote: z.string().trim().min(5).max(1000),
});

const findingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  severity: z.enum([
    "CRITICAL",
    "HIGH",
    "MEDIUM",
    "LOW",
    "INFORMATIONAL",
  ]).optional(),

  status: z.enum([
    "OPEN",
    "ACKNOWLEDGED",
    "RESOLVED",
  ]).optional(),

  cloudAccountId: z.string().uuid().optional(),
  provider: z.enum(["AZURE", "AWS", "GCP"]).optional(),
  resourceType: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional(),
});

// GET /api/security/findings
router.get("/findings", async (req, res) => {
  const validation = findingsQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({
      message: "Invalid findings query parameters.",
      errors: validation.error.flatten(),
    });
  }

  try {
    const {
      page,
      limit,
      severity,
      status,
      cloudAccountId,
      provider,
      resourceType,
      search,
    } = validation.data;

    const resourceFilters: Prisma.CloudResourceWhereInput = {};

    if (cloudAccountId) {
      resourceFilters.cloudAccountId = cloudAccountId;
    }

    if (provider) {
      resourceFilters.provider = provider;
    }

    if (resourceType) {
      resourceFilters.resourceType = {
        equals: resourceType,
        mode: "insensitive",
      };
    }

    const conditions: Prisma.SecurityFindingWhereInput[] = [];

    if (severity) conditions.push({ severity });
    if (status) conditions.push({ status });

    if (cloudAccountId || provider || resourceType) {
      conditions.push({
        cloudResource: {
          is: resourceFilters,
        },
      });
    }

    if (search) {
      conditions.push({
        OR: [
          {
            title: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            cloudResource: {
              is: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      });
    }

    const where: Prisma.SecurityFindingWhereInput = {
      AND: conditions,
    };

    const [findings, total] = await Promise.all([
      prisma.securityFinding.findMany({
        where,
        include: {
          cloudResource: {
            include: {
              cloudAccount: {
                select: {
                  id: true,
                  name: true,
                  provider: true,
                  accountId: true,
                  environment: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.securityFinding.count({ where }),
    ]);

    return res.status(200).json({
      findings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to retrieve security findings:", error);

    return res.status(500).json({
      message: "Unable to retrieve security findings.",
    });
  }
});

// PATCH /api/security/findings/:id/acknowledge
router.patch("/findings/:id/acknowledge", async (req, res) => {
  const validation = findingParamsSchema.safeParse(req.params);

  if (!validation.success) {
    return res.status(400).json({
      message: "Invalid security finding ID.",
      errors: validation.error.flatten(),
    });
  }

  try {
    const findingId = validation.data.id;

    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.securityFinding.findUnique({
        where: { id: findingId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existing) {
        return { type: "NOT_FOUND" as const };
      }

      if (existing.status !== "OPEN") {
        return {
          type: "INVALID_STATUS" as const,
          status: existing.status,
        };
      }

      const now = new Date();

      const update = await transaction.securityFinding.updateMany({
        where: {
          id: findingId,
          status: "OPEN",
        },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: now,
        },
      });

      if (update.count !== 1) {
        return { type: "CONFLICT" as const };
      }

      await transaction.securityFindingEvent.create({
        data: {
          findingId,
          eventType: "ACKNOWLEDGED",
          fromStatus: "OPEN",
          toStatus: "ACKNOWLEDGED",
          note: "Security finding acknowledged.",
          actorType: "USER",
        },
      });

      const finding = await transaction.securityFinding.findUnique({
        where: { id: findingId },
      });

      return {
        type: "SUCCESS" as const,
        finding,
      };
    });

    if (result.type === "NOT_FOUND") {
      return res.status(404).json({
        message: "Security finding not found.",
      });
    }

    if (result.type === "INVALID_STATUS") {
      return res.status(409).json({
        message: `Cannot acknowledge a finding with status ${result.status}.`,
      });
    }

    if (result.type === "CONFLICT") {
      return res.status(409).json({
        message: "The finding was modified by another request. Refresh and try again.",
      });
    }

    return res.status(200).json({
      message: "Security finding acknowledged successfully.",
      finding: result.finding,
    });
  } catch (error) {
    console.error("Failed to acknowledge security finding:", error);

    return res.status(500).json({
      message: "Unable to acknowledge security finding.",
    });
  }
});

// PATCH /api/security/findings/:id/resolve
router.patch("/findings/:id/resolve", async (req, res) => {
  const paramsValidation = findingParamsSchema.safeParse(req.params);
  const bodyValidation = resolveBodySchema.safeParse(req.body);

  if (!paramsValidation.success) {
    return res.status(400).json({
      message: "Invalid security finding ID.",
      errors: paramsValidation.error.flatten(),
    });
  }

  if (!bodyValidation.success) {
    return res.status(400).json({
      message: "A valid resolution note is required.",
      errors: bodyValidation.error.flatten(),
    });
  }

  try {
    const findingId = paramsValidation.data.id;
    const { resolutionNote } = bodyValidation.data;

    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.securityFinding.findUnique({
        where: { id: findingId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existing) {
        return { type: "NOT_FOUND" as const };
      }

      if (
        existing.status !== "OPEN" &&
        existing.status !== "ACKNOWLEDGED"
      ) {
        return {
          type: "INVALID_STATUS" as const,
          status: existing.status,
        };
      }

      const now = new Date();

      const update = await transaction.securityFinding.updateMany({
        where: {
          id: findingId,
          status: existing.status,
        },
        data: {
          status: "RESOLVED",
          resolvedAt: now,
          resolutionNote,
        },
      });

      if (update.count !== 1) {
        return { type: "CONFLICT" as const };
      }

      await transaction.securityFindingEvent.create({
        data: {
          findingId,
          eventType: "RESOLVED",
          fromStatus: existing.status,
          toStatus: "RESOLVED",
          note: resolutionNote,
          actorType: "USER",
        },
      });

      const finding = await transaction.securityFinding.findUnique({
        where: { id: findingId },
      });

      return {
        type: "SUCCESS" as const,
        finding,
      };
    });

    if (result.type === "NOT_FOUND") {
      return res.status(404).json({
        message: "Security finding not found.",
      });
    }

    if (result.type === "INVALID_STATUS") {
      return res.status(409).json({
        message: `Cannot resolve a finding with status ${result.status}.`,
      });
    }

    if (result.type === "CONFLICT") {
      return res.status(409).json({
        message: "The finding was modified by another request. Refresh and try again.",
      });
    }

    return res.status(200).json({
      message: "Security finding resolved successfully.",
      finding: result.finding,
    });
  } catch (error) {
    console.error("Failed to resolve security finding:", error);

    return res.status(500).json({
      message: "Unable to resolve security finding.",
    });
  }
});

// GET /api/security/findings/:id/history
router.get("/findings/:id/history", async (req, res) => {
  const validation = findingParamsSchema.safeParse(req.params);

  if (!validation.success) {
    return res.status(400).json({
      message: "Invalid security finding ID.",
      errors: validation.error.flatten(),
    });
  }

  try {
    const findingId = validation.data.id;

    const finding = await prisma.securityFinding.findUnique({
      where: { id: findingId },
      select: {
        id: true,
        title: true,
      },
    });

    if (!finding) {
      return res.status(404).json({
        message: "Security finding not found.",
      });
    }

    const events = await prisma.securityFindingEvent.findMany({
      where: { findingId },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      finding,
      history: events,
    });
  } catch (error) {
    console.error("Failed to retrieve finding history:", error);

    return res.status(500).json({
      message: "Unable to retrieve finding history.",
    });
  }
});

// POST /api/security/scan/:cloudAccountId
router.post("/scan/:cloudAccountId", async (req, res) => {
  const validation = scanParamsSchema.safeParse(req.params);

  if (!validation.success) {
    return res.status(400).json({
      message: "Invalid cloud account ID.",
      errors: validation.error.flatten(),
    });
  }

  try {
    const result = await scanCloudAccount(
      validation.data.cloudAccountId
    );

    return res.status(200).json({
      message: "Security scan completed successfully.",
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Security scan failed.";

    if (message === "Cloud account not found") {
      return res.status(404).json({ message });
    }

    if (message === "Cloud account is inactive") {
      return res.status(409).json({ message });
    }

    console.error("Security scan failed:", error);

    return res.status(500).json({
      message: "An internal error occurred during the security scan.",
    });
  }
});

export default router;
