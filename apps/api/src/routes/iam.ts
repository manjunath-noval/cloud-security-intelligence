
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { discoverCloudIam } from "../discovery/iam-discovery.service.js";
import { scanCloudAccountIam } from "../security/iam-security.service.js";
import { getPermissionIntelligence } from "../security/permission-intelligence.service.js";

const router = Router();

const accountIdSchema = z.string().uuid();

const accountQuerySchema = z.object({
  cloudAccountId: accountIdSchema
});

// POST /api/iam/discover/:cloudAccountId
router.post("/discover/:cloudAccountId", async (req, res) => {
  const validation = accountIdSchema.safeParse(
    req.params.cloudAccountId
  );

  if (!validation.success) {
    return res.status(400).json({
      error: "Invalid cloud account ID."
    });
  }

  try {
    const discovery = await discoverCloudIam(validation.data);

    return res.status(200).json({
      message: "IAM discovery completed successfully.",
      discovery
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "IAM discovery failed.";

    if (message === "Cloud account not found.") {
      return res.status(404).json({ error: message });
    }

    if (
      message === "Cloud account is inactive." ||
      message.startsWith("IAM discovery is not yet implemented")
    ) {
      return res.status(409).json({ error: message });
    }

    console.error("IAM discovery failed:", error);

    return res.status(500).json({
      error: "Unable to complete IAM discovery."
    });
  }
});
router.post("/scan/:cloudAccountId", async (req, res) => {
  try {
    const { cloudAccountId } = req.params;

    const result = await scanCloudAccountIam(cloudAccountId);

    res.status(200).json({
      message: "IAM security scan completed successfully.",
      scan: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to scan IAM security.";

    const status =
      message === "Cloud account not found"
        ? 404
        : message === "Cloud account is inactive"
          ? 409
          : 500;

    res.status(status).json({ error: message });
  }
});

// GET /api/iam/identities?cloudAccountId=...
router.get("/identities", async (req, res) => {
  const validation = accountQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({
      error: "A valid cloudAccountId is required."
    });
  }

  try {
    const identities = await prisma.cloudIdentity.findMany({
      where: {
        cloudAccountId: validation.data.cloudAccountId
      },
      include: {
        roleAssignments: {
          include: {
            cloudRoleDefinition: true
          }
        }
      },
      orderBy: {
        displayName: "asc"
      }
    });

    return res.status(200).json({
      identities,
      total: identities.length
    });
  } catch (error) {
    console.error("Failed to retrieve IAM identities:", error);

    return res.status(500).json({
      error: "Unable to retrieve IAM identities."
    });
  }
});

// GET /api/iam/permission-analysis?cloudAccountId=...
router.get("/permission-analysis", async (req, res) => {
  const validation = accountQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({
      error: "A valid cloudAccountId is required.",
    });
  }

  try {
    const analysis = await getPermissionIntelligence(
      validation.data.cloudAccountId
    );

    return res.status(200).json({
      message: "Permission intelligence analysis completed successfully.",
      analysis,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to analyze IAM permissions.";

    if (message === "Cloud account not found") {
      return res.status(404).json({ error: message });
    }

    if (message === "Cloud account is inactive") {
      return res.status(409).json({ error: message });
    }

    console.error("Permission intelligence analysis failed:", error);

    return res.status(500).json({
      error: "Unable to analyze IAM permissions.",
    });
  }
});

// GET /api/iam/roles?cloudAccountId=...
router.get("/roles", async (req, res) => {
  const validation = accountQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({
      error: "A valid cloudAccountId is required."
    });
  }

  try {
    const roles = await prisma.cloudRoleDefinition.findMany({
      where: {
        cloudAccountId: validation.data.cloudAccountId
      },
      include: {
        _count: {
          select: {
            roleAssignments: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return res.status(200).json({
      roles,
      total: roles.length
    });
  } catch (error) {
    console.error("Failed to retrieve IAM roles:", error);

    return res.status(500).json({
      error: "Unable to retrieve IAM roles."
    });
  }
});

// GET /api/iam/assignments?cloudAccountId=...
router.get("/assignments", async (req, res) => {
  const validation = accountQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({
      error: "A valid cloudAccountId is required."
    });
  }

  try {
    const assignments = await prisma.cloudRoleAssignment.findMany({
      where: {
        cloudAccountId: validation.data.cloudAccountId
      },
      include: {
        cloudIdentity: true,
        cloudRoleDefinition: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      assignments,
      total: assignments.length
    });
  } catch (error) {
    console.error("Failed to retrieve IAM assignments:", error);

    return res.status(500).json({
      error: "Unable to retrieve IAM assignments."
    });
  }
});

export default router;
