import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import apiRoutes from "./routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:4200" }));
app.use(express.json({ limit: "100kb" }));

// Health Check
app.get("/health", (_req, res) => res.json({ status: "ok", mode: "local-scaffold" }));

// API v1 Routes
app.use("/api/v1", apiRoutes);

// Optional static frontend delivery if compiled public folder exists
const publicPath = path.join(__dirname, "../public");
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      return next();
    }
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

// Global error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("API error", err instanceof Error ? err.message : "unknown");
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});
