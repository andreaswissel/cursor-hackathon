export interface SandboxConfig {
  repoUrl: string;
  branch?: string;
  workDir?: string;
}

export type SandboxStatus = "idle" | "cloning" | "ready" | "running" | "error";

export interface SandboxState {
  status: SandboxStatus;
  workDir: string;
  branch: string;
  error?: string;
  clonedAt?: Date;
}

export type SandboxToolName =
  | "read_file"
  | "write_file"
  | "list_files"
  | "run_command"
  | "search_code"
  | "create_diff";

export interface SandboxToolInputs {
  read_file: { path: string; offset?: number; limit?: number };
  write_file: { path: string; content: string };
  list_files: { path?: string; recursive?: boolean };
  run_command: { command: string; timeout?: number };
  search_code: { pattern: string; path?: string; include?: string };
  create_diff: Record<string, never>;
}

export type SandboxToolInput<T extends SandboxToolName = SandboxToolName> =
  T extends keyof SandboxToolInputs ? SandboxToolInputs[T] : never;

export interface SandboxToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface AgentSandbox {
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  executeTool(name: SandboxToolName, input: Record<string, unknown>): Promise<SandboxToolResult>;
  getWorkDir(): string;
  getDiff(): Promise<string>;
}
