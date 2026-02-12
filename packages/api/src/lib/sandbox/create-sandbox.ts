import type { AgentSandbox, SandboxConfig } from "./types";
import { LocalSandbox } from "./local-sandbox";
import { E2BSandbox } from "./e2b-sandbox";
import { sandboxRegistry } from "./sandbox-registry";

interface SandboxMeta {
  sessionId: string;
  agentType: string;
}

export function createSandbox(config: SandboxConfig, meta: SandboxMeta): AgentSandbox {
  const sandbox: AgentSandbox = process.env.E2B_API_KEY
    ? new E2BSandbox(config)
    : new LocalSandbox(config);

  sandboxRegistry.register(sandbox, meta.sessionId, meta.agentType);

  // Wrap dispose to auto-unregister
  const originalDispose = sandbox.dispose.bind(sandbox);
  sandbox.dispose = async () => {
    await originalDispose();
    sandboxRegistry.unregister(sandbox);
  };

  return sandbox;
}
