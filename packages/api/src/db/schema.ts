import { pgTable, text, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  idea: text("idea").notNull(),
  context: jsonb("context").$type<{
    okrs: Array<{ objective: string; keyResults: string[] }>;
    customerFeedback: string[];
  }>(),
  status: text("status").$type<"pending" | "running" | "waiting_input" | "completed" | "failed">().default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id).notNull(),
  agentType: text("agent_type").$type<"orchestrator" | "discovery" | "strategy" | "spec" | "gtm">().notNull(),
  status: text("status").$type<"pending" | "running" | "waiting_input" | "completed" | "failed">().default("pending").notNull(),
  output: jsonb("output"),
  logs: jsonb("logs").$type<Array<{ timestamp: string; content: string }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id).notNull(),
  agentRunId: uuid("agent_run_id").references(() => agentRuns.id).notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  status: text("status").$type<"pending" | "answered">().default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const outputs = pgTable("outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id).notNull(),
  type: text("type").$type<"spec" | "slides" | "validation" | "strategy">().notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
