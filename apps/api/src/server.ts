import { prisma } from "./db.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cloudAccountsRouter from "./routes/cloudAccounts.js";
dotenv.config({ path: "../../.env" });

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/cloud-accounts", cloudAccountsRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "cloud-security-intelligence-api",
    timestamp: new Date().toISOString()
  });
});
app.get("/health/database", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "healthy",
      database: "connected",
      provider: "PostgreSQL"
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "unhealthy",
      database: "disconnected"
    });
  }
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});