import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { getAllProjects } from "@/lib/api";
import { TOOLS, type ToolBadge } from "@/lib/tool-registry";
import type { ProjectWithSessions } from "@product-os/shared";
import { ArrowRight, Blocks } from "lucide-react";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Record<ToolBadge, string> = {
  new: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "built-in": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  legacy: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const BADGE_LABELS: Record<ToolBadge, string> = {
  new: "New",
  "built-in": "Built-in",
  legacy: "Legacy",
};

export function ToolsPage() {
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
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-16 pt-20 md:pt-16">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Blocks className="w-5 h-5 text-purple-500" />
              </div>
              <h1 className="text-2xl md:text-4xl font-semibold tracking-tight">
                Tools
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Extend your product workflow with specialized tools and utilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.slug}
                  to={tool.to}
                  className="group rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-foreground/10"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-medium border",
                        BADGE_STYLES[tool.badge]
                      )}
                    >
                      {BADGE_LABELS[tool.badge]}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold mb-1.5">{tool.name}</h2>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {tool.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground group-hover:text-foreground group-hover:gap-2 transition-all">
                    Open
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
