console.log("Starting API server...");

import "dotenv/config";
console.log("Loaded dotenv");

import express from "express";
console.log("Loaded express");

import cors from "cors";
console.log("Loaded cors");

import routes from "./routes";
console.log("Loaded routes");

import { cleanupStaleRuns } from "./lib/discovery-analyzer";
console.log("Loaded discovery analyzer");

import { sandboxRegistry } from "./lib/sandbox";
console.log("Loaded sandbox registry");

const app = express();
const PORT = process.env.PORT ?? 3001;
console.log(`Using port: ${PORT}`);

// CORS configuration
const corsOptions = {
  origin: [
    "https://product-os.ai",
    "https://www.product-os.ai",
    "http://localhost:5173",
    "http://localhost:5174",
    "tauri://localhost",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Team-Id"],
};

// Handle preflight for all routes
app.options("*", cors(corsOptions));

// Apply CORS to all requests
app.use(cors(corsOptions));

app.use(express.json());

app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`🚀 Product OS API running on http://localhost:${PORT}`);

  // Periodic cleanup of stale discovery runs (every 5 minutes)
  setInterval(() => {
    cleanupStaleRuns().catch(err => console.error("Discovery cleanup error:", err));
  }, 5 * 60 * 1000);

  // Periodic cleanup of stale E2B sandboxes (every 60 seconds, 10-min TTL)
  sandboxRegistry.startReaper();
});
