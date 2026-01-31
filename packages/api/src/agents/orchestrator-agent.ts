import { v4 as uuid } from "uuid";
import { eq, and } from "drizzle-orm";
import { sessionStore, SessionContext } from "../lib/session-store";
import { DiscoveryAgent } from "./discovery-agent";
import { StrategyAgent } from "./strategy-agent";
import { SpecAgent } from "./spec-agent";
import { GTMAgent } from "./gtm-agent";
import { ProductMarketingAgent } from "./product-marketing-agent";
import { generateProductUpdateSlides } from "../lib/slides-generator";
import { db } from "../db";
import { integrations } from "../db/schema";
import { googleAdapter } from "../integrations/google";

export interface OrchestratorInput {
  sessionId: string;
  userId?: string;
  idea: string;
  context: SessionContext;
}

export class OrchestratorAgent {
  private discoveryAgent = new DiscoveryAgent();
  private strategyAgent = new StrategyAgent();
  private specAgent = new SpecAgent();
  private gtmAgent = new GTMAgent();
  private productMarketingAgent = new ProductMarketingAgent();

  async run(input: OrchestratorInput): Promise<void> {
    const { sessionId, idea, context } = input;

    // Initialize orchestrator in session store
    await sessionStore.initAgent(sessionId, "orchestrator", uuid());
    await sessionStore.setAgentStatus(sessionId, "orchestrator", "running");

    await sessionStore.setSessionStatus(sessionId, "running");
    await sessionStore.appendLog(sessionId, "orchestrator", "🚀 Starting Product OS workflow...\n");
    await sessionStore.appendLog(sessionId, "orchestrator", `📝 Idea: ${idea}\n\n`);

    const previousOutputs: Record<string, unknown> = {};

    // Phase 1: Discovery
    await sessionStore.appendLog(sessionId, "orchestrator", "Phase 1: Running Discovery Agent...\n");
    const discoveryResult = await this.discoveryAgent.run({
      sessionId,
      idea,
      context,
    });

    if (!discoveryResult.success) {
      await sessionStore.setAgentStatus(sessionId, "orchestrator", "failed");
      await sessionStore.setSessionStatus(sessionId, "failed");
      return;
    }
    // Extract the raw output from discovery (stored in problemValidation.reasoning)
    const discoveryOutput = discoveryResult.output as { problemValidation?: { reasoning?: string } };
    previousOutputs.discovery = discoveryOutput?.problemValidation?.reasoning ?? "";

    // Phase 2: Strategy
    await sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 2: Running Strategy Agent...\n");
    const strategyResult = await this.strategyAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
    });

    if (!strategyResult.success) {
      await sessionStore.setAgentStatus(sessionId, "orchestrator", "failed");
      await sessionStore.setSessionStatus(sessionId, "failed");
      return;
    }
    // Extract the raw output from strategy (stored in reasoning)
    const strategyOutput = strategyResult.output as { reasoning?: string };
    previousOutputs.strategy = strategyOutput?.reasoning ?? "";

    // Check if strategy recommends proceeding
    if ((strategyResult.output as { recommendation?: string })?.recommendation === "reject") {
      await sessionStore.appendLog(
        sessionId,
        "orchestrator",
        "\n⚠️ Strategy Agent recommends REJECTING this idea. Stopping workflow.\n"
      );
      await sessionStore.setAgentStatus(sessionId, "orchestrator", "completed");
      await sessionStore.setSessionStatus(sessionId, "completed");
      return;
    }

    // Phase 3: Spec Writing
    await sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 3: Running Spec Agent...\n");
    const specResult = await this.specAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
    });

    if (!specResult.success) {
      await sessionStore.setAgentStatus(sessionId, "orchestrator", "failed");
      await sessionStore.setSessionStatus(sessionId, "failed");
      return;
    }

    // Save the spec as a session output and store markdown string for slides
    const specMarkdown = (specResult.output as { markdown: string }).markdown;
    previousOutputs.spec = specMarkdown;
    await sessionStore.setSessionOutput(sessionId, "spec", specMarkdown);

    // Phase 4: GTM
    await sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 4: Running GTM Agent...\n");
    const gtmResult = await this.gtmAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
    });

    if (!gtmResult.success) {
      await sessionStore.setAgentStatus(sessionId, "orchestrator", "failed");
      await sessionStore.setSessionStatus(sessionId, "failed");
      return;
    }

    // Extract GTM output for slides - convert slides structure to readable text
    const gtmOutput = gtmResult.output as { title?: string; slides?: Array<{ title: string; bullets: string[] }> };
    if (gtmOutput?.slides) {
      previousOutputs.gtm = gtmOutput.slides
        .map((slide) => `## ${slide.title}\n${slide.bullets.map((b) => `- ${b}`).join("\n")}`)
        .join("\n\n");
    } else {
      previousOutputs.gtm = "";
    }

    // Phase 5: Product Marketing (Internal Update)
    await sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 5: Running Product Marketing Agent...\n");
    const productMarketingResult = await this.productMarketingAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
    });

    if (!productMarketingResult.success) {
      await sessionStore.setAgentStatus(sessionId, "orchestrator", "failed");
      await sessionStore.setSessionStatus(sessionId, "failed");
      return;
    }

    // Format and save the product update for Teams/Slack
    const productUpdateContent = productMarketingResult.output;
    const productUpdateMarkdown = this.productMarketingAgent.formatForTeams(productUpdateContent);
    await sessionStore.setSessionOutput(sessionId, "productUpdate", productUpdateMarkdown);

    // Phase 6: Generate Product Update Slides
    if (input.userId) {
      await sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 6: Generating Product Update Slides...\n");

      try {
        const slidesUrl = await this.generateSlides(
          input.userId,
          idea,
          previousOutputs as Record<string, string>
        );

        if (slidesUrl) {
          await sessionStore.setSessionOutput(sessionId, "slidesUrl", slidesUrl);
          await sessionStore.appendLog(
            sessionId,
            "orchestrator",
            `📊 Slides created: ${slidesUrl}\n`
          );
        }
      } catch (err) {
        console.error("Failed to generate slides:", err);
        await sessionStore.appendLog(
          sessionId,
          "orchestrator",
          `⚠️ Could not generate slides: ${(err as Error).message}\n`
        );
      }
    }

    await sessionStore.appendLog(
      sessionId,
      "orchestrator",
      "\n✅ All agents completed successfully!\n"
    );
    await sessionStore.setAgentStatus(sessionId, "orchestrator", "completed");
    await sessionStore.setSessionStatus(sessionId, "completed");
  }

  private async generateSlides(
    userId: string,
    idea: string,
    outputs: Record<string, string>
  ): Promise<string | null> {
    // Get user's Google integration
    const [googleIntegration] = await db
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.userId, userId),
        eq(integrations.provider, "google")
      ));

    if (!googleIntegration) {
      console.log("No Google integration found for user");
      return null;
    }

    let accessToken = googleIntegration.accessToken;

    // Refresh token if expired
    if (googleIntegration.tokenExpiresAt && new Date(googleIntegration.tokenExpiresAt) < new Date()) {
      if (googleIntegration.refreshToken) {
        const newTokens = await googleAdapter.refreshTokens(googleIntegration.refreshToken);
        accessToken = newTokens.accessToken;

        await db
          .update(integrations)
          .set({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            tokenExpiresAt: newTokens.expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, googleIntegration.id));
      } else {
        console.log("Google token expired and no refresh token");
        return null;
      }
    }

    // Generate slides
    const slidesUrl = await generateProductUpdateSlides(accessToken, {
      title: idea,
      idea,
      discovery: outputs.discovery,
      strategy: outputs.strategy,
      spec: outputs.spec,
      gtm: outputs.gtm,
    });

    return slidesUrl;
  }
}
