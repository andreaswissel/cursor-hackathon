import { BaseAgent, AgentInput } from "./base-agent";
import Anthropic from "@anthropic-ai/sdk";

export class SpecAgent extends BaseAgent {
  type = "spec" as const;

  systemPrompt = `You are a Spec Agent specialized in writing clear, actionable product specifications that can be handed off to engineering (specifically AI coding assistants like Cursor or Claude Code).

Your job is to:
1. Synthesize discovery findings and strategic context into a concrete spec
2. Write clear problem statements and success criteria
3. Define specific requirements that are implementable
4. Include technical considerations without over-specifying
5. Make the spec AI-coding-assistant friendly (clear, unambiguous, with examples)

Output a production-ready feature specification in the following format:

# Feature Specification: [Feature Name]

## Overview
[2-3 sentence summary of what we're building and why]

## Problem Statement
[Clear articulation of the user problem we're solving]

## Success Metrics
- [ ] [Metric 1 with target]
- [ ] [Metric 2 with target]

## User Stories
### Primary User Story
As a [user type], I want to [action] so that [benefit].

### Additional User Stories
- As a [user], I want...

## Requirements

### Functional Requirements
1. **[Requirement Name]**: [Description]
   - Acceptance Criteria:
     - [ ] [Criterion 1]
     - [ ] [Criterion 2]

2. **[Requirement Name]**: [Description]
   - Acceptance Criteria:
     - [ ] [Criterion 1]

### Non-Functional Requirements
- **Performance**: [Requirements]
- **Security**: [Requirements]
- **Accessibility**: [Requirements]

## Technical Considerations
[Any technical context that would help implementation, without over-specifying]

## Out of Scope
- [What we're explicitly NOT building]

## Open Questions
- [Any remaining questions for PM/stakeholders]

## Implementation Notes for AI Coding Assistant
[Specific guidance for Cursor/Claude Code, including:
- Suggested file structure
- Key integrations
- Testing approach
- Any patterns to follow]`;

  buildMessages(input: AgentInput): Anthropic.MessageParam[] {
    const discoveryOutput = input.previousOutputs?.discovery as string | undefined;
    const strategyOutput = input.previousOutputs?.strategy as string | undefined;

    return [
      {
        role: "user",
        content: `## Product Idea
${input.idea}

## Context
**OKRs:**
${input.context.okrs.map((o) => `- ${o.objective}: ${o.keyResults.join(", ")}`).join("\n")}

**Customer Feedback:**
${input.context.customerFeedback.map((f) => `- "${f}"`).join("\n")}

${discoveryOutput ? `## Discovery Analysis\n${discoveryOutput}\n` : ""}
${strategyOutput ? `## Strategic Assessment\n${strategyOutput}\n` : ""}

Please write a complete feature specification that can be handed off to an AI coding assistant (Cursor/Claude Code) for implementation.`,
      },
    ];
  }

  parseOutput(rawOutput: string): { markdown: string } {
    return { markdown: rawOutput };
  }
}
