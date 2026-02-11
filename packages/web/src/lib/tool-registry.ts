import { Map, FileText, Navigation, MessageSquareMore } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ToolBadge = "new" | "built-in" | "legacy";

export interface ToolDefinition {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  badge: ToolBadge;
  to: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    slug: "guided-tours",
    name: "Guided Tours",
    description: "Design step-by-step product tours that onboard users and highlight key features.",
    icon: Navigation,
    badge: "new",
    to: "/tools/guided-tours",
  },
  {
    slug: "feedback-forms",
    name: "Feedback Forms",
    description: "Create targeted feedback forms to capture user sentiment and feature requests.",
    icon: MessageSquareMore,
    badge: "new",
    to: "/tools/feedback-forms",
  },
  {
    slug: "documents",
    name: "Documents",
    description: "Upload a video and get structured documentation pieces you can review and refine.",
    icon: FileText,
    badge: "built-in",
    to: "/tools/documents",
  },
  {
    slug: "roadmap",
    name: "Roadmap",
    description: "Visualize and manage your product roadmap with drag-and-drop planning.",
    icon: Map,
    badge: "legacy",
    to: "/tools/roadmap",
  },
];
