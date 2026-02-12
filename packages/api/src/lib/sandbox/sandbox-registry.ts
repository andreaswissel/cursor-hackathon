import type { AgentSandbox } from "./types";

interface SandboxEntry {
  sandbox: AgentSandbox;
  sessionId: string;
  agentType: string;
  createdAt: number;
}

const MAX_SANDBOX_TTL_MS = 10 * 60 * 1000; // 10 minutes

class SandboxRegistry {
  private entries = new Map<AgentSandbox, SandboxEntry>();
  private reaperInterval: ReturnType<typeof setInterval> | null = null;

  register(sandbox: AgentSandbox, sessionId: string, agentType: string): void {
    this.entries.set(sandbox, {
      sandbox,
      sessionId,
      agentType,
      createdAt: Date.now(),
    });
    console.log(
      `[SandboxRegistry] Registered sandbox for session=${sessionId} agent=${agentType} (active: ${this.entries.size})`
    );
  }

  unregister(sandbox: AgentSandbox): void {
    const entry = this.entries.get(sandbox);
    if (entry) {
      this.entries.delete(sandbox);
      console.log(
        `[SandboxRegistry] Unregistered sandbox for session=${entry.sessionId} agent=${entry.agentType} (active: ${this.entries.size})`
      );
    }
  }

  async reapStale(): Promise<void> {
    const now = Date.now();
    const stale: SandboxEntry[] = [];

    for (const entry of this.entries.values()) {
      if (now - entry.createdAt > MAX_SANDBOX_TTL_MS) {
        stale.push(entry);
      }
    }

    if (stale.length === 0) return;

    console.warn(
      `[SandboxRegistry] Reaping ${stale.length} stale sandbox(es)`
    );

    for (const entry of stale) {
      try {
        console.warn(
          `[SandboxRegistry] Disposing stale sandbox: session=${entry.sessionId} agent=${entry.agentType} age=${Math.round((now - entry.createdAt) / 1000)}s`
        );
        await entry.sandbox.dispose();
        // dispose wrapper will call unregister, but remove defensively in case dispose doesn't trigger it
        this.entries.delete(entry.sandbox);
      } catch (err) {
        console.error(
          `[SandboxRegistry] Failed to dispose stale sandbox: session=${entry.sessionId} agent=${entry.agentType}`,
          err
        );
        // Remove from registry even if dispose fails to avoid retrying forever
        this.entries.delete(entry.sandbox);
      }
    }
  }

  getActiveCount(): number {
    return this.entries.size;
  }

  startReaper(intervalMs = 60_000): void {
    if (this.reaperInterval) return;
    this.reaperInterval = setInterval(() => {
      this.reapStale().catch((err) =>
        console.error("[SandboxRegistry] Reaper error:", err)
      );
    }, intervalMs);
    console.log(
      `[SandboxRegistry] Reaper started (interval: ${intervalMs}ms, TTL: ${MAX_SANDBOX_TTL_MS}ms)`
    );
  }

  stopReaper(): void {
    if (this.reaperInterval) {
      clearInterval(this.reaperInterval);
      this.reaperInterval = null;
      console.log("[SandboxRegistry] Reaper stopped");
    }
  }
}

export const sandboxRegistry = new SandboxRegistry();
