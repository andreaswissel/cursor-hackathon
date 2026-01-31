import { Router } from "express";
import sessionsRouter from "./sessions";
import authRouter from "./auth";

const router = Router();

router.use("/auth", authRouter);
router.use("/sessions", sessionsRouter);

// Health check
router.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
