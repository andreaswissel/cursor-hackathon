import { BaseAgent, AgentInput } from "./base-agent";
import Anthropic from "@anthropic-ai/sdk";

export interface SlideContent {
  title: string;
  slides: Array<{
    title: string;
    bullets: string[];
    speakerNotes?: string;
  }>;
}

export class GTMAgent extends BaseAgent {
  type = "gtm" as const;

  systemPrompt = `You are a GTM (Go-To-Market) Agent specialized in creating product update communications and launch materials.

Your job is to:
1. Synthesize the feature spec into compelling product messaging
2. Create slide content for internal/external announcements
3. Focus on benefits, not features
4. Make it exciting but honest

Output slide content in JSON format:

\`\`\`json
{
  "title": "Product Update: [Feature Name]",
  "slides": [
    {
      "title": "The Problem",
      "bullets": [
        "Bullet point 1",
        "Bullet point 2"
      ],
      "speakerNotes": "Optional notes for presenter"
    },
    {
      "title": "The Solution",
      "bullets": ["..."]
    },
    {
      "title": "Key Benefits",
      "bullets": ["..."]
    },
    {
      "title": "How It Works",
      "bullets": ["..."]
    },
    {
      "title": "Success Metrics",
      "bullets": ["..."]
    },
    {
      "title": "Timeline & Next Steps",
      "bullets": ["..."]
    }
  ]
}
\`\`\`

Keep slides concise - max 4-5 bullets per slide, each bullet under 15 words.`;

  buildMessages(input: AgentInput): Anthropic.MessageParam[] {
    const specOutput = input.previousOutputs?.spec as string | undefined;

    return [
      {
        role: "user",
        content: `## Product Idea
${input.idea}

## Feature Specification
${specOutput ?? "No spec available yet"}

Please create slide content for a product update presentation announcing this feature.`,
      },
    ];
  }

  parseOutput(rawOutput: string): SlideContent {
    // Extract JSON from the output
    const jsonMatch = rawOutput.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]) as SlideContent;
      } catch {
        // Fall through to default
      }
    }

    return {
      title: "Product Update",
      slides: [
        {
          title: "Coming Soon",
          bullets: ["Slide content generation failed - see raw output"],
        },
      ],
    };
  }
}
