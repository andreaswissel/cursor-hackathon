import { pgTable, text, timestamp, jsonb, uuid, integer } from "drizzle-orm/pg-core";

// Users table for demo auth
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  isAdmin: integer("is_admin").default(0).notNull(),
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

export const outputs = pgTable("outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id).notNull(),
  type: text("type").$type<"spec" | "slides" | "validation" | "strategy">().notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
