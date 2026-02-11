import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { getAllProjects } from "@/lib/api";
import type { ProjectWithSessions } from "@product-os/shared";
import {
  Workflow,
  Lightbulb,
  Blocks,
  Compass,
  ArrowRight,
  Bot,
  Send,
  Plus,
  MessageSquare,
  Route,
  BarChart3,
} from "lucide-react";

function FlowPreview() {
  return (
    <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 pointer-events-none select-none w-full md:w-72 shrink-0">
      {/* Assistant message */}
      <div className="flex gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3 h-3 text-violet-400" />
        </div>
        <div className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          How can I help you build today?
        </div>
      </div>
      {/* Agent pills */}
      <div className="flex gap-1.5 mb-3">
        {["@Strategy", "@Spec", "@GTM"].map((pill) => (
          <span
            key={pill}
            className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20"
          >
            {pill}
          </span>
        ))}
      </div>
      {/* Input bar */}
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
        <Plus className="w-3.5 h-3.5 text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground/40 flex-1">
          Message agents...
        </span>
        <Send className="w-3.5 h-3.5 text-muted-foreground/50" />
      </div>
    </div>
  );
}

function ImaginePreview() {
  return (
    <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 pointer-events-none select-none w-full md:w-72 shrink-0">
      {/* Textarea mockup */}
      <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-2 mb-3">
        <span className="text-xs text-muted-foreground/40">
          Describe your product idea...
        </span>
        <div className="h-6" />
      </div>
      {/* Context pills */}
      <div className="flex gap-1.5 mb-3">
        {["OKRs", "Feedback", "Market Data"].map((pill) => (
          <span
            key={pill}
            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
          >
            {pill}
          </span>
        ))}
      </div>
      {/* Launch button */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 px-3 py-1.5 text-xs text-amber-400">
          Launch Agents
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

function ToolsPreview() {
  return (
    <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 pointer-events-none select-none w-full md:w-72 shrink-0">
      <div className="grid grid-cols-2 gap-2">
        {/* Tool card 1 */}
        <div className="rounded-lg border border-border/50 bg-background/50 p-3 flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Route className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            Guided Tours
          </span>
        </div>
        {/* Tool card 2 */}
        <div className="rounded-lg border border-border/50 bg-background/50 p-3 flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            Feedback Forms
          </span>
        </div>
      </div>
    </div>
  );
}

function DiscoverPreview() {
  return (
    <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 pointer-events-none select-none w-full md:w-72 shrink-0">
      {/* Discovery card */}
      <div className="rounded-lg border border-border/50 bg-background/50 p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
            #1
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            Mobile onboarding flow
          </span>
        </div>
        {/* Score bar */}
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-3 h-3 text-emerald-400" />
          <div className="flex-1 h-1.5 rounded-full bg-secondary">
            <div className="h-full w-[85%] rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">85%</span>
        </div>
      </div>
      {/* Signal pills */}
      <div className="flex gap-1.5 flex-wrap">
        {["Pain Severity", "Money Quotes", "Frequency"].map((pill) => (
          <span
            key={pill}
            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          >
            {pill}
          </span>
        ))}
      </div>
    </div>
  );
}

const FEATURE_SECTIONS = [
  {
    title: "Flow",
    description:
      "Chat with AI agents to plan, build, and ship. The fastest way to go from idea to product.",
    icon: Workflow,
    to: "/flow",
    color: "text-violet-500",
    hoverBg: "hover:bg-violet-500/5",
    hoverBorder: "hover:border-violet-500/20",
    preview: FlowPreview,
  },
  {
    title: "Imagine",
    description:
      "Turn a product idea into a validated spec with AI agents that research, strategize, and write.",
    icon: Lightbulb,
    to: "/imagine",
    color: "text-amber-500",
    hoverBg: "hover:bg-amber-500/5",
    hoverBorder: "hover:border-amber-500/20",
    preview: ImaginePreview,
  },
  {
    title: "Tools",
    description:
      "Extend your workflow with guided tours, feedback forms, documents, and more.",
    icon: Blocks,
    to: "/tools",
    color: "text-purple-500",
    hoverBg: "hover:bg-purple-500/5",
    hoverBorder: "hover:border-purple-500/20",
    preview: ToolsPreview,
  },
  {
    title: "Discover",
    description:
      "AI-ranked opportunities from your customer signals. Find what to build next.",
    icon: Compass,
    to: "/discover",
    color: "text-emerald-500",
    hoverBg: "hover:bg-emerald-500/5",
    hoverBorder: "hover:border-emerald-500/20",
    preview: DiscoverPreview,
  },
] as const;

export function HomePage() {
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);

  const refreshProjects = () => {
    getAllProjects()
      .then(({ projects }) => setProjects(projects))
      .catch(console.error);
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar
        projects={projects}
        onProjectCreated={refreshProjects}
        onProjectDeleted={refreshProjects}
        onSessionDeleted={refreshProjects}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-16 pt-20 md:pt-16">
          <div className="mb-10">
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight mb-3">
              Welcome to Product OS
            </h1>
            <p className="text-lg text-muted-foreground">
              Your AI-powered product management platform. Choose a workflow to
              get started.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {FEATURE_SECTIONS.map((section) => {
              const Icon = section.icon;
              const Preview = section.preview;
              return (
                <Link
                  key={section.to}
                  to={section.to}
                  className={`group rounded-xl border border-border/50 p-6 md:p-8 transition-all ${section.hoverBg} ${section.hoverBorder} hover:shadow-md flex flex-col md:flex-row md:items-center gap-6`}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center mb-4`}
                    >
                      <Icon className={`w-5 h-5 ${section.color}`} />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">
                      {section.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      {section.description}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-sm font-medium ${section.color} group-hover:gap-2 transition-all`}
                    >
                      Get started
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                  <Preview />
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
