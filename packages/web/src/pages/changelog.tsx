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

          {/* Feb 12 */}
          <h2 className="text-xl font-semibold mt-8 mb-4">2026-02-12</h2>

          <h3 className="text-lg font-medium mt-6 mb-3">Features</h3>
          <ul className="list-disc pl-6 space-y-1">
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
