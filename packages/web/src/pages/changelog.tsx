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

          {/* Feb 23 */}
          <h2 className="text-xl font-semibold mt-8 mb-4">2026-02-23</h2>

          <h3 className="text-lg font-medium mt-6 mb-3">Features</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>First-party landing analytics pipeline</strong> &mdash;
              Added internal event tracking and admin funnel reporting for
              landing-page views, CTA clicks, scroll depth, and waitlist
              conversion, without Google Analytics or other third-party
              trackers.
            </li>
            <li>
              <strong>System user roles for launch access</strong> &mdash; Added
              persisted user roles (
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                admin
              </code>
              ,{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                beta_tester
              </code>
              ,{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                public_user
              </code>
              ) with launch-gating support so beta testers retain and manage
              integrations in public demo mode.
            </li>
            <li>
              <strong>Self-service account deletion</strong> &mdash; Added an authenticated{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                DELETE /auth/me
              </code>{" "}
              endpoint and a Settings danger-zone action so users can
              permanently delete their own account and associated data.
            </li>
            <li>
              <strong>Token encryption at rest</strong> &mdash; Added
              application-layer encryption for stored secrets, including BYOK
              provider keys and OAuth integration access and refresh tokens.
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">Improvements</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Admin user management role controls</strong> &mdash;
              Settings now supports assigning and updating system roles for
              users, including promoting existing accounts to Beta Tester
              without manual database edits.
            </li>
            <li>
              <strong>Centralized user data deletion service</strong> &mdash;
              Refactored account removal into a shared backend utility used by
              both admin-driven deletes and self-service deletes for
              consistency.
            </li>
            <li>
              <strong>Sidebar session mode icons + running indicator split</strong>{" "}
              &mdash; Project session rows now always show mode and type icons
              (Flow, Imagine, Discover, etc.), while active runs display a
              separate compact rotating progress indicator instead of replacing
              the mode icon.
            </li>
            <li>
              <strong>Flow @Code per-user daily budget</strong> &mdash; Added a
              configurable daily run cap for the Flow coding agent (
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                CODE_AGENT_DAILY_LIMIT
              </code>
              , default{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                3
              </code>
              ) with in-chat limit messaging and UTC reset timestamps.
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">Fixes</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Landing mobile hero starts on content (no animation pre-roll)</strong>{" "}
              &mdash; Hid the full-screen header animation on mobile, start
              directly on the main hero section, and removed the
              &quot;Built for Product, Loved by Development&quot; hero pill on
              small screens for a cleaner first paint.
            </li>
            <li>
              <strong>Flow @Code budget role scope correction</strong> &mdash;
              Updated daily budget enforcement so{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                beta_tester
              </code>{" "}
              users are capped like public users; only admins bypass the{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @Code
              </code>{" "}
              daily run limit.
            </li>
            <li>
              <strong>Flow mobile artifact panel access</strong> &mdash; Restored
              artifact access in mobile flow sessions by adding an explicit{" "}
              &quot;Open artifacts panel&quot; trigger and a mobile drawer with close
              controls.
            </li>
            <li>
              <strong>Flow mobile artifact drawer alignment + trigger layout</strong>{" "}
              &mdash; Removed the extra vertical offset so the mobile artifact
              drawer sits directly under the session header, and fixed the
              floating artifact trigger to stay on a single row instead of
              wrapping.
            </li>
            <li>
              <strong>Flow mobile artifacts sheet redesign</strong> &mdash;
              Reworked mobile artifacts into a full-width bottom sheet with
              dark backdrop overlay, fixed 50px top inset, and iOS-style rounded
              top corners for consistent layering.
            </li>
            <li>
              <strong>Flow desktop artifact panel parity</strong> &mdash;
              Restored desktop artifacts panel behavior to the original
              right-column layout while keeping the new sheet behavior strictly
              mobile-only.
            </li>
            <li>
              <strong>Flow mobile artifact drawer top-anchor correction</strong>{" "}
              &mdash; Adjusted mobile drawer and backdrop offsets so the artifact
              panel starts directly beneath the app header instead of leaving a
              visible gap below the flow title bar.
            </li>
            <li>
              <strong>Flow mobile input focus zoom fix (iOS Safari)</strong>{" "}
              &mdash; Increased the mobile composer textarea font size to prevent
              Safari auto-zoom on focus, preserving the expected title bar and
              empty-state framing while typing.
            </li>
            <li>
              <strong>Encrypted-secret runtime handling</strong> &mdash; LLM
              and integration token consumers now transparently decrypt stored
              secrets before use, while preserving compatibility with existing
              plaintext records.
            </li>
            <li>
              <strong>Flow GTM spec-context formatting</strong> &mdash; Pipeline
              agents now normalize prior artifact outputs (including spec{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                {"{ markdown }"}
              </code>{" "}
              objects) before prompt interpolation, preventing{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                [object Object]
              </code>{" "}
              from leaking into GTM and downstream prompts.
            </li>
            <li>
              <strong>Gemini Flow-mode model retirement resilience</strong>{" "}
              &mdash; Replaced the retired{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                gemini-1.5-pro
              </code>{" "}
              default with current Gemini model candidates and added automatic
              fallback across supported models when Google returns
              model-not-found errors, preventing Flow-mode failures from stale
              hardcoded model IDs.
            </li>
            <li>
              <strong>Google login redirect mismatch hardening</strong>{" "}
              &mdash; Google sign-in now derives its OAuth callback URI from
              the active request host/proxy headers and carries that exact URI
              in signed OAuth state through callback token exchange, preventing
              stale environment URL drift from causing{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                redirect_uri_mismatch
              </code>{" "}
              during login.
            </li>
            <li>
              <strong>Flow quota error UX upgrade</strong> &mdash; Flow
              assistant messages now detect provider quota and rate-limit
              failures (including Gemini{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                429
              </code>{" "}
              responses) and render a structured error card with clear recovery
              actions, retry hints, and collapsible technical details instead
              of dumping raw API payloads inline.
            </li>
          </ul>

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
              <strong>Google integration OAuth redirect mismatch hardening</strong>{" "}
              &mdash; Google integration connect now derives callback URI from
              the live API host when{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                GOOGLE_REDIRECT_URI
              </code>{" "}
              is missing, stores it in signed OAuth state, and reuses that
              exact URI for token exchange to avoid{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                redirect_uri_mismatch
              </code>{" "}
              in production.
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
            <li>
              <strong>Gemini Flow-mode system_instruction payload fix</strong>{" "}
              &mdash; Gemini requests now send structured{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                systemInstruction
              </code>{" "}
              content (role + parts) instead of raw string passthrough in chat
              sessions, resolving{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                400 Bad Request
              </code>{" "}
              errors for Flow-mode prompts.
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
            <li>
              <strong>Landing Flow hero animation (product-matched UI)</strong>{" "}
              &mdash; Replaced the static hero screenshot with an animated
              Flow-mode sequence using app-native dark tokens and real
              chat/sidebar styling, so visitors can see orchestration progress
              and agent handoffs in action.
            </li>
            <li>
              <strong>Navbar text-wrap fix on landing hero</strong> &mdash;
              Prevented pill navbar items from shrinking into multi-line labels
              by enforcing non-wrapping link text and updating center-link
              breakpoints for tighter desktop/tablet behavior.
            </li>
            <li>
              <strong>Flow multi-agent triggers + alias support</strong>{" "}
              &mdash; Flow now dispatches all mentioned agent commands in one
              prompt (for example{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @Discover ... @Spec ...
              </code>
              ) and normalizes{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @Discover
              </code>{" "}
              to{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @Discovery
              </code>{" "}
              so both agents run as expected.
            </li>
            <li>
              <strong>Flow repo-connect fast path for @Code</strong> &mdash;{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @Code connect &lt;repo-url&gt;
              </code>{" "}
              now connects the repository and returns immediately with readiness
              guidance instead of launching a full inspection run.
            </li>
            <li>
              <strong>Flow composer remains usable while agents run</strong>{" "}
              &mdash; Sending agent commands no longer hard-disables the input
              area, allowing additional agent triggers while long-running jobs
              (like{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                @Code
              </code>
              ) are in progress.
            </li>
            <li>
              <strong>Integrations page now includes coding execution targets</strong>{" "}
              &mdash; Added a dedicated{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                Execution Targets
              </code>{" "}
              section for Cursor, Codex, and Claude Code so users can discover
              prompt handoff paths separately from OAuth data integrations.
            </li>
            <li>
              <strong>Landing integrations strip expanded to AI/coding stack</strong>{" "}
              &mdash; Updated landing-page integration surfaces to include
              Anthropic, OpenAI, Cursor, Codex, and Claude Code alongside data
              connectors so the public story matches actual handoff
              capabilities.
            </li>
            <li>
              <strong>
                Landing AI/coding integrations now use real brand marks
              </strong>{" "}
              &mdash; Replaced temporary fallback glyphs for Anthropic, OpenAI,
              Cursor, Codex, and Claude Code with official logo-based SVG
              icons in both landing integration surfaces.
            </li>
            <li>
              <strong>Discovery mode promoted on landing</strong> &mdash; Added
              a dedicated Discovery spotlight section, elevated Discovery to a
              top-tier feature card, and reordered deep-dive feature sequencing
              so signal intelligence is positioned as a core product strength.
            </li>
            <li>
              <strong>Landing mock screenshots switched to dark mode</strong>{" "}
              &mdash; Restyled Flow, Imagine, Discover, and Tools preview
              mockups with product-matched dark surfaces, borders, and contrast
              to remove bright white cards from the landing experience.
            </li>
            <li>
              <strong>Landing feature cards aligned to product theme</strong>{" "}
              &mdash; Refined mock screenshot styling to better match in-app
              dark UI tokens, removed non-functional
              &quot;Learn more&quot; links from feature deep-dives, and
              standardized feature subtitle accent color to avoid rainbow
              category labels.
            </li>
            <li>
              <strong>Landing screen frame spacing tightened</strong> &mdash;
              Reduced preview screen shell/wrapper padding to{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                p-2
              </code>{" "}
              across feature surfaces for a tighter, more product-accurate
              frame treatment.
            </li>
            <li>
              <strong>Landing preview border layering simplified</strong>{" "}
              &mdash; Removed extra outer preview wrappers so each feature
              screen uses a single frame instead of stacked borders.
            </li>
            <li>
              <strong>Legal Notice page updated for launch</strong> &mdash;
              Renamed the footer/legal label to &quot;Legal Notice&quot;,
              switched primary routing to{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                /legal-notice
              </code>{" "}
              (with{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                /imprint
              </code>{" "}
              redirect compatibility), and replaced the legal page body with the
              new English TMG/disclaimer text for blankk UG.
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
              <strong>Legal Compliance</strong> &mdash; Added Legal Notice (DDG
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
