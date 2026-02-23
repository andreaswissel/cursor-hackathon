import type { IntegrationProvider } from "../db/schema";
import type { AuthUser } from "../middleware/auth";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const ALL_PROVIDERS: IntegrationProvider[] = [
  "airtable",
  "jira",
  "notion",
  "google",
  "slack",
  "intercom",
  "salesforce",
];

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseProviderList(value: string | undefined): IntegrationProvider[] {
  const allowed = new Set<IntegrationProvider>(ALL_PROVIDERS);
  return parseCsv(value)
    .map((provider) => provider.toLowerCase())
    .filter((provider): provider is IntegrationProvider =>
      allowed.has(provider as IntegrationProvider)
    );
}

export const PUBLIC_DEMO_MODE = parseBoolean(process.env.PUBLIC_DEMO_MODE);
const PUBLIC_DEMO_ENABLED_INTEGRATIONS = new Set<IntegrationProvider>(
  parseProviderList(process.env.PUBLIC_DEMO_ENABLED_INTEGRATIONS)
);
const PUBLIC_DEMO_INTERNAL_EMAILS = new Set(
  parseCsv(process.env.PUBLIC_DEMO_INTERNAL_EMAILS).map((email) =>
    email.toLowerCase()
  )
);
const PUBLIC_DEMO_INTERNAL_USER_IDS = new Set(
  parseCsv(process.env.PUBLIC_DEMO_INTERNAL_USER_IDS)
);
const WAITLIST_PATH = "/waitlist";

export interface LaunchModeState {
  publicDemoMode: boolean;
  integrationsLocked: boolean;
  enabledProviders: IntegrationProvider[];
  waitlistUrl: string;
  message: string | null;
}

export function isInternalLaunchUser(
  user: Pick<AuthUser, "id" | "email" | "isAdmin" | "userRole"> | null | undefined
): boolean {
  if (!user) return false;
  if (user.userRole === "admin" || user.userRole === "beta_tester") return true;
  if (user.isAdmin) return true;
  if (PUBLIC_DEMO_INTERNAL_USER_IDS.has(user.id)) return true;
  return PUBLIC_DEMO_INTERNAL_EMAILS.has(user.email.toLowerCase());
}

export function getEnabledIntegrationProvidersForUser(
  user: Pick<AuthUser, "id" | "email" | "isAdmin" | "userRole"> | null | undefined
): IntegrationProvider[] {
  if (!PUBLIC_DEMO_MODE) return [...ALL_PROVIDERS];
  if (isInternalLaunchUser(user)) return [...ALL_PROVIDERS];
  return [...PUBLIC_DEMO_ENABLED_INTEGRATIONS];
}

export function isIntegrationProviderEnabledForUser(
  provider: IntegrationProvider,
  user: Pick<AuthUser, "id" | "email" | "isAdmin" | "userRole"> | null | undefined
): boolean {
  const enabledProviders = getEnabledIntegrationProvidersForUser(user);
  return enabledProviders.includes(provider);
}

export function getLaunchModeStateForUser(
  user: Pick<AuthUser, "id" | "email" | "isAdmin" | "userRole"> | null | undefined
): LaunchModeState {
  const enabledProviders = getEnabledIntegrationProvidersForUser(user);
  const integrationsLocked = PUBLIC_DEMO_MODE && enabledProviders.length === 0;

  return {
    publicDemoMode: PUBLIC_DEMO_MODE,
    integrationsLocked,
    enabledProviders,
    waitlistUrl: WAITLIST_PATH,
    message: integrationsLocked
      ? "Integrations are only available for full users. Join the waitlist for full access."
      : null,
  };
}

export function buildIntegrationLockedError(): {
  error: string;
  code: "INTEGRATIONS_LOCKED";
  waitlistUrl: string;
} {
  return {
    error:
      "Integrations are only available for full users. Join the waitlist for full access.",
    code: "INTEGRATIONS_LOCKED",
    waitlistUrl: WAITLIST_PATH,
  };
}
