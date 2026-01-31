import { BaseAgent, AgentInput } from "./base-agent";
import Anthropic from "@anthropic-ai/sdk";

export interface DiscoveryOutput {
  problemValidation: {
    isValid: boolean;
    confidence: "high" | "medium" | "low";
    reasoning: string;
  };
  customerInsights: {
    painPoints: string[];
    desiredOutcomes: string[];
    quotes: string[];
  };
  marketSignals: {
    demand: "strong" | "moderate" | "weak";
    urgency: "high" | "medium" | "low";
    evidence: string[];
  };
  recommendations: string[];
  risks: string[];
}

export class DiscoveryAgent extends BaseAgent {
  type = "discovery" as const;

  systemPrompt = `You are a Discovery Agent specialized in validating product ideas against customer feedback and market signals.

Your job is to:
1. Analyze the product idea against provided customer feedback
2. Identify if there's genuine customer pain that this idea addresses
3. Extract specific quotes and evidence from customer feedback
4. Assess the strength of demand and urgency
5. Provide honest recommendations, including if the idea should NOT be pursued

Be rigorous and evidence-based. Don't validate ideas just to be nice - your job is to prevent building the wrong thing.

Output your analysis in the following format:

## Problem Validation
**Valid**: [Yes/No]
**Confidence**: [High/Medium/Low]
**Reasoning**: [Your analysis]

## Customer Insights
### Pain Points
- [Pain point 1]
- [Pain point 2]

### Desired Outcomes
- [What customers want]

### Key Quotes
> "[Direct quote from feedback]"

## Market Signals
**Demand**: [Strong/Moderate/Weak]
**Urgency**: [High/Medium/Low]
**Evidence**:
- [Evidence 1]
- [Evidence 2]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]

## Risks
- [Risk 1]
- [Risk 2]`;

  buildMessages(input: AgentInput): Anthropic.MessageParam[] {
    const feedbackList = input.context.customerFeedback
      .map((f, i) => `${i + 1}. "${f}"`)
      .join("\n");

    return [
      {
        role: "user",
        content: `## Product Idea
${input.idea}

## Customer Feedback
${feedbackList}

Please analyze this idea against the customer feedback and provide your discovery analysis.`,
      },
    ];
  }

  parseOutput(rawOutput: string): DiscoveryOutput {
    // For MVP, return structured data extracted from the markdown output
    // In production, we'd use structured output or parse more carefully
    return {
      problemValidation: {
        isValid: rawOutput.toLowerCase().includes("**valid**: yes"),
        confidence: rawOutput.includes("**Confidence**: High") ? "high" :
                   rawOutput.includes("**Confidence**: Medium") ? "medium" : "low",
        reasoning: rawOutput,
      },
      customerInsights: {
        painPoints: [],
        desiredOutcomes: [],
        quotes: [],
      },
      marketSignals: {
        demand: "moderate",
        urgency: "medium",
        evidence: [],
      },
      recommendations: [],
      risks: [],
    };
  }
}
