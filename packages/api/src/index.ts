console.log("Starting API server...");

import "dotenv/config";
console.log("Loaded dotenv");

import express from "express";
console.log("Loaded express");

import cors from "cors";
console.log("Loaded cors");

import routes from "./routes";
console.log("Loaded routes");

const app = express();
const PORT = process.env.PORT ?? 3001;
console.log(`Using port: ${PORT}`);

// CORS configuration
const corsOptions = {
  origin: ["https://product-os.ai", "https://www.product-os.ai"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Handle preflight for all routes
app.options("*", cors(corsOptions));

// Apply CORS to all requests
app.use(cors(corsOptions));

app.use(express.json());

app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`🚀 Product OS API running on http://localhost:${PORT}`);
});
