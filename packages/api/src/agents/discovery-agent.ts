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
1. FIRST: Assess if the provided feedback/data is actually relevant to the product idea
2. If there's NO relevant feedback data, clearly state this and skip the detailed analysis
3. Only if there IS relevant data: analyze the product idea against the feedback
4. Identify if there's genuine customer pain that this idea addresses
5. Extract specific quotes and evidence from customer feedback
6. Assess the strength of demand and urgency
7. Provide honest recommendations, including if the idea should NOT be pursued

CRITICAL: Be rigorous about relevance. If the customer feedback is about topic X (e.g., "search functionality") but the product idea is about topic Y (e.g., "feature discovery mode"), these are DIFFERENT topics. Do NOT force connections between unrelated feedback and ideas.

If the feedback doesn't match the idea, output:

## No Relevant Data
**Status**: No customer research data matches this product idea.
**Recommendation**: Proceed to specification without discovery validation, or gather relevant customer feedback first.
**Reasoning**: [Explain what the feedback was about vs what the idea is about]

Only proceed with full analysis if there IS relevant data.

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

    const internalFeedbackList = input.context.internalFeedback
      ? input.context.internalFeedback
          .map((f) => `${f.channel} - ${f.author}: "${f.message}"`)
          .join("\n")
      : "";

    const metricsList = input.context.metrics
      ? input.context.metrics
          .map((m) => `- ${m.name}: ${m.value} (${m.delta}, ${m.trend}) - ${m.description}`)
          .join("\n")
      : "";

    return [
      {
        role: "user",
        content: `## Product Idea
${input.idea}

## Customer Feedback
${feedbackList}
${internalFeedbackList ? `
## Internal Feedback (Slack/Teams)
${internalFeedbackList}` : ""}
${metricsList ? `
## Current Product Metrics
${metricsList}` : ""}

Please analyze this idea against the customer feedback, internal discussions, and metrics. Provide your discovery analysis.`,
      },
    ];
  }

  parseOutput(rawOutput: string): DiscoveryOutput {
    // Check if this is a "No Relevant Data" response
    const noRelevantData = rawOutput.toLowerCase().includes("no relevant data") ||
                          rawOutput.toLowerCase().includes("no customer research data matches");

    if (noRelevantData) {
      return {
        problemValidation: {
          isValid: false,
          confidence: "low",
          reasoning: rawOutput,
        },
        customerInsights: {
          painPoints: [],
          desiredOutcomes: [],
          quotes: [],
        },
        marketSignals: {
          demand: "weak",
          urgency: "low",
          evidence: ["No relevant customer data available for this idea"],
        },
        recommendations: ["Proceed to specification without discovery validation", "Consider gathering relevant customer feedback"],
        risks: ["Building without customer validation data"],
      };
    }

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
