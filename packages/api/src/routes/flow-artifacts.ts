import { Router, Request, Response } from "express";
import { sessionStore } from "../lib/session-store";
import { requireAuth } from "../middleware/auth";
import { checkSessionOwnership } from "../middleware/rate-limit";

const router = Router();

router.use(requireAuth);

// List artifacts for a session
router.get("/:sessionId/artifacts", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = await sessionStore.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const artifacts = await sessionStore.getArtifacts(sessionId);
  res.json({ artifacts });
});

// Create an artifact
router.post("/:sessionId/artifacts", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { type, title, content, metadata, status } = req.body;

  if (!type || !title || content === undefined) {
    res.status(400).json({ error: "Missing type, title, or content" });
    return;
  }

  const session = await sessionStore.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const artifact = await sessionStore.createArtifact(sessionId, {
    type,
    title,
    content,
    metadata,
    status,
  });

  res.json({ artifact });
});

// Update an artifact
router.patch("/:sessionId/artifacts/:artifactId", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId, artifactId } = req.params;
  const { title, content, status, metadata } = req.body;

  const updated = await sessionStore.updateArtifact(sessionId, artifactId, {
    title,
    content,
    status,
    metadata,
  });

  if (!updated) {
    res.status(404).json({ error: "Artifact not found" });
    return;
  }

  res.json({ artifact: updated });
});

// Delete an artifact
router.delete("/:sessionId/artifacts/:artifactId", checkSessionOwnership, async (req: Request, res: Response) => {
  const { sessionId, artifactId } = req.params;

  const deleted = await sessionStore.deleteArtifact(sessionId, artifactId);
  if (!deleted) {
    res.status(404).json({ error: "Artifact not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
