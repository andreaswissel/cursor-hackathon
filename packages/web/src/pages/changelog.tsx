import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-lg font-semibold">Changelog</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground">
            All notable changes to Product OS are documented here.
          </p>

          {/* Feb 20 */}
          <h2 className="text-xl font-semibold mt-8 mb-4">2026-02-20</h2>

          <h3 className="text-lg font-medium mt-6 mb-3">Features</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Public demo launch mode</strong> &mdash; Added{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                PUBLIC_DEMO_MODE
              </code>{" "}
              controls that lock external integrations server-side for public
              users while preserving internal/admin bypass access.
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">Fixes</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Drafts bootstrap for legacy users</strong> &mdash; The
              projects API now always ensures each user has a personal{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                Drafts
              </code>{" "}
              project and backfills legacy sessions with missing project
              assignments, so users no longer get stuck on perpetual
              &quot;Loading projects...&quot; states.
            </li>
            <li>
              <strong>OAuth redirect mismatch resilience (Google + Notion)</strong>{" "}
              &mdash; Added normalized{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                API_BASE_URL
              </code>{" "}
              fallback redirect URIs for integration callbacks to prevent{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                redirect_uri_mismatch
              </code>{" "}
              errors when provider-specific env vars are missing.
            </li>
            <li>
              <strong>Reconnect warning noise reduction</strong> &mdash; Session
              reconnect banner now appears only after a sustained disconnect
              (4 seconds), eliminating sub-second flicker notifications during
              transient SSE hiccups.
            </li>
            <li>
              <strong>Dropdown layering and clipping</strong> &mdash; Fixed
              custom dropdown menus being cut off or rendered behind nearby
              cards by removing clipping overflow from the outputs handoff
              wrapper and standardizing higher z-index layers for custom
              dropdown anchors/menus.
            </li>
            <li>
              <strong>Flow inline @/$/# popup rendering</strong> &mdash;
              Converted the context popup to a true floating overlay (
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                position: fixed
              </code>
              ) with higher layering and refined popover styling, removing the
              inline embedded look and preventing composer-line visual
              collisions.
            </li>
            <li>
              <strong>Integration data access lockdown in demo mode</strong>{" "}
              &mdash; Discovery and knowledge resolution now ignore live
              integration data for public-demo users when integrations are
              disabled, preventing accidental leakage of synced external data.
            </li>
            <li>
              <strong>Flow @Code preflight guidance</strong> &mdash;{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @Code
              </code>{" "}
              now prompts for missing repository/task details with concrete
              examples instead of launching the coding sandbox on underspecified
              commands.
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">Improvements</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Outputs handoff panel redesign</strong> &mdash; Reworked
              the &quot;Ready to Build&quot; section into a clearer two-path
              handoff (Flow mode vs coding agent) and toned down the visual
              treatment for dark mode.
            </li>
            <li>
              <strong>Dark scrollbar theming</strong> &mdash; Replaced
              bright/system-looking scrollbar rails with explicit app-matched
              dark track/thumb tokens for calmer, consistent contrast.
            </li>
            <li>
              <strong>Waitlist signup minimization</strong> &mdash; Waitlist
              now requires only email, with optional name and company fields for
              lower-friction and reduced PII collection.
            </li>
            <li>
              <strong>Discovery realism</strong> &mdash; Removed scripted
              discovery cluster fallback responses so dashboard insights are
              always produced by real model runs.
            </li>
            <li>
              <strong>Landing messaging refresh (Flow-first)</strong> &mdash;
              Repositioned landing copy around an explicit agentic-product
              workflow, clarified how Flow mode orchestrates{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @Discovery
              </code>
              ,{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @Strategy
              </code>
              ,{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @Spec
              </code>
              , and{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @GTM
              </code>
              , and aligned CTAs to demo access plus waitlist for full
              integrations.
            </li>
          </ul>

          {/* Feb 13 */}
          <h2 className="text-xl font-semibold mt-8 mb-4">2026-02-13</h2>

          <h3 className="text-lg font-medium mt-6 mb-3">Improvements</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Landing Page &mdash; Dark Theme</strong> &mdash; Converted
              the entire landing page from light/cream to a permanent dark theme
              with dark gray backgrounds, white/light text, inverted navbar CTA,
              and preserved accent colors. App mockups inside cards remain
              light-themed.
            </li>
            <li>
              <strong>Landing Page &mdash; Bento Grid &amp; Copy Refresh</strong>{" "}
              &mdash; Added Dreelio-inspired bento feature grid with two large
              mockup cards and three icon cards in warm cream styling. Removed
              serif display font in favour of DM Sans for all headings. Updated
              copy to focus on the &quot;operating system for product
              managers&quot; proposition.
            </li>
            <li>
              <strong>Landing Page Redesign</strong> &mdash; Dreelio-inspired
              premium redesign with cream/off-white backgrounds, floating pill
              navbar that transitions on scroll, second hero section with large
              app screenshot mockup, social proof bar with 8 integration icons,
              alternating feature sections with slide-in animations, staggered
              how-it-works cards, testimonial quote section, blue gradient CTA,
              and footer in a card.
            </li>
          </ul>

          {/* Feb 12 */}
          <h2 className="text-xl font-semibold mt-10 mb-4">2026-02-12</h2>

          <h3 className="text-lg font-medium mt-6 mb-3">Features</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Stop Running Agents</strong> &mdash; Added a stop button to
              cancel agents (@Code, @Review, etc.) while they&apos;re running in
              flow mode. Clicking stop immediately ends the SSE stream and
              re-enables the input area.
            </li>
            <li>
              <strong>E2B Cloud Sandbox</strong> &mdash; Code and review agents
              now run in isolated E2B cloud sandboxes (Firecracker microVMs)
              instead of executing commands directly on the API server.
              Automatically falls back to local sandbox when{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                E2B_API_KEY
              </code>{" "}
              is not set.
            </li>
            <li>
              <strong>Admin Waitlist Management</strong> &mdash; Admin page at{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                /admin
              </code>{" "}
              to view, approve, and reject waitlist signups with status badges
              and real-time updates
            </li>
            <li>
              <strong>Full-screen Video Hero</strong> &mdash; Landing page opens
              with a full-viewport typographic animation with scroll indicator to
              reveal the rest of the page
            </li>
            <li>
              <strong>Real Brand Icons</strong> &mdash; Replaced generic Lucide
              icons with official brand SVGs (Airtable, Jira, Notion, Google,
              Slack, Intercom, Salesforce, Linear) across integrations panel,
              landing page, and onboarding
            </li>
            <li>
              <strong>Legal Compliance</strong> &mdash; Added Impressum (DDG
              &sect;5), Terms of Service, GDPR legal basis mapping in Privacy
              Policy, and privacy/terms consent on waitlist form. Standardized
              contact email.
            </li>
            <li>
              <strong>Waitlist</strong> &mdash; Beta signup waitlist at{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                /waitlist
              </code>{" "}
              with name, email, role, and use-case collection. Landing page CTAs
              now point to the waitlist instead of direct signup. Existing users
              can still sign in via{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                /login
              </code>
              .
            </li>
            <li>
              <strong>Landing Page</strong> &mdash; Public marketing landing page
              at{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">/</code>{" "}
              for unauthenticated visitors with hero, feature showcase, how it
              works, integrations, and CTA sections. Authenticated users still
              see the home dashboard.
            </li>
            <li>
              <strong>Salesforce Integration</strong> &mdash; New integration
              adapter to import sales feedback from Cases, Opportunities, Leads,
              and Contacts via OAuth with refresh token support
            </li>
            <li>
              <strong>New Flow in Project</strong> &mdash; Start a Flow session
              directly from a project via hover action button in the sidebar
            </li>
            <li>
              <strong>Tools Marketplace</strong> &mdash; New{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                /tools
              </code>{" "}
              hub consolidating Documents, Roadmap, and two new AI-powered
              tools: Guided Tours (product tour designer) and Feedback Forms
              (survey/form designer)
            </li>
            <li>
              <strong>Changelog</strong> &mdash; Public{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                /changelog
              </code>{" "}
              page accessible without authentication
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">Fixes</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Flow agent messages persist on refresh</strong> &mdash;
              Agent commands (@Code, @Review, etc.) now persist their completion
              summary to the database so messages survive page refresh. Thinking
              blocks are reconstructed at the correct position in the thread.
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">Improvements</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Home page redesign</strong> &mdash; Vertical layout with
              visual preview mockups for each mode (Flow, Imagine, Tools,
              Discover) showing what the UI looks like before clicking through
            </li>
            <li>
              <strong>Sidebar project names</strong> &mdash; Show full project
              name on hover tooltip, use more space for text, align session count
              to the right; session names also get tooltips
            </li>
            <li>
              <strong>Flow chat UX</strong> &mdash; Replace agent button row
              with + popup menu in chat thread; move + button inside textarea
              container to match ChatGPT layout
            </li>
          </ul>

          {/* Feb 11 */}
          <h2 className="text-xl font-semibold mt-10 mb-4">2026-02-11</h2>

          <h3 className="text-lg font-medium mt-6 mb-3">Features</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Flow Mode</strong> &mdash; Continuous chat with artifacts
              and specialized agents
            </li>
            <li>
              <strong>Enhanced Flow Mode</strong> &mdash; All agent triggers,
              collapsible thinking, changelog agent, and context menu
            </li>
            <li>
              <strong>Zero-friction Flow Mode entry</strong> &mdash;
              LLM-powered title generation and project-level repo URLs
            </li>
            <li>
              <strong>AgentSandbox</strong> &mdash; Code and Review agents with
              tool-use loop for Flow Mode
            </li>
            <li>
              <strong>Roadmap</strong> &mdash; Global Gantt-style timeline for
              planning features across quarters
            </li>
            <li>
              <strong>Privacy &amp; Compliance</strong> &mdash; Inline privacy
              policy, DPA, and subprocessors list
            </li>
            <li>
              <strong>Intercom Integration</strong> &mdash; Customer
              conversation sync adapter
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">Fixes</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>CORS</strong> &mdash; Allow{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                X-Team-Id
              </code>{" "}
              header in preflight responses
            </li>
            <li>
              <strong>Build</strong> &mdash; Include{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                codingPrompt
              </code>{" "}
              prop in handoff components
            </li>
            <li>
              <strong>Flow page</strong> &mdash; Center send button and add @
              context menu popup
            </li>
            <li>
              <strong>Sidebar</strong> &mdash; Move Flow nav item to first
              position
            </li>
          </ul>

          {/* Feb 10 */}
          <h2 className="text-xl font-semibold mt-10 mb-4">2026-02-10</h2>

          <h3 className="text-lg font-medium mt-6 mb-3">Features</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Discover</strong> &mdash; Discovery page with CTA buttons,
              backend API, and real data source selector
            </li>
            <li>
              <strong>Imagine</strong> &mdash; New Imagine page with file
              import, terminal panel, and UI improvements
            </li>
            <li>
              <strong>Projects</strong> &mdash; Projects as primary
              organizational unit for grouping sessions
            </li>
            <li>
              <strong>Onboarding</strong> &mdash; Multi-step onboarding wizard
              for new users
            </li>
            <li>
              <strong>Teams &amp; Roles</strong> &mdash; Teams, user profiles,
              and role-based access with invite flows
            </li>
            <li>
              <strong>Knowledge Sources</strong> &mdash; Project-scoped
              knowledge with inheritance and AI summarization
            </li>
            <li>
              <strong>Move-to-Team UI</strong> &mdash; Transfer projects between
              personal and team workspaces
            </li>
            <li>
              <strong>Admin User Management</strong> &mdash; User management
              panel in settings page
            </li>
            <li>
              <strong>Privacy Notices</strong> &mdash; Layered privacy notices
              with low-friction UX
            </li>
            <li>
              <strong>Desktop App</strong> &mdash; Tauri desktop app CORS
              support
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">Fixes</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Dark mode</strong> &mdash; Fix heading colors in markdown
              prose containers
            </li>
            <li>
              <strong>Onboarding</strong> &mdash; Fix tool links redirecting to
              step 1
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
