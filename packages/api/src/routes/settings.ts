import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { Provider } from "../lib/llm";
import { decryptSecret, encryptSecret } from "../lib/secrets";

const router = Router();

// All settings routes require auth
router.use(requireAuth);

interface ProviderConfig {
  hasKey: boolean;
  keyPreview: string | null;
}

interface SettingsResponse {
  providers: {
    anthropic: ProviderConfig;
    openai: ProviderConfig;
    gemini: ProviderConfig;
  };
  activeProvider: Provider;
}

function maskKey(key: string | null, prefix: string): string | null {
  if (!key) return null;
  return `${prefix}...${key.slice(-4)}`;
}

// Get user settings
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [user] = await db
    .select({
      anthropicApiKey: users.anthropicApiKey,
      openaiApiKey: users.openaiApiKey,
      geminiApiKey: users.geminiApiKey,
      activeProvider: users.activeProvider,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const response: SettingsResponse = {
    providers: {
      anthropic: {
        hasKey: !!decryptSecret(user.anthropicApiKey),
        keyPreview: maskKey(decryptSecret(user.anthropicApiKey), "sk-ant-"),
      },
      openai: {
        hasKey: !!decryptSecret(user.openaiApiKey),
        keyPreview: maskKey(decryptSecret(user.openaiApiKey), "sk-"),
      },
      gemini: {
        hasKey: !!decryptSecret(user.geminiApiKey),
        keyPreview: maskKey(decryptSecret(user.geminiApiKey), "AI"),
      },
    },
    activeProvider: (user.activeProvider as Provider) || "anthropic",
  };

  res.json(response);
});

// Update API key for a specific provider
router.put("/api-key/:provider", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const provider = req.params.provider as Provider;
  const { apiKey } = req.body as { apiKey?: string };

  // Validate provider
  if (!["anthropic", "openai", "gemini"].includes(provider)) {
    res.status(400).json({ error: "Invalid provider" });
    return;
  }

  // Validate API key format
  if (apiKey) {
    const validations: Record<Provider, { prefix: string; name: string }> = {
      anthropic: { prefix: "sk-ant-", name: "Anthropic" },
      openai: { prefix: "sk-", name: "OpenAI" },
      gemini: { prefix: "AI", name: "Google" },
    };

    const validation = validations[provider];
    if (!apiKey.startsWith(validation.prefix)) {
      res.status(400).json({
        error: `Invalid ${validation.name} API key format. Should start with ${validation.prefix}`,
      });
      return;
    }
  }

  // Update the appropriate key
  const updateField = {
    anthropic: { anthropicApiKey: encryptSecret(apiKey || null) },
    openai: { openaiApiKey: encryptSecret(apiKey || null) },
    gemini: { geminiApiKey: encryptSecret(apiKey || null) },
  }[provider];

  await db.update(users).set(updateField).where(eq(users.id, userId));

  res.json({ success: true });
});

// Delete API key for a specific provider
router.delete("/api-key/:provider", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const provider = req.params.provider as Provider;

  if (!["anthropic", "openai", "gemini"].includes(provider)) {
    res.status(400).json({ error: "Invalid provider" });
    return;
  }

  const updateField = {
    anthropic: { anthropicApiKey: null },
    openai: { openaiApiKey: null },
    gemini: { geminiApiKey: null },
  }[provider];

  // Also reset activeProvider if deleting the active one
  const [user] = await db
    .select({ activeProvider: users.activeProvider })
    .from(users)
    .where(eq(users.id, userId));

  if (user?.activeProvider === provider) {
    await db
      .update(users)
      .set({ ...updateField, activeProvider: "anthropic" })
      .where(eq(users.id, userId));
  } else {
    await db.update(users).set(updateField).where(eq(users.id, userId));
  }

  res.json({ success: true });
});

// Set active provider
router.put("/active-provider", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { provider } = req.body as { provider?: Provider };

  if (!provider || !["anthropic", "openai", "gemini"].includes(provider)) {
    res.status(400).json({ error: "Invalid provider" });
    return;
  }

  // Check if user has a key for this provider
  const [user] = await db
    .select({
      anthropicApiKey: users.anthropicApiKey,
      openaiApiKey: users.openaiApiKey,
      geminiApiKey: users.geminiApiKey,
    })
    .from(users)
    .where(eq(users.id, userId));

  const hasKey = {
    anthropic: !!decryptSecret(user?.anthropicApiKey),
    openai: !!decryptSecret(user?.openaiApiKey),
    gemini: !!decryptSecret(user?.geminiApiKey),
  }[provider];

  if (!hasKey) {
    res.status(400).json({
      error: `No API key configured for ${provider}. Add a key first.`,
    });
    return;
  }

  await db.update(users).set({ activeProvider: provider }).where(eq(users.id, userId));

  res.json({ success: true, activeProvider: provider });
});

export default router;
