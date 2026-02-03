import { pgTable, text, timestamp, jsonb, uuid, integer } from "drizzle-orm/pg-core";

// Users table for demo auth
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  isAdmin: integer("is_admin").default(0).notNull(),
  // Multi-provider API keys
  anthropicApiKey: text("anthropic_api_key"),
  openaiApiKey: text("openai_api_key"),
  geminiApiKey: text("gemini_api_key"),
  activeProvider: text("active_provider").$type<"anthropic" | "openai" | "gemini">().default("anthropic"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  idea: text("idea").notNull(),
  context: jsonb("context").$type<{
    okrs: Array<{ objective: string; keyResults: string[] }>;
    customerFeedback: string[];
  }>(),
  status: text("status").$type<"pending" | "running" | "waiting_input" | "completed" | "failed">().default("pending").notNull(),
  promptCount: integer("prompt_count").default(1).notNull(),
  mode: text("mode").$type<"idea-to-spec" | "documentation">().default("idea-to-spec").notNull(),
  videoMetadata: jsonb("video_metadata").$type<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    duration?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id).notNull(),
  agentType: text("agent_type").$type<"orchestrator" | "discovery" | "strategy" | "spec" | "gtm" | "doc-orchestrator" | "transcription" | "doc-generator">().notNull(),
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
  agentType: text("agent_type").$type<"orchestrator" | "discovery" | "strategy" | "spec" | "gtm">().notNull(),
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
