import { pgTable, text, timestamp, jsonb, uuid, integer, real, unique, date } from "drizzle-orm/pg-core";
import type { UserPreferences, KnowledgeFilter, KnowledgeVisibility, RoadmapItemStatus, RoadmapItemPriority } from "@product-os/shared";

// Users table for demo auth
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  isAdmin: integer("is_admin").default(0).notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  // Multi-provider API keys
  anthropicApiKey: text("anthropic_api_key"),
  openaiApiKey: text("openai_api_key"),
  geminiApiKey: text("gemini_api_key"),
  activeProvider: text("active_provider").$type<"anthropic" | "openai" | "gemini">().default("anthropic"),
  onboardingCompleted: integer("onboarding_completed").default(0).notNull(),
  preferences: jsonb("preferences").$type<UserPreferences>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Teams — collaborative workspaces
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Team members
export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").$type<"owner" | "admin" | "member">().default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  unique("team_members_team_user_unique").on(t.teamId, t.userId),
]);

// Team invites
export const teamInvites = pgTable("team_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  invitedByUserId: uuid("invited_by_user_id").references(() => users.id).notNull(),
  invitedEmail: text("invited_email"),
  role: text("role").$type<"owner" | "admin" | "member">().default("member").notNull(),
  status: text("status").$type<"pending" | "accepted" | "declined" | "expired">().default("pending").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Projects — organizational unit grouping sessions
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  name: text("name").default("Untitled Project").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  projectId: uuid("project_id").references(() => projects.id),
  idea: text("idea").notNull(),
  context: jsonb("context").$type<{
    okrs: Array<{ objective: string; keyResults: string[] }>;
    customerFeedback: string[];
  }>(),
  status: text("status").$type<"pending" | "running" | "waiting_input" | "completed" | "failed">().default("pending").notNull(),
  promptCount: integer("prompt_count").default(1).notNull(),
  mode: text("mode").$type<"idea-to-spec" | "documentation" | "flow">().default("idea-to-spec").notNull(),
  videoMetadata: jsonb("video_metadata").$type<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    duration?: number;
  }>(),
  repoUrl: text("repo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id).notNull(),
  agentType: text("agent_type").$type<"orchestrator" | "discovery" | "strategy" | "spec" | "gtm" | "doc-orchestrator" | "transcription" | "doc-generator" | "flow-orchestrator" | "code-agent" | "review-agent">().notNull(),
  status: text("status").$type<"pending" | "running" | "waiting_input" | "completed" | "failed">().default("pending").notNull(),
  output: jsonb("output"),
  logs: jsonb("logs").$type<Array<{ timestamp: string; content: string }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const outputs = pgTable("outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id).notNull(),
  type: text("type").$type<"spec" | "slides" | "validation" | "strategy">().notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documentation pieces for documentation mode sessions
export const documentationPieces = pgTable("documentation_pieces", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id).notNull(),
  pieceType: text("piece_type").$type<"feature" | "workflow" | "use-case" | "tutorial" | "reference">().notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status").$type<"pending" | "accepted" | "declined" | "refined">().default("pending").notNull(),
  order: integer("order").default(0).notNull(),
  startTimestamp: integer("start_timestamp"),
  endTimestamp: integer("end_timestamp"),
  refinementHistory: jsonb("refinement_history").$type<Array<{
    timestamp: string;
    userMessage: string;
    previousContent: string;
    newContent: string;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat messages for continuing conversations with agents
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id).notNull(),
  agentType: text("agent_type").$type<"orchestrator" | "discovery" | "strategy" | "spec" | "gtm" | "flow-orchestrator" | "code-agent" | "review-agent">().notNull(),
  role: text("role").$type<"user" | "assistant">().notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Integration types
export type IntegrationProvider = "airtable" | "jira" | "notion" | "google" | "slack";

// User integrations (OAuth connections to external tools)
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  provider: text("provider").$type<IntegrationProvider>().notNull(),
  // OAuth tokens
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  // Provider-specific metadata (workspace ID, team ID, etc.)
  metadata: jsonb("metadata").$type<{
    workspaceId?: string;
    workspaceName?: string;
    teamId?: string;
    email?: string;
    [key: string]: unknown;
  }>(),
  // Connection status
  isActive: integer("is_active").default(1).notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Synced data from integrations (cached for context)
export const integrationData = pgTable("integration_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").references(() => integrations.id).notNull(),
  // Type of data (e.g., "okrs", "feedback", "tickets", "docs")
  dataType: text("data_type").$type<"okrs" | "feedback" | "tickets" | "docs" | "messages">().notNull(),
  // Source identifier (e.g., base ID, project key, page ID)
  sourceId: text("source_id").notNull(),
  sourceName: text("source_name"),
  // The actual synced content
  content: jsonb("content").notNull(),
  // For display/selection
  title: text("title"),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Discovery mode — periodic signal analysis
export const discoveryRuns = pgTable("discovery_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: text("status").$type<"pending" | "running" | "completed" | "failed">().default("pending").notNull(),
  signalCount: integer("signal_count").default(0).notNull(),
  clusterCount: integer("cluster_count").default(0).notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const discoveryClusters = pgTable("discovery_clusters", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => discoveryRuns.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  featureSuggestion: text("feature_suggestion").notNull(),
  compositeScore: real("composite_score").default(0).notNull(),
  signalCount: integer("signal_count").default(0).notNull(),
  painSeverity: integer("pain_severity").default(1).notNull(),
  hasMoneyQuotes: integer("has_money_quotes").default(0).notNull(),
  recencyScore: real("recency_score").default(0).notNull(),
  moneyQuotes: jsonb("money_quotes").$type<string[]>().default([]),
  sampleSignals: jsonb("sample_signals").$type<string[]>().default([]),
  sources: jsonb("sources").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Knowledge sources — filter specifications attached to projects
export const knowledgeSources = pgTable("knowledge_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  provider: text("provider"),
  dataTypes: jsonb("data_types").$type<string[]>(),
  filters: jsonb("filters").$type<KnowledgeFilter>().notNull(),
  visibility: text("visibility").$type<KnowledgeVisibility>().default("team").notNull(),
  aiSummary: text("ai_summary"),
  aiSummaryGeneratedAt: timestamp("ai_summary_generated_at"),
  enabled: integer("enabled").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Flow artifacts — dynamic artifacts created during flow mode sessions
export const flowArtifacts = pgTable("flow_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull(),
  type: text("type").$type<"plan" | "code-diff" | "review" | "spec" | "document" | "pr-link">().notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  status: text("status").$type<"generating" | "ready" | "error">().default("generating").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Roadmap items — global timeline planning
export const roadmapItems = pgTable("roadmap_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").$type<RoadmapItemStatus>().default("backlog").notNull(),
  priority: text("priority").$type<RoadmapItemPriority>().default("medium").notNull(),
  targetQuarter: text("target_quarter"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Roadmap item ↔ session join table
export const roadmapItemSessions = pgTable("roadmap_item_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  roadmapItemId: uuid("roadmap_item_id").references(() => roadmapItems.id, { onDelete: "cascade" }).notNull(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("roadmap_item_sessions_unique").on(t.roadmapItemId, t.sessionId),
]);

// Session knowledge overrides — per-session add/remove relative to project
export const sessionKnowledgeOverrides = pgTable("session_knowledge_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull(),
  knowledgeSourceId: uuid("knowledge_source_id").references(() => knowledgeSources.id, { onDelete: "cascade" }),
  integrationDataId: uuid("integration_data_id").references(() => integrationData.id),
  action: text("action").$type<"add" | "remove">().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
