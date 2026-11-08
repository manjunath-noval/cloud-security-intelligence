
import { Router } from "express";
import { z } from "zod";
import { discoverCloudResources } from "../discovery/discovery.service.js";
import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";

const router = Router();

const providerSchema = z.enum(["AZURE", "AWS", "GCP"]);

const createResourceSchema = z.object({
  cloudAccountId: z.string().uuid(),
  providerResourceId: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(200),
  resourceType: z.string().trim().min(1).max(100),
  provider: providerSchema,
  region: z.string().trim().min(1).max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  discoverySource: z.enum(["SIMULATED", "LIVE"]).default("SIMULATED")
});

const resourceQuerySchema = z.object({
  cloudAccountId: z.string().uuid().optional(),
  provider: providerSchema.optional(),
  resourceType: z.string().trim().min(1).max(100).optional(),
  discoverySource: z.enum(["SIMULATED", "LIVE"]).optional(),
  region: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// POST /api/resources/discover/:cloudAccountId
router.post("/discover/:cloudAccountId", async (req, res) => {
  try {
    const cloudAccountIdSchema = z.string().uuid();
    const validation = cloudAccountIdSchema.safeParse(
      req.params.cloudAccountId
    );

    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid cloud account ID."
      });
    }

    const result = await discoverCloudResources(validation.data);

    return res.status(200).json({
      message: "Cloud resource discovery completed successfully.",
      discovery: result
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Cloud account not found.") {
        return res.status(404).json({ error: error.message });
      }

      if (
        error.message === "Cloud account is inactive." ||
        error.message.startsWith("Discovery is not yet implemented")
      ) {
        return res.status(409).json({ error: error.message });
      }
    }

    console.error("Cloud resource discovery failed:", error);

    return res.status(500).json({
      error: "Unable to complete cloud resource discovery."
    });
  }
});

// GET /api/resources
router.get("/", async (req, res) => {
  const validation = resourceQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({
      error: "Invalid resource filters.",
      details: validation.error.issues
    });
  }

  const {
    cloudAccountId,
    provider,
    resourceType,
    discoverySource,
    region,
    page,
    limit
  } = validation.data;

  try {
    const where = {
      ...(cloudAccountId && { cloudAccountId }),
      ...(provider && { provider }),
      ...(resourceType && { resourceType }),
      ...(discoverySource && { discoverySource }),
      ...(region && { region })
    };

    const [resources, total] = await prisma.$transaction([
      prisma.cloudResource.findMany({
        where,
        include: {
          cloudAccount: {
            select: {
              id: true,
              name: true,
              provider: true,
              environment: true
            }
          }
        },
        orderBy: {
          updatedAt: "desc"
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.cloudResource.count({ where })
    ]);

    return res.status(200).json({
      resources,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Failed to fetch resources:", error);

    return res.status(500).json({
      error: "Unable to fetch resources."
    });
  }
});

// GET /api/resources/:id
router.get("/:id", async (req, res) => {
  try {
    const resource = await prisma.cloudResource.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        cloudAccount: true
      }
    });

    if (!resource) {
      return res.status(404).json({
        error: "Cloud resource not found."
      });
    }

    return res.status(200).json({ resource });
  } catch (error) {
    console.error("Failed to fetch resource:", error);

    return res.status(500).json({
      error: "Unable to fetch resource."
    });
  }
});

// POST /api/resources
router.post("/", async (req, res) => {
  const validation = createResourceSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed.",
      details: validation.error.issues
    });
  }

  const data = validation.data;

  try {
    const account = await prisma.cloudAccount.findUnique({
      where: {
        id: data.cloudAccountId
      }
    });

    if (!account) {
      return res.status(404).json({
        error: "Cloud account not found."
      });
    }

    if (!account.isActive) {
      return res.status(409).json({
        error: "Cannot register resources for an inactive cloud account."
      });
    }

    if (account.provider !== data.provider) {
      return res.status(400).json({
        error: "Resource provider does not match the cloud account provider."
      });
    }

    const resource = await prisma.cloudResource.create({
      data: {
        cloudAccountId: data.cloudAccountId,
        providerResourceId: data.providerResourceId,
        name: data.name,
        resourceType: data.resourceType,
        provider: data.provider,
        region: data.region,
        metadata: data.metadata as Prisma.InputJsonValue,
        discoverySource: data.discoverySource
      },
      include: {
        cloudAccount: {
          select: {
            id: true,
            name: true,
            provider: true
          }
        }
      }
    });

    return res.status(201).json({
      message: "Cloud resource registered successfully.",
      resource
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        error: "This resource is already registered for this cloud account."
      });
    }

    console.error("Resource registration failed:", error);

    return res.status(500).json({
      error: "Unable to register cloud resource."
    });
  }
});

export default router;
