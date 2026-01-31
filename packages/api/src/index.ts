import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();
const PORT = process.env.PORT ?? 3001;

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://product-os.ai",
  "https://www.product-os.ai",
];

// Add any origin from CORS_ORIGIN env var
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(...process.env.CORS_ORIGIN.split(",").map(o => o.trim()));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow listed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow any subdomain of product-os.ai
    if (origin.endsWith(".product-os.ai")) {
      return callback(null, true);
    }

    // For hackathon demo, allow all origins
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());

app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`🚀 Product OS API running on http://localhost:${PORT}`);
});
