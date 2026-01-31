import { BaseAgent, AgentInput } from "./base-agent";
import Anthropic from "@anthropic-ai/sdk";

export interface ProductUpdateContent {
  title: string;
  summary: string;
  problemStatement: string;
  solution: string;
  keyBenefits: string[];
  okrAlignment: string;
  successMetrics: string[];
  timeline: string;
  callToAction: string;
}

export class ProductMarketingAgent extends BaseAgent {
  type = "product-marketing" as const;

  systemPrompt = `You are a Product Marketing Agent specialized in creating internal product updates for company-wide communication (e.g., Microsoft Teams, Slack).

Your job is to:
1. Synthesize all the agent outputs into a clear, concise internal announcement
2. Make it easy for anyone in the company to understand what's being built and why
3. Highlight the business impact and OKR alignment
4. Keep it engaging but professional - this goes to the whole company

Output a product update in JSON format:

\`\`\`json
{
  "title": "Product Update: [Feature Name]",
  "summary": "One paragraph (2-3 sentences) TL;DR of what we're building and why",
  "problemStatement": "What customer problem are we solving? Keep it to 2-3 sentences.",
  "solution": "What are we building? High-level description in 2-3 sentences.",
  "keyBenefits": [
    "Benefit 1 for customers",
    "Benefit 2 for customers",
    "Benefit 3 for customers"
  ],
  "okrAlignment": "Which OKRs does this support and how? One paragraph.",
  "successMetrics": [
    "Metric 1 we'll track",
    "Metric 2 we'll track",
    "Metric 3 we'll track"
  ],
  "timeline": "When is this shipping? What are the key milestones?",
  "callToAction": "What should people do? (e.g., try it out, give feedback, etc.)"
}
\`\`\`

Keep it scannable - people will read this in Teams/Slack. Use clear, jargon-free language.`;

  buildMessages(input: AgentInput): Anthropic.MessageParam[] {
    const discoveryOutput = input.previousOutputs?.discovery as string | undefined;
    const strategyOutput = input.previousOutputs?.strategy as string | undefined;
    const specOutput = input.previousOutputs?.spec as string | undefined;
    const gtmOutput = input.previousOutputs?.gtm as string | undefined;

    return [
      {
        role: "user",
        content: `## Product Idea
${input.idea}

## Company OKRs
${JSON.stringify(input.context.okrs, null, 2)}

## Discovery Findings
${discoveryOutput ?? "No discovery output available"}

## Strategic Analysis
${strategyOutput ?? "No strategy output available"}

## Feature Specification
${specOutput ?? "No spec available"}

## GTM Strategy
${gtmOutput ?? "No GTM output available"}

Please create an internal product update announcement that I can post in Microsoft Teams or Slack to inform the company about this feature.`,
      },
    ];
  }

  parseOutput(rawOutput: string): ProductUpdateContent {
    // Extract JSON from the output
    const jsonMatch = rawOutput.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]) as ProductUpdateContent;
      } catch {
        // Fall through to default
      }
    }

    // Fallback: return the raw output as summary
    return {
      title: "Product Update",
      summary: rawOutput.substring(0, 500),
      problemStatement: "See full output for details",
      solution: "See full output for details",
      keyBenefits: ["See full output for details"],
      okrAlignment: "See full output for details",
      successMetrics: ["See full output for details"],
      timeline: "TBD",
      callToAction: "Stay tuned for more updates!",
    };
  }

  // Format the output as a nice markdown message for Teams/Slack
  formatForTeams(content: ProductUpdateContent): string {
    return `# ${content.title}

${content.summary}

## The Problem
${content.problemStatement}

## Our Solution
${content.solution}

## Key Benefits
${content.keyBenefits.map((b) => `- ${b}`).join("\n")}

## OKR Alignment
${content.okrAlignment}

## Success Metrics
${content.successMetrics.map((m) => `- ${m}`).join("\n")}

## Timeline
${content.timeline}

---
**${content.callToAction}**`;
  }
}
