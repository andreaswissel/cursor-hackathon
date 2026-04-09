import { v4 as uuid } from "uuid";
import { eq, and } from "drizzle-orm";
import { sessionStore, SessionContext, PendingContinuation } from "../lib/session-store";
import { DiscoveryAgent } from "./discovery-agent";
import { StrategyAgent } from "./strategy-agent";
import { SpecAgent } from "./spec-agent";
import { GTMAgent } from "./gtm-agent";
import { ProductMarketingAgent } from "./product-marketing-agent";
import { generateProductUpdateSlides } from "../lib/slides-generator";
import { db } from "../db";
import { integrations } from "../db/schema";
import { googleAdapter } from "../integrations/google";
import { decryptSecret, encryptSecret } from "../lib/secrets";
import type { UserPreferences } from "@product-os/shared";

const STRATEGY_REJECTION_QUESTION_ID = "strategy-rejection-proceed";

export interface OrchestratorInput {
  sessionId: string;
  userId?: string;
  idea: string;
  context: SessionContext;
  preferences?: UserPreferences | null;
}

export class OrchestratorAgent {
  private discoveryAgent = new DiscoveryAgent();
  private strategyAgent = new StrategyAgent();
  private specAgent = new SpecAgent();
  private gtmAgent = new GTMAgent();
  private productMarketingAgent = new ProductMarketingAgent();

  async run(input: OrchestratorInput): Promise<void> {
    const { sessionId, idea, context, preferences } = input;

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
      preferences: preferences ?? undefined,
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
      preferences: preferences ?? undefined,
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
        "\n⚠️ Strategy Agent recommends REJECTING this idea.\n"
      );

      // Save continuation state and ask user if they want to proceed anyway
      sessionStore.setPendingContinuation(sessionId, {
        phase: "strategy_rejected",
        previousOutputs,
      });

      sessionStore.setAgentQuestion(
        sessionId,
        "orchestrator",
        STRATEGY_REJECTION_QUESTION_ID,
        "The Strategy Agent recommends rejecting this idea due to low alignment with OKRs or missing customer validation. Would you like to proceed to feature specification anyway?"
      );

      await sessionStore.setSessionStatus(sessionId, "waiting_input");
      return; // Pause here - will resume when user answers
    }

    // Phase 3: Spec Writing
    await sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 3: Running Spec Agent...\n");
    const specResult = await this.specAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
      preferences: preferences ?? undefined,
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

    // Generate concise coding prompt for handoff
    await sessionStore.appendLog(sessionId, "orchestrator", "\nGenerating coding handoff prompt...\n");
    try {
      const codingPrompt = await this.generateCodingPrompt(idea, specMarkdown, previousOutputs.discovery as string);
      await sessionStore.setSessionOutput(sessionId, "codingPrompt", codingPrompt);
    } catch (err) {
      console.error("Failed to generate coding prompt:", err);
    }

    // Phase 4: GTM
    await sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 4: Running GTM Agent...\n");
    const gtmResult = await this.gtmAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
      preferences: preferences ?? undefined,
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
      preferences: preferences ?? undefined,
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

  async resumeFromRejection(input: OrchestratorInput, proceed: boolean): Promise<void> {
    const { sessionId, idea, context, preferences } = input;

    // Clear the question and continuation
    sessionStore.clearAgentQuestion(sessionId, "orchestrator");
    const continuation = sessionStore.getPendingContinuation(sessionId);
    sessionStore.clearPendingContinuation(sessionId);

    if (!proceed) {
      await sessionStore.appendLog(
        sessionId,
        "orchestrator",
        "\n❌ User chose not to proceed. Workflow stopped.\n"
      );
      await sessionStore.setAgentStatus(sessionId, "orchestrator", "completed");
      await sessionStore.setSessionStatus(sessionId, "completed");
      return;
    }

    await sessionStore.appendLog(
      sessionId,
      "orchestrator",
      "\n✅ User chose to proceed despite rejection. Continuing workflow...\n"
    );
    await sessionStore.setAgentStatus(sessionId, "orchestrator", "running");
    await sessionStore.setSessionStatus(sessionId, "running");

    const previousOutputs = (continuation?.previousOutputs || {}) as Record<string, unknown>;

    // Continue from Phase 3: Spec Writing
    await sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 3: Running Spec Agent...\n");
    const specResult = await this.specAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
      preferences: preferences ?? undefined,
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

    // Generate concise coding prompt for handoff
    await sessionStore.appendLog(sessionId, "orchestrator", "\nGenerating coding handoff prompt...\n");
    try {
      const codingPrompt = await this.generateCodingPrompt(idea, specMarkdown, previousOutputs.discovery as string);
      await sessionStore.setSessionOutput(sessionId, "codingPrompt", codingPrompt);
    } catch (err) {
      console.error("Failed to generate coding prompt:", err);
    }

    // Phase 4: GTM
    await sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 4: Running GTM Agent...\n");
    const gtmResult = await this.gtmAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
      preferences: preferences ?? undefined,
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
      preferences: preferences ?? undefined,
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

  private async generateCodingPrompt(idea: string, spec: string, discoveryOutput: string): Promise<string> {
    const { completion } = await import("../lib/claude");

    const systemPrompt = `You generate concise coding prompts for AI coding assistants (Cursor, Claude Code).
Given a product spec and discovery research, produce a SHORT prompt (under 300 words) in this exact format:

Let's build [one-sentence description of what to build].

Customer signals suggest that:
- [2-5 concise bullet points summarizing key customer pain points and desired outcomes from discovery]

[2-3 sentences of key technical requirements from the spec - just the essentials]

After you are finished, check that everything is working with agent-browser based on:
- [2-5 success criteria extracted from the spec's acceptance criteria / success metrics]

Do you have any questions you need to ask me?

RULES:
- Keep it SHORT and actionable - this is a prompt for a coding agent, not a spec
- Summarize customer signals from discovery into plain-language bullet points
- Extract only the most important success criteria (testable, observable)
- Do NOT include user stories, non-functional requirements, or out-of-scope sections
- If no relevant customer signals exist, skip that section entirely
- Write in second person ("you should", "build a...")`;

    const result = await completion(systemPrompt, [{
      role: "user",
      content: `## Product Idea\n${idea}\n\n## Feature Spec\n${spec}\n\n## Discovery Research\n${discoveryOutput || "No discovery data available."}`
    }]);

    return result;
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
      throw new Error("Connect Google in Settings to generate slides");
    }

    let accessToken = decryptSecret(googleIntegration.accessToken);
    let refreshToken = decryptSecret(googleIntegration.refreshToken);
    if (!accessToken) {
      throw new Error("Google token missing - reconnect Google in Settings");
    }

    // Refresh token if expired
    if (googleIntegration.tokenExpiresAt && new Date(googleIntegration.tokenExpiresAt) < new Date()) {
      if (refreshToken) {
        const newTokens = await googleAdapter.refreshTokens(refreshToken);
        accessToken = newTokens.accessToken;
        refreshToken = newTokens.refreshToken ?? refreshToken;

        await db
          .update(integrations)
          .set({
            accessToken: encryptSecret(accessToken)!,
            refreshToken: encryptSecret(refreshToken),
            tokenExpiresAt: newTokens.expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, googleIntegration.id));
      } else {
        console.log("Google token expired and no refresh token");
        throw new Error("Google token expired - reconnect Google in Settings");
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
