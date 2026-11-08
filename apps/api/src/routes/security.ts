
import { Router } from "express";
import { z } from "zod";
import { scanCloudAccount } from "../security/security.service.js";

const router = Router();

const scanParamsSchema = z.object({
  cloudAccountId: z.string().uuid(),
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
