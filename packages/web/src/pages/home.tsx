import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { getAllProjects } from "@/lib/api";
import type { ProjectWithSessions } from "@product-os/shared";
import { Lightbulb, Video, Compass, ArrowRight } from "lucide-react";

const CTA_CARDS = [
  {
    title: "Imagine",
    description: "Turn a product idea into a validated spec with AI agents that research, strategize, and write.",
    icon: Lightbulb,
    to: "/imagine",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    title: "Document",
    description: "Upload a video and get structured documentation pieces you can review and refine.",
    icon: Video,
    to: "/document",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    title: "Discover",
    description: "AI-ranked opportunities from your customer signals. Find what to build next.",
    icon: Compass,
    to: "/discover",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
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
      <Sidebar projects={projects} onProjectCreated={refreshProjects} onProjectDeleted={refreshProjects} onSessionDeleted={refreshProjects} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-16 pt-20 md:pt-16">
          <div className="mb-10">
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight mb-3">
              Welcome to Product OS
            </h1>
            <p className="text-lg text-muted-foreground">
              Your AI-powered product management platform. Choose a workflow to get started.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CTA_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.to}
                  to={card.to}
                  className={`group rounded-xl border ${card.border} ${card.bg} p-6 transition-all hover:shadow-md hover:scale-[1.02]`}
                >
                  <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <h2 className="text-lg font-semibold mb-2">{card.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {card.description}
                  </p>
                  <span className={`inline-flex items-center gap-1 text-sm font-medium ${card.color} group-hover:gap-2 transition-all`}>
                    Get started
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
