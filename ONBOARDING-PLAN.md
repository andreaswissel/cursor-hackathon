# Onboarding Preferences — Wiring Plan

Current state: onboarding wizard captures `role`, `agentMode`, and `frameworks` into `users.preferences` JSONB, but nothing reads these values to affect product behavior.

## What Each Preference Should Do

### 1. Role (`pm_automation` | `engineer_support` | `pm_builder`)

**Where it affects behavior:** Agent system prompts (tone, depth, output format)

| Role | System prompt adjustment |
|------|------------------------|
| `pm_automation` | Emphasize structured PM artifacts — PRDs, user stories, acceptance criteria. Assume PM domain knowledge. |
| `engineer_support` | Focus on technical clarity — API contracts, data models, edge cases. Minimize PM jargon. |
| `pm_builder` | Bias toward speed and actionability — shorter outputs, opinionated defaults, founder-friendly language. |

**Implementation:**
- Add a `getRolePromptModifier(role: UserRole): string` helper in `packages/api/src/agents/prompt-utils.ts` (new file)
- Returns a paragraph to prepend/append to each agent's system prompt
- Called in `BaseAgent.run()` before passing systemPrompt to `streamCompletion()`

### 2. Agent Mode (`guided` | `balanced` | `autonomous`)

**Where it affects behavior:** Orchestrator flow control + agent question-asking behavior

| Mode | Behavior |
|------|----------|
| `guided` | Agents call `askQuestion()` at every phase boundary. User must approve before proceeding. |
| `balanced` | Agents ask questions only when context is ambiguous or missing. Default today (current behavior). |
| `autonomous` | Agents never ask questions. Make best-effort decisions with available context. Skip `askQuestion()` calls. |

**Implementation:**
- Pass `agentMode` into `OrchestratorInput` and down to each agent via `AgentInput`
- In `BaseAgent.run()`, wrap `askQuestion()` calls with a mode check:
  - `guided`: always ask
  - `balanced`: ask only when the agent determines it's needed (current behavior)
  - `autonomous`: skip all `askQuestion()` calls
- In the Orchestrator, `guided` mode inserts a confirmation question between each phase: "Discovery is complete. Review the output and confirm to proceed to Strategy."

**Files to change:**
- `packages/shared/src/index.ts` — add `agentMode` to `AgentInput` interface
- `packages/api/src/agents/base-agent.ts` — check `agentMode` before `askQuestion()`
- `packages/api/src/agents/orchestrator-agent.ts` — pass mode through, add phase-boundary questions for guided mode
- `packages/api/src/routes/sessions.ts` — fetch user preferences when creating a session, pass to orchestrator

### 3. Frameworks (`jiraTaxonomy`, `definitionOfDone`, `okrAlignment`, `customTemplate`)

**Where it affects behavior:** Spec Agent and Strategy Agent output format

| Framework | Effect on output |
|-----------|-----------------|
| `jiraTaxonomy` | Spec agent structures output as Epics > Stories > Tasks with Jira-compatible fields |
| `definitionOfDone` | Every story/feature includes explicit acceptance criteria and done conditions |
| `okrAlignment` | Strategy and spec agents map features to OKRs from context (or prompt user for OKRs if missing) |
| `customTemplate` | Future: user uploads a template; agents conform output to that structure |

**Implementation:**
- Add `getFrameworkPromptModifier(frameworks: UserPreferences['frameworks']): string` in `prompt-utils.ts`
- Returns additional system prompt instructions based on active toggles
- Injected into Spec Agent and Strategy Agent system prompts specifically (not all agents)

## Data Flow (After Wiring)

```
Session created (POST /api/sessions)
    │
    ├── Fetch user from DB (get preferences)
    │
    ├── Build OrchestratorInput:
    │     { sessionId, userId, idea, context,
    │       agentMode: preferences.agentMode,
    │       role: preferences.role,
    │       frameworks: preferences.frameworks }
    │
    └── OrchestratorAgent.run(input)
          │
          ├── For each agent phase:
          │     1. Build dynamic system prompt:
          │        staticPrompt + getRoleModifier(role) + getFrameworkModifier(frameworks)
          │     2. Run agent with mode-aware question logic
          │     3. If guided mode: ask confirmation before next phase
          │
          └── Return final outputs
```

## Files to Create/Modify

| File | Action | What |
|------|--------|------|
| `packages/api/src/agents/prompt-utils.ts` | **Create** | `getRolePromptModifier()`, `getFrameworkPromptModifier()` |
| `packages/shared/src/index.ts` | Edit | Add `agentMode`, `role`, `frameworks` to `AgentInput` |
| `packages/api/src/agents/base-agent.ts` | Edit | Accept preferences in input, build dynamic system prompt, gate `askQuestion()` on mode |
| `packages/api/src/agents/orchestrator-agent.ts` | Edit | Pass preferences to child agents, add guided-mode phase confirmations |
| `packages/api/src/routes/sessions.ts` | Edit | Fetch `users.preferences` when creating session, pass to orchestrator |

## Implementation Order

1. **prompt-utils.ts** — Pure functions, no dependencies. Write + test in isolation.
2. **Shared types** — Add preference fields to `AgentInput`.
3. **sessions.ts route** — Fetch preferences on session creation, thread through.
4. **base-agent.ts** — Dynamic prompt building + mode-gated questions.
5. **orchestrator-agent.ts** — Phase-boundary confirmations for guided mode.
6. **Validate** — Create sessions with different preference combos, verify agent behavior changes.

## Out of Scope (Future)

- `customTemplate` framework — needs a template upload UI + storage. Placeholder toggle only for now.
- Per-session preference overrides — currently preferences are user-level. Session-level overrides would need UI + schema work.
- Settings page for editing preferences post-onboarding — the frameworks/mode should be editable from Settings, not just onboarding.
