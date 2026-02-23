const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://api.product-os.ai/api");

const ANONYMOUS_ID_KEY = "product_os_anon_id";
const SESSION_ID_KEY = "product_os_landing_session_id";
const TRACKED_ONCE_PREFIX = "product_os_tracking_once";

export type MarketingEventType =
  | "landing_view"
  | "waitlist_view"
  | "scroll_depth"
  | "landing_engagement"
  | "cta_click"
  | "waitlist_submit_started"
  | "waitlist_submit_succeeded"
  | "waitlist_submit_failed";

export type MarketingPage = "landing" | "waitlist";

export interface TrackMarketingEventInput {
  eventType: MarketingEventType;
  page: MarketingPage;
  ctaId?: string;
  metadata?: Record<string, unknown>;
}

function getOrCreateStorageValue(key: string): string {
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const value = crypto.randomUUID();
  window.localStorage.setItem(key, value);
  return value;
}

function getAnonymousId(): string {
  return getOrCreateStorageValue(ANONYMOUS_ID_KEY);
}

function getSessionId(): string {
  const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;

  const value = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_ID_KEY, value);
  return value;
}

function sanitizeOptionalString(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function getReferrerHost(): string | undefined {
  if (!document.referrer) return undefined;

  try {
    return new URL(document.referrer).host;
  } catch {
    return undefined;
  }
}

function getUtmData() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: sanitizeOptionalString(params.get("utm_source") ?? undefined, 80),
    utmMedium: sanitizeOptionalString(params.get("utm_medium") ?? undefined, 80),
    utmCampaign: sanitizeOptionalString(params.get("utm_campaign") ?? undefined, 80),
  };
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) return undefined;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (!key || key.length > 60) continue;

    if (typeof value === "string") {
      sanitized[key] = value.slice(0, 200);
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean" || value === null) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function buildPayload(input: TrackMarketingEventInput) {
  return {
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    eventType: input.eventType,
    page: input.page,
    path: window.location.pathname,
    ctaId: sanitizeOptionalString(input.ctaId, 80),
    referrerHost: getReferrerHost(),
    ...getUtmData(),
    metadata: sanitizeMetadata(input.metadata),
  };
}

export function trackMarketingEvent(input: TrackMarketingEventInput): void {
  if (typeof window === "undefined") return;

  let payload: ReturnType<typeof buildPayload>;
  try {
    payload = buildPayload(input);
  } catch {
    return;
  }

  const url = `${API_BASE}/analytics/events`;
  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const accepted = navigator.sendBeacon(url, blob);
      if (accepted) {
        return;
      }
    }

    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Intentionally ignored: analytics should never break UX.
    });
  } catch {
    // Intentionally ignored: analytics should never break UX.
  }
}

export function trackMarketingEventOnce(key: string, input: TrackMarketingEventInput): void {
  if (typeof window === "undefined") return;

  const storageKey = `${TRACKED_ONCE_PREFIX}:${key}`;
  if (window.sessionStorage.getItem(storageKey) === "1") {
    return;
  }

  window.sessionStorage.setItem(storageKey, "1");
  trackMarketingEvent(input);
}

export interface LandingAnalyticsSummary {
  window: {
    days: number;
    since: string;
    until: string;
  };
  totals: {
    totalVisitors: number;
    landingViews: number;
    waitlistViews: number;
    ctaClicks: number;
    demoCtaClicks: number;
    waitlistCtaClicks: number;
    waitlistStarts: number;
    waitlistSubmits: number;
    waitlistSubmitFailures: number;
    scroll50Visitors: number;
    scroll90Visitors: number;
  };
  rates: {
    waitlistViewRate: number;
    waitlistSubmitRate: number;
    waitlistFormConversionRate: number;
    scroll50Rate: number;
    scroll90Rate: number;
  };
  engagement: {
    samples: number;
    averageEngagedMs: number;
    averageEngagedSeconds: number;
    maxScrollSamples: number;
    averageMaxScrollPercent: number;
    topSection: { sectionId: string; totalMs: number; averageMs: number } | null;
    topSections: Array<{ sectionId: string; totalMs: number; averageMs: number }>;
  };
  topCtas: Array<{ ctaId: string; clicks: number }>;
  topReferrers: Array<{ referrerHost: string; views: number }>;
  daily: Array<{
    date: string;
    landingViews: number;
    waitlistViews: number;
    ctaClicks: number;
    waitlistStarts: number;
    waitlistSubmits: number;
  }>;
}

export async function getLandingAnalyticsSummary(token: string, days = 30): Promise<LandingAnalyticsSummary> {
  const res = await fetch(`${API_BASE}/analytics/landing/summary?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch landing analytics summary");
  }

  return res.json();
}
