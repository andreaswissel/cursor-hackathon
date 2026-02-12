import type { AgentSandbox, SandboxConfig } from "./types";
import { LocalSandbox } from "./local-sandbox";
import { E2BSandbox } from "./e2b-sandbox";

export function createSandbox(config: SandboxConfig): AgentSandbox {
  if (process.env.E2B_API_KEY) {
    return new E2BSandbox(config);
  }
  return new LocalSandbox(config);
}
