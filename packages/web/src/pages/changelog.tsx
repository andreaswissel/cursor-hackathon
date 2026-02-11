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

          <h2 className="text-xl font-semibold mt-8 mb-4">2026-02-11</h2>

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
              <strong>Knowledge Sources</strong> &mdash; Project-scoped
              knowledge with inheritance and AI summarization
            </li>
            <li>
              <strong>Intercom Integration</strong> &mdash; Customer
              conversation sync adapter
            </li>
            <li>
              <strong>Privacy &amp; Compliance</strong> &mdash; Inline privacy
              policy, DPA, and subprocessors list
            </li>
            <li>
              <strong>Move-to-Team UI</strong> &mdash; Transfer projects between
              personal and team workspaces
            </li>
            <li>
              <strong>Flow chat menu</strong> &mdash; Replaced agent button row
              with + popup menu in chat thread
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
        </div>
      </main>
    </div>
  );
}
