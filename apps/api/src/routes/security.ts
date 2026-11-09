
import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { scanCloudAccount } from "../security/security.service.js";
import { Prisma } from "../generated/prisma/client.js";

const router = Router();

const scanParamsSchema = z.object({
  cloudAccountId: z.string().uuid(),
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

    if (severity) {
      conditions.push({ severity });
    }

    if (status) {
      conditions.push({ status });
    }

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
