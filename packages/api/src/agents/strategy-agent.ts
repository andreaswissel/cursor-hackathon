import { BaseAgent, AgentInput } from "./base-agent";
import Anthropic from "@anthropic-ai/sdk";

export interface StrategyOutput {
  okrAlignment: {
    score: number; // 0-100
    alignedOkrs: Array<{
      objective: string;
      keyResults: string[];
      impactAssessment: string;
    }>;
  };
  priorityScore: {
    overall: number; // 0-100
    impact: number;
    effort: number;
    confidence: number;
  };
  strategicFit: {
    assessment: "strong" | "moderate" | "weak" | "misaligned";
    reasoning: string;
  };
  tradeoffs: string[];
  recommendation: "proceed" | "modify" | "defer" | "reject";
  reasoning: string;
}

export class StrategyAgent extends BaseAgent {
  type = "strategy" as const;

  systemPrompt = `You are a Strategy Agent specialized in evaluating product ideas against company OKRs and strategic priorities.

Your job is to:
1. Assess how well the product idea aligns with each OKR
2. Calculate an alignment score and priority score
3. Identify which key results this idea would impact
4. Surface tradeoffs and opportunity costs
5. Make a clear recommendation

Be strategic and honest. If an idea doesn't align with OKRs, say so clearly. Your job is to ensure resources go to the highest-impact work.

Output your analysis in the following format:

## OKR Alignment

### [Objective 1]
**Key Results Impacted**: [List them]
**Impact Assessment**: [How this idea affects these KRs]

### [Objective 2]
...

**Overall Alignment Score**: [0-100]/100

## Priority Assessment
**Impact**: [0-100]/100
**Effort**: [0-100]/100 (lower is better - less effort)
**Confidence**: [0-100]/100

**Overall Priority Score**: [0-100]/100

## Strategic Fit
**Assessment**: [Strong/Moderate/Weak/Misaligned]
**Reasoning**: [Your analysis]

## Tradeoffs
- [Tradeoff 1]
- [Tradeoff 2]

## Recommendation
**Decision**: [Proceed/Modify/Defer/Reject]
**Reasoning**: [Why]`;

  buildMessages(input: AgentInput): Anthropic.MessageParam[] {
    const okrsList = input.context.okrs
      .map((okr) => {
        const krs = okr.keyResults.map((kr) => `  - ${kr}`).join("\n");
        return `**${okr.objective}**\n${krs}`;
      })
      .join("\n\n");

    const discoveryOutput = input.previousOutputs?.discovery as string | undefined;

    return [
      {
        role: "user",
        content: `## Product Idea
${input.idea}

## Company OKRs
${okrsList}

${discoveryOutput ? `## Discovery Findings\n${discoveryOutput}\n` : ""}

Please analyze this idea against our OKRs and provide your strategic assessment.`,
      },
    ];
  }

  parseOutput(rawOutput: string): StrategyOutput {
    // Extract recommendation from output
    const hasReject = rawOutput.toLowerCase().includes("**decision**: reject");
    const hasDefer = rawOutput.toLowerCase().includes("**decision**: defer");
    const hasModify = rawOutput.toLowerCase().includes("**decision**: modify");

    return {
      okrAlignment: {
        score: 75, // Would parse from output
        alignedOkrs: [],
      },
      priorityScore: {
        overall: 70,
        impact: 80,
        effort: 60,
        confidence: 70,
      },
      strategicFit: {
        assessment: "moderate",
        reasoning: rawOutput,
      },
      tradeoffs: [],
      recommendation: hasReject ? "reject" : hasDefer ? "defer" : hasModify ? "modify" : "proceed",
      reasoning: rawOutput,
    };
  }
}
