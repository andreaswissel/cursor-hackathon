import { Router } from "express";
import sessionsRouter from "./sessions";
import authRouter from "./auth";
import settingsRouter from "./settings";
import integrationsRouter from "./integrations";
import discoveryRouter from "./discovery";
import projectsRouter from "./projects";
import adminRouter from "./admin";

const router = Router();

router.use("/auth", authRouter);
router.use("/sessions", sessionsRouter);
router.use("/projects", projectsRouter);
router.use("/settings", settingsRouter);
router.use("/integrations", integrationsRouter);
router.use("/discovery", discoveryRouter);
router.use("/admin", adminRouter);

// Health check
router.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
