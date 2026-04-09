import type { AgentMode, UserPreferences, UserRole } from "@product-os/shared";

export function getRolePromptModifier(role?: UserRole): string {
  if (!role) return "";

  if (role === "pm_automation") {
    return `Preference Profile:
- The user is optimizing PM execution speed.
- Prioritize structured artifacts (PRD sections, user stories, acceptance criteria, implementation handoff).
- Assume strong PM fluency and keep output operational.`;
  }

  if (role === "engineer_support") {
    return `Preference Profile:
- The user needs engineering-ready clarity.
- Emphasize technical constraints, data flow, API contracts, and edge cases.
- Keep language concrete and minimize PM-specific jargon.`;
  }

  return `Preference Profile:
- The user is a builder/founder optimizing for fast execution.
- Favor concise, opinionated recommendations and actionable next steps.
- Keep outputs practical and momentum-oriented.`;
}

export function getAgentModePromptModifier(agentMode?: AgentMode): string {
  if (!agentMode || agentMode === "balanced") return "";

  if (agentMode === "guided") {
    return `Execution Mode:
- Guided mode is active.
- Be explicit about assumptions and clearly flag decisions that need human confirmation.
- Prefer transparent reasoning over aggressive autonomy.`;
  }

  return `Execution Mode:
- Autonomous mode is active.
- Make reasonable assumptions when details are missing and proceed without blocking questions.
- Return clear decisions and confidence notes for any assumptions made.`;
}

export function getFrameworkPromptModifier(frameworks?: UserPreferences["frameworks"]): string {
  if (!frameworks) return "";

  const lines: string[] = [];

  if (frameworks.jiraTaxonomy) {
    lines.push("- Structure outputs using Jira-friendly hierarchy (Epics -> Stories -> Tasks).");
  }
  if (frameworks.definitionOfDone) {
    lines.push("- Include explicit acceptance criteria and a Definition of Done per major requirement.");
  }
  if (frameworks.okrAlignment) {
    lines.push("- Explicitly map recommendations and requirements to relevant OKRs/KRs.");
  }
  if (frameworks.customTemplate) {
    lines.push("- Keep output modular and sectioned so it can be adapted to custom internal templates.");
  }

  if (lines.length === 0) return "";

  return `Framework Preferences:
${lines.join("\n")}`;
}

