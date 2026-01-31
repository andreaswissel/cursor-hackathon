import { v4 as uuid } from "uuid";
import { sessionStore, SessionContext } from "../lib/session-store";
import { DiscoveryAgent } from "./discovery-agent";
import { StrategyAgent } from "./strategy-agent";
import { SpecAgent } from "./spec-agent";
import { GTMAgent } from "./gtm-agent";

export interface OrchestratorInput {
  sessionId: string;
  idea: string;
  context: SessionContext;
}

export class OrchestratorAgent {
  private discoveryAgent = new DiscoveryAgent();
  private strategyAgent = new StrategyAgent();
  private specAgent = new SpecAgent();
  private gtmAgent = new GTMAgent();

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
    previousOutputs.spec = specResult.output;

    // Save the spec as a session output
    const specMarkdown = (specResult.output as { markdown: string }).markdown;
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

    // TODO: Create Google Slides from GTM output
    await sessionStore.appendLog(
      sessionId,
      "orchestrator",
      "\n✅ All agents completed successfully!\n"
    );
    await sessionStore.setAgentStatus(sessionId, "orchestrator", "completed");
    await sessionStore.setSessionStatus(sessionId, "completed");
  }
}
