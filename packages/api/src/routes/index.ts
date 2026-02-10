import { Router } from "express";
import sessionsRouter from "./sessions";
import authRouter from "./auth";
import settingsRouter from "./settings";
import integrationsRouter from "./integrations";
import discoveryRouter from "./discovery";
import projectsRouter from "./projects";

const router = Router();

router.use("/auth", authRouter);
router.use("/sessions", sessionsRouter);
router.use("/projects", projectsRouter);
router.use("/settings", settingsRouter);
router.use("/integrations", integrationsRouter);
router.use("/discovery", discoveryRouter);

// Health check
router.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
