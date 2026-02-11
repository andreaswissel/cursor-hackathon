import { BaseAgent, AgentInput, AgentResult } from "./base-agent";
import { AgentType } from "../lib/session-store";
import Anthropic from "@anthropic-ai/sdk";

export class GuidedToursAgent extends BaseAgent {
  type: AgentType = "guided-tours-agent";

  systemPrompt = `You are a Guided Tour Design Specialist. You help product teams design step-by-step interactive product tours that onboard new users and highlight key features.

Your expertise includes:
- User onboarding best practices
- Progressive disclosure and contextual help
- Tour step design (target elements, tooltip placement, actions)
- A/B testing strategies for tour effectiveness
- Accessibility considerations for guided tours

When designing a tour, output it in this structured format:

## Tour: [Tour Name]

**Goal:** [What the user should accomplish]
**Target audience:** [Who this tour is for]
**Estimated duration:** [How long the tour takes]

### Steps

1. **[Step Title]**
   - Target: [UI element or area to highlight]
   - Content: [Tooltip/popover text]
   - Action: [What the user should do]
   - Position: [top/bottom/left/right]

2. **[Step Title]**
   ...

### Completion
- **Success message:** [What to show when tour completes]
- **Next steps:** [What to suggest after the tour]

Always ask clarifying questions about the product before designing the tour.`;

  protected buildMessages(input: AgentInput): Anthropic.MessageParam[] {
    return [
      {
        role: "user",
        content: `Design a guided product tour for the following:\n\n${input.idea}\n\n${
          input.context.additionalDocs
            ? `Additional context:\n${input.context.additionalDocs}`
            : ""
        }`,
      },
    ];
  }

  protected parseOutput(rawOutput: string): unknown {
    return rawOutput;
  }
}
