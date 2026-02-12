import { Sandbox } from "e2b";
import { resolve, posix } from "path";
import type { AgentSandbox, SandboxConfig, SandboxToolName, SandboxToolResult } from "./types";

const MAX_OUTPUT_BYTES = 50 * 1024; // 50KB output cap
const DEFAULT_CMD_TIMEOUT = 30_000;
const MAX_CMD_TIMEOUT = 60_000;
const DEFAULT_READ_LIMIT = 500;
const WORK_DIR = "/home/user/repo";

function truncate(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text) <= maxBytes) return text;
  const buf = Buffer.from(text);
  const truncated = buf.subarray(0, maxBytes).toString("utf-8");
  return truncated + "\n... [output truncated]";
}

export class E2BSandbox implements AgentSandbox {
  private sandbox: Sandbox | null = null;
  private config: SandboxConfig;

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.sandbox = await Sandbox.create({ timeoutMs: 300_000 });

    const branch = this.config.branch;
    const branchArgs = branch ? `--branch ${branch}` : "";

    const result = await this.sandbox.commands.run(
      `git clone --depth=1 ${branchArgs} ${this.config.repoUrl} ${WORK_DIR}`,
      { timeoutMs: 60_000 }
    );

    if (result.exitCode !== 0) {
      const error = result.stderr || result.stdout;
      await this.sandbox.kill();
      this.sandbox = null;
      throw new Error(`Failed to clone repository: ${error}`);
    }
  }

  async dispose(): Promise<void> {
    if (this.sandbox) {
      try {
        await this.sandbox.kill();
      } catch {
        // Best-effort cleanup
      }
      this.sandbox = null;
    }
  }

  getWorkDir(): string {
    return WORK_DIR;
  }

  async getDiff(): Promise<string> {
    if (!this.sandbox) throw new Error("Sandbox not initialized");

    try {
      const unstaged = await this.sandbox.commands.run("git diff", {
        cwd: WORK_DIR,
        timeoutMs: 15_000,
      });
      const staged = await this.sandbox.commands.run("git diff --cached", {
        cwd: WORK_DIR,
        timeoutMs: 15_000,
      });
      const combined = [staged.stdout, unstaged.stdout].filter(Boolean).join("\n");
      return combined || "No changes detected.";
    } catch (err: any) {
      return `Error generating diff: ${err.message}`;
    }
  }

  async executeTool(
    name: SandboxToolName,
    input: Record<string, unknown>
  ): Promise<SandboxToolResult> {
    if (!this.sandbox) {
      return { success: false, output: "", error: "Sandbox not initialized" };
    }

    try {
      switch (name) {
        case "read_file":
          return await this.readFile(input);
        case "write_file":
          return await this.writeFile(input);
        case "list_files":
          return await this.listFiles(input);
        case "run_command":
          return await this.runCommand(input);
        case "search_code":
          return await this.searchCode(input);
        case "create_diff":
          return await this.createDiff();
        default:
          return { success: false, output: "", error: `Unknown tool: ${name}` };
      }
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  }

  private resolvePath(relativePath: string): string {
    const resolved = posix.resolve(WORK_DIR, relativePath);
    if (!resolved.startsWith(WORK_DIR)) {
      throw new Error("Path traversal detected: path must be within the repository");
    }
    return resolved;
  }

  private async readFile(input: Record<string, unknown>): Promise<SandboxToolResult> {
    const filePath = this.resolvePath(input.path as string);
    const offset = Math.max(1, (input.offset as number) || 1);
    const limit = Math.min(2000, (input.limit as number) || DEFAULT_READ_LIMIT);

    const content = await this.sandbox!.files.read(filePath, { format: "text" });
    const lines = content.split("\n");
    const sliced = lines.slice(offset - 1, offset - 1 + limit);
    const numbered = sliced.map((line, i) => `${offset + i}: ${line}`).join("\n");

    return {
      success: true,
      output: truncate(numbered, MAX_OUTPUT_BYTES),
    };
  }

  private async writeFile(input: Record<string, unknown>): Promise<SandboxToolResult> {
    const filePath = this.resolvePath(input.path as string);
    const content = input.content as string;

    await this.sandbox!.files.write(filePath, content);

    return {
      success: true,
      output: `File written: ${input.path} (${Buffer.byteLength(content)} bytes)`,
    };
  }

  private async listFiles(input: Record<string, unknown>): Promise<SandboxToolResult> {
    const dir = this.resolvePath((input.path as string) || ".");
    const recursive = input.recursive as boolean;

    if (recursive) {
      const result = await this.sandbox!.commands.run(
        `find . -type f -not -path './.git/*' | head -1000 | sort`,
        { cwd: dir, timeoutMs: 10_000 }
      );
      if (result.exitCode !== 0) {
        return { success: false, output: "", error: result.stderr || "List failed" };
      }
      return { success: true, output: truncate(result.stdout, MAX_OUTPUT_BYTES) };
    }

    const entries = await this.sandbox!.files.list(dir);
    const output = entries
      .filter((e) => e.name !== ".git")
      .map((e) => (e.type === "dir" ? `${e.name}/` : e.name))
      .sort()
      .join("\n");

    return { success: true, output };
  }

  private async runCommand(input: Record<string, unknown>): Promise<SandboxToolResult> {
    const command = input.command as string;
    const timeout = Math.min((input.timeout as number) || DEFAULT_CMD_TIMEOUT, MAX_CMD_TIMEOUT);

    const result = await this.sandbox!.commands.run(command, {
      cwd: WORK_DIR,
      timeoutMs: timeout,
    });

    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

    if (result.exitCode !== 0) {
      return {
        success: false,
        output: truncate(output || result.error || "Command failed", MAX_OUTPUT_BYTES),
        error: `Exit code ${result.exitCode}`,
      };
    }

    return { success: true, output: truncate(output, MAX_OUTPUT_BYTES) };
  }

  private async searchCode(input: Record<string, unknown>): Promise<SandboxToolResult> {
    const pattern = input.pattern as string;
    const searchPath = (input.path as string) || ".";
    const include = input.include as string | undefined;

    const includeArg = include ? `--include='${include}'` : "";
    const escapedPattern = pattern.replace(/'/g, "'\\''");
    const cmd = `grep -rn ${includeArg} --exclude-dir=.git -E '${escapedPattern}' ${searchPath} | head -200`;

    const result = await this.sandbox!.commands.run(cmd, {
      cwd: WORK_DIR,
      timeoutMs: 15_000,
    });

    // grep returns exit code 1 when no matches found
    if (result.exitCode === 1 && !result.stdout) {
      return { success: true, output: "No matches found." };
    }

    if (result.exitCode !== 0 && result.exitCode !== 1) {
      return { success: false, output: "", error: result.stderr || "Search failed" };
    }

    return {
      success: true,
      output: truncate(result.stdout || "No matches found.", MAX_OUTPUT_BYTES),
    };
  }

  private async createDiff(): Promise<SandboxToolResult> {
    const diff = await this.getDiff();
    return { success: true, output: diff };
  }
}
