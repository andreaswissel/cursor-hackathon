import { Router } from "express";
import sessionsRouter from "./sessions";
import authRouter from "./auth";
import settingsRouter from "./settings";
import integrationsRouter from "./integrations";

const router = Router();

router.use("/auth", authRouter);
router.use("/sessions", sessionsRouter);
router.use("/settings", settingsRouter);
router.use("/integrations", integrationsRouter);

// Health check
router.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
