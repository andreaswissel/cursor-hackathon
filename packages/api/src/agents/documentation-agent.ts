import { v4 as uuid } from "uuid";
import { streamCompletion, LLMConfig } from "../lib/claude";
import { sessionStore, AgentType, DocPieceType } from "../lib/session-store";
import Anthropic from "@anthropic-ai/sdk";

export interface DocumentationPieceOutput {
  pieceType: DocPieceType;
  title: string;
  content: string;
  startTimestamp?: number;
  endTimestamp?: number;
}

export interface DocumentationAgentInput {
  sessionId: string;
  transcription: string;
  description: string;
  segments?: Array<{ start: number; end: number; text: string }>;
}

export interface DocumentationAgentResult {
  success: boolean;
  pieces: DocumentationPieceOutput[];
  error?: string;
}

export class DocumentationAgent {
  type: AgentType = "doc-generator";
  private id: string = uuid();
  private sessionId: string = "";

  private systemPrompt = `You are a Documentation Agent specialized in generating structured documentation from video transcriptions.

Your job is to:
1. Analyze the video transcription and any additional context provided
2. Identify distinct documentable topics (features, workflows, use cases, tutorials, reference items)
3. Generate self-contained documentation pieces for each topic
4. Each piece should be clear, professional, and ready to use

## Output Format

You MUST output your response as a JSON array of documentation pieces. Each piece should have:
- pieceType: One of "feature", "workflow", "use-case", "tutorial", "reference"
- title: A clear, descriptive title
- content: The full documentation content in Markdown format

## Piece Type Guidelines

- **feature**: Document a specific feature or capability. Include what it does, why it's useful, and key details.
- **workflow**: Document a process or series of steps. Include numbered steps, prerequisites, and outcomes.
- **use-case**: Document a specific scenario where the product/feature is used. Include context, problem, and solution.
- **tutorial**: Document how to accomplish a specific task. Include step-by-step instructions with examples.
- **reference**: Document technical details, configurations, or specifications. Include tables, parameters, and examples.

## Response Format

\`\`\`json
[
  {
    "pieceType": "feature",
    "title": "Feature Name",
    "content": "# Feature Name\\n\\n## Overview\\n...\\n\\n## Key Capabilities\\n..."
  },
  {
    "pieceType": "workflow",
    "title": "Workflow Name",
    "content": "# Workflow Name\\n\\n## Prerequisites\\n...\\n\\n## Steps\\n1. ..."
  }
]
\`\`\`

Be thorough but focused. Each documentation piece should be:
- Self-contained and understandable on its own
- Well-structured with clear headings
- Professional and ready for use in documentation systems`;

  private buildMessages(input: DocumentationAgentInput): Anthropic.MessageParam[] {
    let contextSection = "";

    if (input.segments && input.segments.length > 0) {
      contextSection = `\n\n## Video Segments\nThe following timestamped segments were identified:\n${input.segments
        .map((s) => `[${s.start}s - ${s.end}s]: ${s.text}`)
        .join("\n")}`;
    }

    return [
      {
        role: "user",
        content: `## User's Description
${input.description}

## Video Transcription
${input.transcription}${contextSection}

Please analyze this content and generate documentation pieces. Output as a JSON array as specified in your instructions.`,
      },
    ];
  }

  private parseOutput(rawOutput: string): DocumentationPieceOutput[] {
    try {
      // Try to extract JSON from the output
      const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error("No JSON array found in output");
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        console.error("Parsed output is not an array");
        return [];
      }

      return parsed.map((item: unknown) => {
        const piece = item as Record<string, unknown>;
        return {
          pieceType: (piece.pieceType as DocPieceType) || "feature",
          title: (piece.title as string) || "Untitled",
          content: (piece.content as string) || "",
          startTimestamp: piece.startTimestamp as number | undefined,
          endTimestamp: piece.endTimestamp as number | undefined,
        };
      });
    } catch (error) {
      console.error("Failed to parse documentation output:", error);
      return [];
    }
  }

  private async log(content: string): Promise<void> {
    await sessionStore.appendLog(this.sessionId, this.type, content);
  }

  async run(input: DocumentationAgentInput, llmConfig?: LLMConfig): Promise<DocumentationAgentResult> {
    this.sessionId = input.sessionId;

    await sessionStore.initAgent(this.sessionId, this.type, this.id);
    await sessionStore.setAgentStatus(this.sessionId, this.type, "running");

    await this.log("Starting documentation generation...\n");

    try {
      const messages = this.buildMessages(input);

      const rawOutput = await streamCompletion(
        this.systemPrompt,
        messages,
        {
          onText: (text) => this.log(text),
          onComplete: () => this.log("\n\n✓ Documentation generated"),
          onError: (error) => this.log(`\n\n✗ Error: ${error.message}`),
        },
        llmConfig
      );

      const pieces = this.parseOutput(rawOutput);

      await sessionStore.setAgentOutput(this.sessionId, this.type, { pieces });
      await sessionStore.setAgentStatus(this.sessionId, this.type, "completed");

      return { success: true, pieces };
    } catch (error) {
      await sessionStore.setAgentStatus(this.sessionId, this.type, "failed");
      await this.log(`\n\n✗ Agent failed: ${(error as Error).message}`);
      return { success: false, pieces: [], error: (error as Error).message };
    }
  }
}
