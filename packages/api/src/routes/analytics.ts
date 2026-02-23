import { Router } from "express";
import { desc, gte } from "drizzle-orm";
import { db } from "../db";
import { landingEvents, type LandingEventType } from "../db/schema";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

const ALLOWED_EVENT_TYPES = new Set<LandingEventType>([
  "landing_view",
  "waitlist_view",
  "scroll_depth",
  "landing_engagement",
  "cta_click",
  "waitlist_submit_started",
  "waitlist_submit_succeeded",
  "waitlist_submit_failed",
]);

const ALLOWED_PAGES = new Set(["landing", "waitlist"]);

function sanitizeString(value: unknown, maxLength = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function sanitizePath(value: unknown): string {
  const path = sanitizeString(value, 300);
  if (!path) return "/";
  return path.startsWith("/") ? path : "/";
}

function sanitizeMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value).slice(0, 20);
  const sanitized: Record<string, unknown> = {};

  for (const [key, raw] of entries) {
    if (!key || key.length > 60) continue;

    if (typeof raw === "string") {
      sanitized[key] = raw.slice(0, 200);
      continue;
    }

    if (typeof raw === "number" || typeof raw === "boolean" || raw === null) {
      sanitized[key] = raw;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

router.post("/events", async (req, res) => {
  const anonymousId = sanitizeString(req.body?.anonymousId, 128);
  const sessionId = sanitizeString(req.body?.sessionId, 128);
  const eventType = sanitizeString(req.body?.eventType, 64) as LandingEventType | null;
  const page = sanitizeString(req.body?.page, 32);

  if (!anonymousId || anonymousId.length < 12) {
    res.status(400).json({ error: "anonymousId is required" });
    return;
  }

  if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
    res.status(400).json({ error: "Invalid eventType" });
    return;
  }

  if (!page || !ALLOWED_PAGES.has(page)) {
    res.status(400).json({ error: "Invalid page" });
    return;
  }

  try {
    await db.insert(landingEvents).values({
      anonymousId,
      sessionId,
      eventType,
      page: page as "landing" | "waitlist",
      path: sanitizePath(req.body?.path),
      ctaId: sanitizeString(req.body?.ctaId, 80),
      referrerHost: sanitizeString(req.body?.referrerHost, 120),
      utmSource: sanitizeString(req.body?.utmSource, 80),
      utmMedium: sanitizeString(req.body?.utmMedium, 80),
      utmCampaign: sanitizeString(req.body?.utmCampaign, 80),
      metadata: sanitizeMetadata(req.body?.metadata),
    });

    res.status(202).json({ ok: true });
  } catch (err) {
    console.error("Failed to insert analytics event:", err);
    res.status(500).json({ error: "Failed to track event" });
  }
});

router.get("/landing/summary", requireAuth, requireAdmin, async (req, res) => {
  const rawDays = Number(req.query.days);
  const days = Number.isFinite(rawDays)
    ? Math.max(1, Math.min(365, Math.floor(rawDays)))
    : 30;

  const now = new Date();
  const since = new Date(now);
  since.setDate(now.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  try {
    const events = await db
      .select({
        anonymousId: landingEvents.anonymousId,
        eventType: landingEvents.eventType,
        ctaId: landingEvents.ctaId,
        referrerHost: landingEvents.referrerHost,
        metadata: landingEvents.metadata,
        createdAt: landingEvents.createdAt,
      })
      .from(landingEvents)
      .where(gte(landingEvents.createdAt, since))
      .orderBy(desc(landingEvents.createdAt));

    const uniqueVisitors = new Set<string>();
    const uniqueSubmitters = new Set<string>();
    const scroll50Visitors = new Set<string>();
    const scroll90Visitors = new Set<string>();

    const ctaClicksById = new Map<string, number>();
    const referrerViews = new Map<string, number>();
    const dailyRows = new Map<
      string,
      {
        date: string;
        landingViews: number;
        waitlistViews: number;
        ctaClicks: number;
        waitlistStarts: number;
        waitlistSubmits: number;
      }
    >();
    const sectionTotalsMs = new Map<string, number>();
    const sectionSampleCounts = new Map<string, number>();

    let landingViews = 0;
    let waitlistViews = 0;
    let ctaClicks = 0;
    let waitlistStarts = 0;
    let waitlistSubmits = 0;
    let waitlistSubmitFailures = 0;
    let demoCtaClicks = 0;
    let waitlistCtaClicks = 0;
    let engagementSamples = 0;
    let totalEngagedMs = 0;
    let maxScrollSamples = 0;
    let totalMaxScrollPercent = 0;

    for (const event of events) {
      uniqueVisitors.add(event.anonymousId);

      const dateKey = event.createdAt.toISOString().slice(0, 10);
      const daily = dailyRows.get(dateKey) ?? {
        date: dateKey,
        landingViews: 0,
        waitlistViews: 0,
        ctaClicks: 0,
        waitlistStarts: 0,
        waitlistSubmits: 0,
      };

      switch (event.eventType) {
        case "landing_view": {
          landingViews += 1;
          daily.landingViews += 1;

          if (event.referrerHost) {
            referrerViews.set(
              event.referrerHost,
              (referrerViews.get(event.referrerHost) ?? 0) + 1,
            );
          }
          break;
        }
        case "waitlist_view": {
          waitlistViews += 1;
          daily.waitlistViews += 1;
          break;
        }
        case "cta_click": {
          ctaClicks += 1;
          daily.ctaClicks += 1;

          if (event.ctaId) {
            ctaClicksById.set(event.ctaId, (ctaClicksById.get(event.ctaId) ?? 0) + 1);
            if (event.ctaId.includes("demo") || event.ctaId.includes("login")) {
              demoCtaClicks += 1;
            }
            if (event.ctaId.includes("waitlist")) {
              waitlistCtaClicks += 1;
            }
          }
          break;
        }
        case "waitlist_submit_started": {
          waitlistStarts += 1;
          daily.waitlistStarts += 1;
          break;
        }
        case "waitlist_submit_succeeded": {
          waitlistSubmits += 1;
          daily.waitlistSubmits += 1;
          uniqueSubmitters.add(event.anonymousId);
          break;
        }
        case "waitlist_submit_failed": {
          waitlistSubmitFailures += 1;
          break;
        }
        case "scroll_depth": {
          const depth = readNumber(event.metadata?.depthPercent);

          if (depth !== null && depth >= 50) {
            scroll50Visitors.add(event.anonymousId);
          }
          if (depth !== null && depth >= 90) {
            scroll90Visitors.add(event.anonymousId);
          }
          break;
        }
        case "landing_engagement": {
          const engagedMs = readNumber(event.metadata?.engagedMs);
          if (engagedMs !== null && engagedMs > 0) {
            totalEngagedMs += clampNumber(engagedMs, 0, 24 * 60 * 60 * 1000);
            engagementSamples += 1;
          }

          const maxScrollPercent = readNumber(event.metadata?.maxScrollPercent);
          if (maxScrollPercent !== null) {
            totalMaxScrollPercent += clampNumber(maxScrollPercent, 0, 100);
            maxScrollSamples += 1;
          }

          if (event.metadata) {
            for (const [key, value] of Object.entries(event.metadata)) {
              if (!key.startsWith("section_") || !key.endsWith("_ms")) {
                continue;
              }

              const sectionMs = readNumber(value);
              if (sectionMs === null || sectionMs <= 0) {
                continue;
              }

              const sectionId = key.slice("section_".length, -"_ms".length).trim();
              if (!sectionId) {
                continue;
              }

              const safeSectionMs = clampNumber(sectionMs, 0, 24 * 60 * 60 * 1000);
              sectionTotalsMs.set(
                sectionId,
                (sectionTotalsMs.get(sectionId) ?? 0) + safeSectionMs,
              );
              sectionSampleCounts.set(
                sectionId,
                (sectionSampleCounts.get(sectionId) ?? 0) + 1,
              );
            }
          }
          break;
        }
      }

      dailyRows.set(dateKey, daily);
    }

    const totalVisitors = uniqueVisitors.size;
    const uniqueSubmitterCount = uniqueSubmitters.size;
    const topSections = Array.from(sectionTotalsMs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sectionId, totalMs]) => ({
        sectionId,
        totalMs,
        averageMs:
          totalMs / Math.max(1, sectionSampleCounts.get(sectionId) ?? 1),
      }));
    const topSection = topSections[0] ?? null;

    res.json({
      window: {
        days,
        since: since.toISOString(),
        until: now.toISOString(),
      },
      totals: {
        totalVisitors,
        landingViews,
        waitlistViews,
        ctaClicks,
        demoCtaClicks,
        waitlistCtaClicks,
        waitlistStarts,
        waitlistSubmits,
        waitlistSubmitFailures,
        scroll50Visitors: scroll50Visitors.size,
        scroll90Visitors: scroll90Visitors.size,
      },
      rates: {
        waitlistViewRate: totalVisitors > 0 ? waitlistViews / totalVisitors : 0,
        waitlistSubmitRate: totalVisitors > 0 ? uniqueSubmitterCount / totalVisitors : 0,
        waitlistFormConversionRate: waitlistStarts > 0 ? waitlistSubmits / waitlistStarts : 0,
        scroll50Rate: totalVisitors > 0 ? scroll50Visitors.size / totalVisitors : 0,
        scroll90Rate: totalVisitors > 0 ? scroll90Visitors.size / totalVisitors : 0,
      },
      engagement: {
        samples: engagementSamples,
        averageEngagedMs:
          engagementSamples > 0 ? totalEngagedMs / engagementSamples : 0,
        averageEngagedSeconds:
          engagementSamples > 0 ? totalEngagedMs / engagementSamples / 1000 : 0,
        maxScrollSamples,
        averageMaxScrollPercent:
          maxScrollSamples > 0 ? totalMaxScrollPercent / maxScrollSamples : 0,
        topSection,
        topSections,
      },
      topCtas: Array.from(ctaClicksById.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ctaId, clicks]) => ({ ctaId, clicks })),
      topReferrers: Array.from(referrerViews.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([referrerHost, views]) => ({ referrerHost, views })),
      daily: Array.from(dailyRows.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    });
  } catch (err) {
    console.error("Failed to build landing analytics summary:", err);
    res.status(500).json({ error: "Failed to fetch analytics summary" });
  }
});

export default router;
