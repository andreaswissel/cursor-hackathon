import { Router } from "express";
import sessionsRouter from "./sessions";
import authRouter from "./auth";
import settingsRouter from "./settings";

const router = Router();

router.use("/auth", authRouter);
router.use("/sessions", sessionsRouter);
router.use("/settings", settingsRouter);

// Health check
router.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
