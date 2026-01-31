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

    sessionStore.setSessionStatus(sessionId, "running");
    sessionStore.appendLog(sessionId, "orchestrator", "🚀 Starting Product OS workflow...\n");
    sessionStore.appendLog(sessionId, "orchestrator", `📝 Idea: ${idea}\n\n`);

    const previousOutputs: Record<string, unknown> = {};

    // Phase 1: Discovery
    sessionStore.appendLog(sessionId, "orchestrator", "Phase 1: Running Discovery Agent...\n");
    const discoveryResult = await this.discoveryAgent.run({
      sessionId,
      idea,
      context,
    });

    if (!discoveryResult.success) {
      sessionStore.setSessionStatus(sessionId, "failed");
      return;
    }
    previousOutputs.discovery = (discoveryResult.output as { reasoning?: string })?.reasoning ?? "";

    // Phase 2: Strategy
    sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 2: Running Strategy Agent...\n");
    const strategyResult = await this.strategyAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
    });

    if (!strategyResult.success) {
      sessionStore.setSessionStatus(sessionId, "failed");
      return;
    }
    previousOutputs.strategy = (strategyResult.output as { reasoning?: string })?.reasoning ?? "";

    // Check if strategy recommends proceeding
    const strategyOutput = strategyResult.output as { recommendation?: string };
    if (strategyOutput.recommendation === "reject") {
      sessionStore.appendLog(
        sessionId,
        "orchestrator",
        "\n⚠️ Strategy Agent recommends REJECTING this idea. Stopping workflow.\n"
      );
      sessionStore.setSessionStatus(sessionId, "completed");
      return;
    }

    // Phase 3: Spec Writing
    sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 3: Running Spec Agent...\n");
    const specResult = await this.specAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
    });

    if (!specResult.success) {
      sessionStore.setSessionStatus(sessionId, "failed");
      return;
    }
    previousOutputs.spec = specResult.output;

    // Save the spec as a session output
    const specMarkdown = (specResult.output as { markdown: string }).markdown;
    sessionStore.setSessionOutput(sessionId, "spec", specMarkdown);

    // Phase 4: GTM
    sessionStore.appendLog(sessionId, "orchestrator", "\nPhase 4: Running GTM Agent...\n");
    const gtmResult = await this.gtmAgent.run({
      sessionId,
      idea,
      context,
      previousOutputs,
    });

    if (!gtmResult.success) {
      sessionStore.setSessionStatus(sessionId, "failed");
      return;
    }

    // TODO: Create Google Slides from GTM output
    sessionStore.appendLog(
      sessionId,
      "orchestrator",
      "\n✅ All agents completed successfully!\n"
    );
    sessionStore.setSessionStatus(sessionId, "completed");
  }
}
