import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All settings routes require auth
router.use(requireAuth);

// Get user settings
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [user] = await db
    .select({
      hasApiKey: users.anthropicApiKey,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    hasApiKey: !!user.hasApiKey,
    // Only show masked version if key exists
    apiKeyPreview: user.hasApiKey
      ? `sk-ant-...${user.hasApiKey.slice(-4)}`
      : null,
  });
});

// Update API key
router.put("/api-key", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { apiKey } = req.body as { apiKey?: string };

  // Validate API key format (basic check)
  if (apiKey && !apiKey.startsWith("sk-ant-")) {
    res.status(400).json({ error: "Invalid API key format. Should start with sk-ant-" });
    return;
  }

  await db
    .update(users)
    .set({ anthropicApiKey: apiKey || null })
    .where(eq(users.id, userId));

  res.json({
    success: true,
    hasApiKey: !!apiKey,
    apiKeyPreview: apiKey ? `sk-ant-...${apiKey.slice(-4)}` : null,
  });
});

// Delete API key
router.delete("/api-key", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  await db
    .update(users)
    .set({ anthropicApiKey: null })
    .where(eq(users.id, userId));

  res.json({ success: true, hasApiKey: false });
});

export default router;
