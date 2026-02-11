import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { AgentSandbox, SandboxConfig, SandboxToolName, SandboxToolResult } from "./types";

const execAsync = promisify(exec);

const MAX_OUTPUT_BYTES = 50 * 1024; // 50KB output cap
const DEFAULT_CMD_TIMEOUT = 30_000;
const MAX_CMD_TIMEOUT = 60_000;
const DEFAULT_READ_LIMIT = 500;

function truncate(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text) <= maxBytes) return text;
  const buf = Buffer.from(text);
  const truncated = buf.subarray(0, maxBytes).toString("utf-8");
  return truncated + "\n... [output truncated]";
}

export class LocalSandbox implements AgentSandbox {
  private workDir = "";
  private config: SandboxConfig;

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.config.workDir) {
      this.workDir = this.config.workDir;
    } else {
      this.workDir = await fs.mkdtemp(join(tmpdir(), "sandbox-"));
    }

    const branch = this.config.branch || "HEAD";
    const branchArgs = this.config.branch ? `--branch ${this.config.branch}` : "";

    try {
      await execAsync(
        `git clone --depth=1 ${branchArgs} ${this.config.repoUrl} .`,
        { cwd: this.workDir, timeout: 60_000 }
      );
    } catch (err: any) {
      throw new Error(`Failed to clone repository: ${err.message}`);
    }
  }

  async dispose(): Promise<void> {
    if (this.workDir && !this.config.workDir) {
      try {
        await fs.rm(this.workDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup
      }
    }
  }

  getWorkDir(): string {
    return this.workDir;
  }

  async getDiff(): Promise<string> {
    try {
      const { stdout: unstaged } = await execAsync("git diff", {
        cwd: this.workDir,
        maxBuffer: 1024 * 1024,
      });
      const { stdout: staged } = await execAsync("git diff --cached", {
        cwd: this.workDir,
        maxBuffer: 1024 * 1024,
      });
      const combined = [staged, unstaged].filter(Boolean).join("\n");
      return combined || "No changes detected.";
    } catch (err: any) {
      return `Error generating diff: ${err.message}`;
    }
  }

  async executeTool(
    name: SandboxToolName,
    input: Record<string, unknown>
  ): Promise<SandboxToolResult> {
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
    const resolved = resolve(this.workDir, relativePath);
    if (!resolved.startsWith(this.workDir)) {
      throw new Error("Path traversal detected: path must be within the repository");
    }
    return resolved;
  }

  private async readFile(input: Record<string, unknown>): Promise<SandboxToolResult> {
    const filePath = this.resolvePath(input.path as string);
    const offset = Math.max(1, (input.offset as number) || 1);
    const limit = Math.min(2000, (input.limit as number) || DEFAULT_READ_LIMIT);

    const content = await fs.readFile(filePath, "utf-8");
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

    // Create parent directories
    await fs.mkdir(join(filePath, ".."), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");

    return {
      success: true,
      output: `File written: ${input.path} (${Buffer.byteLength(content)} bytes)`,
    };
  }

  private async listFiles(input: Record<string, unknown>): Promise<SandboxToolResult> {
    const dir = this.resolvePath((input.path as string) || ".");
    const recursive = input.recursive as boolean;

    if (recursive) {
      try {
        const { stdout } = await execAsync(
          `find . -type f -not -path './.git/*' | head -1000 | sort`,
          { cwd: dir, timeout: 10_000 }
        );
        return { success: true, output: truncate(stdout, MAX_OUTPUT_BYTES) };
      } catch (err: any) {
        return { success: false, output: "", error: err.message };
      }
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });
    const output = entries
      .filter((e) => e.name !== ".git")
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort()
      .join("\n");

    return { success: true, output };
  }

  private async runCommand(input: Record<string, unknown>): Promise<SandboxToolResult> {
    const command = input.command as string;
    const timeout = Math.min((input.timeout as number) || DEFAULT_CMD_TIMEOUT, MAX_CMD_TIMEOUT);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workDir,
        timeout,
        maxBuffer: 1024 * 1024,
      });
      const output = [stdout, stderr].filter(Boolean).join("\n");
      return { success: true, output: truncate(output, MAX_OUTPUT_BYTES) };
    } catch (err: any) {
      const output = [err.stdout, err.stderr].filter(Boolean).join("\n");
      return {
        success: false,
        output: truncate(output || err.message, MAX_OUTPUT_BYTES),
        error: err.killed ? "Command timed out" : `Exit code ${err.code}`,
      };
    }
  }

  private async searchCode(input: Record<string, unknown>): Promise<SandboxToolResult> {
    const pattern = input.pattern as string;
    const searchPath = (input.path as string) || ".";
    const include = input.include as string | undefined;

    const includeArg = include ? `--include='${include}'` : "";
    const cmd = `grep -rn ${includeArg} --exclude-dir=.git -E '${pattern.replace(/'/g, "'\\''")}' ${searchPath} | head -200`;

    try {
      const { stdout } = await execAsync(cmd, {
        cwd: this.workDir,
        timeout: 15_000,
        maxBuffer: 1024 * 1024,
      });
      return { success: true, output: truncate(stdout || "No matches found.", MAX_OUTPUT_BYTES) };
    } catch (err: any) {
      // grep returns exit code 1 when no matches found
      if (err.code === 1) {
        return { success: true, output: "No matches found." };
      }
      return { success: false, output: "", error: err.message };
    }
  }

  private async createDiff(): Promise<SandboxToolResult> {
    const diff = await this.getDiff();
    return { success: true, output: diff };
  }
}
