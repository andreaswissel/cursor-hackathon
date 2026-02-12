import { Router } from "express";
import sessionsRouter from "./sessions";
import authRouter from "./auth";
import settingsRouter from "./settings";
import integrationsRouter from "./integrations";
import discoveryRouter from "./discovery";
import projectsRouter from "./projects";
import adminRouter from "./admin";
import teamsRouter, { inviteRouter } from "./teams";
import knowledgeRouter from "./knowledge";
import flowArtifactsRouter from "./flow-artifacts";
import roadmapRouter from "./roadmap";
import waitlistRouter from "./waitlist";

const router = Router();

router.use("/waitlist", waitlistRouter);
router.use("/auth", authRouter);
router.use("/sessions", sessionsRouter);
router.use("/sessions", flowArtifactsRouter);
router.use("/projects", projectsRouter);
router.use("/teams", teamsRouter);
router.use("/invites", inviteRouter);
router.use("/settings", settingsRouter);
router.use("/integrations", integrationsRouter);
router.use("/discovery", discoveryRouter);
router.use("/admin", adminRouter);
router.use(knowledgeRouter);
router.use("/roadmap", roadmapRouter);

// Health check
router.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
