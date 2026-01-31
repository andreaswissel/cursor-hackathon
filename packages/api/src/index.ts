import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();
const PORT = process.env.PORT ?? 3001;

// CORS configuration - production only
app.use(cors({
  origin: ["https://product-os.ai", "https://www.product-os.ai"],
  credentials: true,
}));

app.use(express.json());

app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`🚀 Product OS API running on http://localhost:${PORT}`);
});
