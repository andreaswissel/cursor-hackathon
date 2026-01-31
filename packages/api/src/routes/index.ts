import { Router } from "express";
import sessionsRouter from "./sessions";

const router = Router();

router.use("/sessions", sessionsRouter);

// Health check
router.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
