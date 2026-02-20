import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  ArrowRight,
  Bot,
  Send,
  Plus,
  MessageSquare,
  Route,
  BarChart3,
  Lightbulb,
  Workflow,
  Blocks,
  Compass,
  CheckCircle2,
  MessageCircle,
  FileText,
  Search,
  LayoutGrid,
  ChevronDown,
  Folder,
  Hash,
  Wrench,
} from "lucide-react";
import {
  JiraIcon,
  SlackIcon,
  NotionIcon,
  IntercomIcon,
  SalesforceIcon,
  GoogleIcon,
  AirtableIcon,
  LinearIcon,
} from "@/components/provider-icons";

// ── Enhanced fade-in on scroll hook ─────────────────────────────────────────

function useFadeIn<T extends HTMLElement>(
  options: {
    delay?: number;
    direction?: "up" | "left" | "right" | "scale";
  } = {}
) {
  const { delay = 0, direction = "up" } = options;
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hiddenTransform: Record<string, string> = {
    up: "translateY(30px)",
    left: "translateX(-40px)",
    right: "translateX(40px)",
    scale: "scale(0.95)",
  };

  return {
    ref,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : hiddenTransform[direction],
      transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    } as React.CSSProperties,
  };
}

// ── Parallax hook ───────────────────────────────────────────────────────────

function useParallax(speed = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const viewCenter = window.innerHeight / 2;
    setOffset((center - viewCenter) * speed);
  }, [speed]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return {
    ref,
    style: { transform: `translateY(${offset}px)` } as React.CSSProperties,
  };
}

// ── App screenshot mockup ───────────────────────────────────────────────────

type FlowHeroStep = {
  status: string;
  assistant: string;
  user: string;
  activeAgents: string[];
  progress: number;
};

const FLOW_HERO_STEPS: FlowHeroStep[] = [
  {
    status: "Discovery is clustering onboarding feedback...",
    assistant:
      "Discovery surfaced two high-impact drop-off points in activation. Want Strategy to rank the tradeoffs?",
    user: "@Strategy prioritize by activation lift and engineering effort.",
    activeAgents: ["@Discovery", "@Strategy"],
    progress: 28,
  },
  {
    status: "Strategy is scoring options against current OKRs...",
    assistant:
      "Strategy recommends Opportunity #2 first: fastest path to activation impact with manageable implementation risk.",
    user: "@Spec draft the implementation plan with acceptance criteria.",
    activeAgents: ["@Strategy", "@Spec"],
    progress: 54,
  },
  {
    status: "Spec is drafting implementation details and QA criteria...",
    assistant:
      "Spec drafted rollout phases, instrumentation events, and acceptance criteria. Should GTM prepare launch messaging?",
    user: "@GTM prepare launch narrative and internal enablement notes.",
    activeAgents: ["@Spec", "@GTM"],
    progress: 78,
  },
  {
    status: "Flow is packaging strategy + spec + GTM for execution...",
    assistant:
      "Flow packaged the plan into execution-ready artifacts. Engineering handoff, launch brief, and KPI tracker are ready.",
    user: "Open the execution checklist and assign owners.",
    activeAgents: ["@Discovery", "@Strategy", "@Spec", "@GTM"],
    progress: 100,
  },
];

const FLOW_HERO_NAV = [
  { icon: Workflow, label: "Flow", active: true },
  { icon: Lightbulb, label: "Imagine", active: false },
  { icon: Compass, label: "Discover", active: false },
  { icon: Wrench, label: "Tools", active: false },
];

const FLOW_HERO_PROJECTS = ["Onboarding Flow", "Mobile App v2", "Q2 Planning"];
const FLOW_HERO_AGENTS = ["@Discovery", "@Strategy", "@Spec", "@GTM"];

function AppScreenshotMockup() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % FLOW_HERO_STEPS.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, []);

  const step = FLOW_HERO_STEPS[activeStep] ?? FLOW_HERO_STEPS[0]!;

  return (
    <div className="dark relative w-full max-w-5xl mx-auto">
      {/* Gradient glow behind */}
      <div className="absolute -inset-6 md:-inset-10 rounded-3xl bg-gradient-to-br from-blue-500/25 via-indigo-500/25 to-emerald-400/20 blur-3xl" />

      {/* Window chrome */}
      <div className="relative rounded-2xl bg-card border border-border/80 shadow-[0_40px_120px_rgba(0,0,0,0.55)] overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-background/80 border-b border-border/80">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-muted-foreground font-medium">
              Product OS
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/70 bg-secondary/50 text-[10px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Flow mode live
          </div>
        </div>

        {/* Content area */}
        <div className="flex min-h-[320px] md:min-h-[420px] bg-background">
          {/* Sidebar — hidden on mobile */}
          <div className="hidden md:flex flex-col w-60 border-r border-border/80 bg-card p-3 shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 py-1.5 mb-4">
              <div className="w-6 h-6 rounded-md bg-foreground text-background flex items-center justify-center">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                Product OS
              </span>
            </div>

            {/* Nav items */}
            <div className="space-y-0.5 mb-4">
              {FLOW_HERO_NAV.map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
              ))}
            </div>

            {/* Project tree */}
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider px-2.5 mb-2">
              Projects
            </div>
            {FLOW_HERO_PROJECTS.map((p) => (
              <div
                key={p}
                className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md ${
                  p === "Onboarding Flow"
                    ? "text-foreground bg-secondary/50"
                    : "text-muted-foreground"
                }`}
              >
                <Folder className="w-3 h-3 opacity-80" />
                {p}
              </div>
            ))}
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col bg-background">
            {/* Chat header */}
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/80 bg-background/70">
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Onboarding Flow
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Route className="w-3 h-3" />
                Agent orchestration
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 px-4 py-3 md:px-5 md:py-4 space-y-3 overflow-hidden">
              <div
                key={`status-${activeStep}`}
                className="max-w-[84%] rounded-lg border border-border/60 bg-secondary/40 px-3 py-2"
                style={{ animation: "scale-in 380ms cubic-bezier(0.16,1,0.3,1)" }}
              >
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <MessageCircle className="w-3 h-3" />
                  <span>{step.status}</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                      style={{ animationDelay: "120ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                      style={{ animationDelay: "240ms" }}
                    />
                  </span>
                </div>
              </div>

              {/* Assistant message */}
              <div
                key={`assistant-${activeStep}`}
                className="flex gap-3 max-w-[86%]"
                style={{ animation: "float-up 420ms cubic-bezier(0.16,1,0.3,1)" }}
              >
                <div className="w-7 h-7 rounded-lg bg-secondary border border-border/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="rounded-xl bg-secondary border border-border/60 px-4 py-2.5 text-xs md:text-sm text-foreground leading-relaxed shadow-[0_1px_0_hsl(var(--foreground)/0.04)]">
                  {step.assistant}
                </div>
              </div>

              {/* User message */}
              <div
                key={`user-${activeStep}`}
                className="flex gap-3 max-w-[86%] ml-auto flex-row-reverse"
                style={{ animation: "slide-in-right 420ms cubic-bezier(0.16,1,0.3,1)" }}
              >
                <div className="w-7 h-7 rounded-lg bg-card border border-border/70 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-semibold text-foreground">
                  AW
                </div>
                <div className="rounded-xl bg-card/80 text-foreground border border-border/70 px-4 py-2.5 text-xs md:text-sm leading-relaxed shadow-[0_1px_0_hsl(var(--foreground)/0.04)]">
                  {step.user}
                </div>
              </div>

              {/* Agent pills */}
              <div className="flex flex-wrap gap-1.5 pl-10">
                {FLOW_HERO_AGENTS.map((agent) => {
                  const active = step.activeAgents.includes(agent);
                  return (
                    <span
                      key={agent}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        active
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
                          : "bg-secondary/60 text-muted-foreground border-border/60"
                      }`}
                    >
                      {agent}
                    </span>
                  );
                })}
              </div>

              <div className="pl-10 pr-3">
                <div className="h-1.5 rounded-full bg-secondary border border-border/60 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400/90 transition-all duration-700"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Flow run progress: {step.progress}%
                </div>
              </div>
            </div>

            {/* Input bar */}
            <div className="px-4 pb-3 md:px-5 md:pb-4">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-muted-foreground bg-secondary/70"
                  aria-label="Open agent menu"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  Orchestrate with @Discovery, @Strategy, @Spec, @GTM...
                </span>
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-foreground text-background"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Light-mode mockup previews ──────────────────────────────────────────────

function FlowMockup() {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 pointer-events-none select-none w-full max-w-md shadow-sm">
      {/* Assistant message */}
      <div className="flex gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-3.5 py-2.5 text-xs text-gray-600 leading-relaxed">
          I've analyzed the competitive landscape. Here are 3 differentiation
          opportunities for your onboarding flow...
        </div>
      </div>
      {/* User message */}
      <div className="flex gap-2.5 mb-4 justify-end">
        <div className="rounded-lg bg-gray-900 px-3.5 py-2.5 text-xs text-white leading-relaxed">
          Focus on opportunity #2. Draft a spec.
        </div>
      </div>
      {/* Agent pills */}
      <div className="flex gap-1.5 mb-3">
        {["@Strategy", "@Spec", "@GTM"].map((pill) => (
          <span
            key={pill}
            className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200"
          >
            {pill}
          </span>
        ))}
      </div>
      {/* Input bar */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
        <Plus className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-400 flex-1">
          Orchestrate with @Discovery, @Strategy, @Spec...
        </span>
        <Send className="w-3.5 h-3.5 text-gray-400" />
      </div>
    </div>
  );
}

function ImagineMockup() {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 pointer-events-none select-none w-full max-w-md shadow-sm">
      {/* Textarea mockup */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3 mb-3">
        <span className="text-xs text-gray-500">
          A mobile app that helps dog owners find pet-friendly restaurants and
          cafes nearby...
        </span>
        <div className="h-4" />
      </div>
      {/* Context pills */}
      <div className="flex gap-1.5 mb-3">
        {["OKRs", "Customer Feedback", "Market Data"].map((pill) => (
          <span
            key={pill}
            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200"
          >
            {pill}
          </span>
        ))}
      </div>
      {/* Agent pipeline */}
      <div className="flex items-center gap-1.5 mb-3">
        {["Discovery", "Strategy", "Spec", "GTM"].map((step, i) => (
          <div key={step} className="flex items-center gap-1.5">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                i === 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step}
            </span>
            {i < 3 && (
              <ArrowRight className="w-2.5 h-2.5 text-gray-300" />
            )}
          </div>
        ))}
      </div>
      {/* Launch button */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 border border-amber-200 px-3.5 py-2 text-xs text-amber-700 font-medium">
          Launch Agents
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

function DiscoverMockup() {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 pointer-events-none select-none w-full max-w-md shadow-sm">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 mb-2.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
            #1
          </span>
          <span className="text-xs text-gray-700 font-medium">
            Mobile onboarding flow
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3 h-3 text-emerald-600" />
          <div className="flex-1 h-1.5 rounded-full bg-gray-200">
            <div className="h-full w-[85%] rounded-full bg-emerald-500" />
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">85%</span>
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
            #2
          </span>
          <span className="text-xs text-gray-700 font-medium">
            Slack integration sync
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3 h-3 text-emerald-600" />
          <div className="flex-1 h-1.5 rounded-full bg-gray-200">
            <div className="h-full w-[72%] rounded-full bg-emerald-500" />
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">72%</span>
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {["Pain Severity", "Money Quotes", "Frequency", "Reach"].map(
          (pill) => (
            <span
              key={pill}
              className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200"
            >
              {pill}
            </span>
          )
        )}
      </div>
    </div>
  );
}

function ToolsMockup() {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 pointer-events-none select-none w-full max-w-md shadow-sm">
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: Route, label: "Guided Tours" },
          { icon: MessageSquare, label: "Feedback Forms" },
          { icon: FileText, label: "Documents" },
          { icon: LayoutGrid, label: "Roadmap" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 flex flex-col items-center gap-2"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <Icon className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <span className="text-[10px] text-gray-600 font-medium">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature sections data ───────────────────────────────────────────────────

const FEATURES = [
  {
    id: "flow",
    category: "Conversational AI",
    title: "Flow mode: orchestrate product agents in one thread",
    description:
      "Use @Discovery, @Strategy, @Spec, and @GTM in a single conversation. Instead of coordinating people across tools, you orchestrate agents inside one system.",
    accent: "violet",
    icon: Workflow,
    preview: FlowMockup,
    gradient: "from-violet-50 to-purple-50",
    accentColor: "text-violet-600",
  },
  {
    id: "imagine",
    category: "Ideation Engine",
    title: "From rough idea to shippable spec",
    description:
      "Paste a product idea, customer feedback, or a rough brief. AI agents run discovery, competitive analysis, and strategy — then produce a spec you can hand straight to engineering.",
    accent: "amber",
    icon: Lightbulb,
    preview: ImagineMockup,
    gradient: "from-amber-50 to-orange-50",
    accentColor: "text-amber-600",
  },
  {
    id: "discover",
    category: "Signal Intelligence",
    title: "Know exactly what to build next",
    description:
      "Surface the highest-impact opportunities from your customer signals. AI ranks them by pain severity, frequency, and revenue potential — so you never waste a sprint.",
    accent: "emerald",
    icon: Compass,
    preview: DiscoverMockup,
    gradient: "from-emerald-50 to-teal-50",
    accentColor: "text-emerald-600",
  },
  {
    id: "tools",
    category: "Productivity Suite",
    title: "Every tool a PM needs, built in",
    description:
      "Generate guided product tours, feedback collection forms, living documents, and roadmaps. Everything is designed to keep your product moving — not just documented.",
    accent: "purple",
    icon: Blocks,
    preview: ToolsMockup,
    gradient: "from-purple-50 to-pink-50",
    accentColor: "text-purple-600",
  },
] as const;

// ── How it works steps ──────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: "Give one input",
    description:
      "Start with an idea, customer feedback, support notes, or market signals. No rigid templates or setup.",
    icon: MessageCircle,
  },
  {
    num: "02",
    title: "Agents orchestrate the product workflow",
    description:
      "Product OS runs discovery, strategy, specs, and execution planning in one coordinated pipeline.",
    icon: Search,
  },
  {
    num: "03",
    title: "Ship from one session",
    description:
      "Get outputs your team can execute immediately. A week of coordination collapses into one working session.",
    icon: CheckCircle2,
  },
];

// ── Integration icons ───────────────────────────────────────────────────────

const INTEGRATIONS = [
  { name: "Jira", icon: JiraIcon },
  { name: "Slack", icon: SlackIcon },
  { name: "Notion", icon: NotionIcon },
  { name: "Intercom", icon: IntercomIcon },
  { name: "Salesforce", icon: SalesforceIcon },
  { name: "Google", icon: GoogleIcon },
  { name: "Linear", icon: LinearIcon },
  { name: "Airtable", icon: AirtableIcon },
];

// ── Stagger card wrapper ────────────────────────────────────────────────────

function StaggerCard({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  const fade = useFadeIn<HTMLDivElement>({ delay, direction: "up" });
  return (
    <div ref={fade.ref} style={fade.style}>
      {children}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const parallax = useParallax(0.06);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ─── Floating Pill Navbar ─── */}
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex max-w-[calc(100vw-2rem)] flex-nowrap items-center gap-1 px-2 py-1.5 rounded-full transition-all duration-500 ${
          scrolled
            ? "bg-[#0a0a0a]/90 backdrop-blur-xl shadow-lg shadow-black/20 border border-gray-800/60"
            : "bg-white/10 backdrop-blur-md border border-white/20"
        }`}
      >
        <div className="flex shrink-0 items-center gap-2 px-3">
          <Zap
            className={`w-4 h-4 transition-colors duration-500 ${
              scrolled ? "text-white" : "text-white"
            }`}
          />
          <span
            className={`whitespace-nowrap font-semibold text-sm tracking-tight transition-colors duration-500 ${
              scrolled ? "text-white" : "text-white"
            }`}
          >
            Product OS
          </span>
        </div>

        {/* Center nav links — hidden on mobile */}
        <div className="hidden lg:flex items-center gap-1">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how-it-works" },
            { label: "Integrations", href: "#integrations" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-sm transition-colors duration-500 ${
                scrolled
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="ml-1 flex shrink-0 items-center gap-1.5">
          <Link
            to="/login"
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm transition-colors duration-500 ${
              scrolled
                ? "text-gray-400 hover:text-white"
                : "text-white/70 hover:text-white"
            }`}
          >
            Sign in
          </Link>
          <Link
            to="/waitlist"
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-500 ${
              scrolled
                ? "bg-white text-gray-900 hover:bg-gray-200"
                : "bg-white text-gray-900 hover:bg-white/90"
            }`}
          >
            Join Waitlist
          </Link>
        </div>
      </nav>

      {/* ─── Full-screen Video Hero ─── */}
      <section className="relative h-screen w-full overflow-hidden bg-black">
        <video
          ref={(el) => {
            if (!el) return;
            el.play().catch(() => {});
            el.addEventListener("ended", () => {
              el.currentTime = 0;
              el.play().catch(() => {});
            });
          }}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero-animation.webm" type="video/webm" />
          <source src="/hero-animation.mp4" type="video/mp4" />
        </video>

        {/* Scroll indicator */}
        <a
          href="#second-hero"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/60 hover:text-white/90 transition-colors"
        >
          <span className="text-xs font-medium tracking-wide uppercase">
            Scroll
          </span>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </a>
      </section>

      {/* ─── Second Hero Section ─── */}
      <section
        id="second-hero"
        className="relative py-20 md:py-28 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #111111 0%, #0e0e0e 50%, #0a0a0a 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Category pill */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-gray-700 text-xs font-medium text-gray-300 shadow-sm">
              <Zap className="w-3 h-3 text-blue-500" />
              ProductOS — Built for Product, Loved by Development
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-center text-white leading-[1.1] mb-6 max-w-4xl mx-auto">
            Coding went agentic.
            <br />
            Product didn't, until now.
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-400 text-center max-w-2xl mx-auto mb-10 leading-relaxed">
            AI transformed coding, but product work stayed manual: discovery
            docs, strategy decks, ticket ping-pong, and endless alignment loops.
            Product OS brings the agentic shift to product work itself.
          </p>
          <p className="text-base md:text-lg text-gray-500 text-center max-w-3xl mx-auto mb-10 leading-relaxed">
            You give one input. Agents orchestrate discovery, strategy, specs,
            and execution. If coding got 10x faster, product should too.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 md:mb-20">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white text-gray-900 px-7 py-3 text-sm font-medium hover:bg-gray-200 transition-colors shadow-lg shadow-black/30"
            >
              Try Demo Modes
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/waitlist"
              className="inline-flex items-center gap-2 rounded-full border border-gray-600 text-gray-300 px-7 py-3 text-sm font-medium hover:bg-white/10 hover:border-gray-500 transition-colors"
            >
              Join Waitlist
            </Link>
          </div>

          {/* App screenshot with parallax */}
          <div ref={parallax.ref} style={parallax.style}>
            <AppScreenshotMockup />
          </div>
        </div>
      </section>

      {/* ─── Social Proof Bar ─── */}
      <SocialProofBar />

      {/* ─── Bento Feature Grid ─── */}
      <BentoFeatures />

      {/* ─── Feature Deep Dives ─── */}
      <section>
        {FEATURES.map((feature, idx) => (
          <FeatureSection key={feature.id} feature={feature} index={idx} />
        ))}
      </section>

      {/* ─── How It Works ─── */}
      <HowItWorks />

      {/* ─── Testimonial ─── */}
      <TestimonialSection />

      {/* ─── Integrations ─── */}
      <IntegrationsSection />

      {/* ─── Final CTA ─── */}
      <FinalCTA />

      {/* ─── Footer ─── */}
      <footer className="bg-[#111111] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl bg-[#1a1a1a] border border-gray-800 shadow-sm px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">Product OS</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <Link
                to="/privacy"
                className="hover:text-gray-300 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="hover:text-gray-300 transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/imprint"
                className="hover:text-gray-300 transition-colors"
              >
                Imprint
              </Link>
              <Link
                to="/changelog"
                className="hover:text-gray-300 transition-colors"
              >
                Changelog
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SocialProofBar() {
  const fade = useFadeIn<HTMLDivElement>({ direction: "up" });
  return (
    <section className="py-14 bg-[#0a0a0a] border-b border-gray-800/50">
      <div ref={fade.ref} style={fade.style} className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-8">
          Built to integrate with your existing stack
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {INTEGRATIONS.map(({ name, icon: Icon }) => (
            <div
              key={name}
              className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity"
            >
              <Icon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-400 font-medium">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoFeatures() {
  const headingFade = useFadeIn<HTMLDivElement>();
  return (
    <section id="features" className="py-20 md:py-28 bg-[#111111]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div ref={headingFade.ref} style={headingFade.style} className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 block">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-white leading-tight mb-4">
            Product work finally goes agentic
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Flow mode coordinates specialist product agents in one system, so
            you spend less time aligning and more time shipping.
          </p>
        </div>

        {/* Row 1 — Two large cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <StaggerCard delay={0}>
            <div className="rounded-2xl bg-[#1a1a1a] p-8 md:p-10 h-full flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4">
                Flow mode is your agentic control plane
              </h3>
              <div className="flex-1 flex items-center justify-center py-4">
                <FlowMockup />
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-white mb-1">Flow</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Call specialist agents with @commands, keep context in one
                  thread, and orchestrate product decisions end-to-end.
                </p>
              </div>
            </div>
          </StaggerCard>

          <StaggerCard delay={100}>
            <div className="rounded-2xl bg-[#1a1a1a] p-8 md:p-10 h-full flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4">
                One prompt, full product package
              </h3>
              <div className="flex-1 flex items-center justify-center py-4">
                <ImagineMockup />
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-white mb-1">Imagine</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Start from rough context and get structured output for
                  planning, building, and launch communication.
                </p>
              </div>
            </div>
          </StaggerCard>
        </div>

        {/* Row 2 — Three smaller icon cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StaggerCard delay={200}>
            <div className="rounded-2xl bg-[#1a1a1a] p-8 md:p-10 h-full">
              <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-5">
                <Compass className="w-5 h-5 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                Prioritize what matters
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Rank opportunities by severity, frequency, and business impact
                so roadmap calls are evidence-based.
              </p>
            </div>
          </StaggerCard>

          <StaggerCard delay={300}>
            <div className="rounded-2xl bg-[#1a1a1a] p-8 md:p-10 h-full">
              <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-5">
                <Blocks className="w-5 h-5 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                Execution artifacts included
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Generate docs, feedback forms, tours, and roadmaps from the
                same working context.
              </p>
            </div>
          </StaggerCard>

          <StaggerCard delay={400}>
            <div className="rounded-2xl bg-[#1a1a1a] p-8 md:p-10 h-full">
              <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-5">
                <Zap className="w-5 h-5 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                Integrations rolling out
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Demo modes are open now. Join the waitlist to unlock private
                workspace integrations as rollout expands.
              </p>
            </div>
          </StaggerCard>
        </div>
      </div>
    </section>
  );
}

function FeatureSection({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const isReversed = index % 2 === 1;
  const Preview = feature.preview;
  const direction = isReversed ? "right" : "left";
  const textFade = useFadeIn<HTMLDivElement>({
    direction: isReversed ? "left" : "right",
  });
  const previewFade = useFadeIn<HTMLDivElement>({ direction, delay: 150 });

  return (
    <section
      className={`py-20 md:py-28 ${
        index % 2 === 0 ? "bg-[#0a0a0a]" : "bg-[#0f0f0f]"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div
          className={`flex flex-col ${
            isReversed ? "md:flex-row-reverse" : "md:flex-row"
          } items-center gap-12 md:gap-16`}
        >
          {/* Text side */}
          <div ref={textFade.ref} style={textFade.style} className="flex-1 min-w-0">
            <span
              className={`text-xs font-semibold uppercase tracking-widest ${feature.accentColor} mb-3 block`}
            >
              {feature.category}
            </span>
            <h3 className="text-3xl md:text-4xl font-semibold text-white leading-tight mb-4">
              {feature.title}
            </h3>
            <p className="text-gray-400 leading-relaxed max-w-md mb-6">
              {feature.description}
            </p>
            <a
              href="#"
              className={`inline-flex items-center gap-1.5 text-sm font-medium ${feature.accentColor} hover:underline`}
            >
              Learn more
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Preview side */}
          <div ref={previewFade.ref} style={previewFade.style} className="flex-1 flex justify-center">
            <div className="rounded-2xl bg-[#1a1a1a] p-6 md:p-8">
              <Preview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const headingFade = useFadeIn<HTMLDivElement>();
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-[#111111]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div ref={headingFade.ref} style={headingFade.style} className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3 block">
            How it works
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-white leading-tight mb-4">
            How Flow mode works
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Instead of coordinating people across tools, orchestrate agents
            inside one system.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <StaggerCard key={step.num} delay={i * 150}>
                <div className="rounded-2xl border border-gray-800 bg-[#1a1a1a] p-6 md:p-8 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-300 h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xs font-bold text-gray-600">
                      {step.num}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#2a2a2a] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </StaggerCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  const fade = useFadeIn<HTMLDivElement>({ direction: "scale" });
  return (
    <section className="py-20 md:py-28 bg-[#0a0a0a]">
      <div
        ref={fade.ref}
        style={fade.style}
        className="max-w-4xl mx-auto px-4 sm:px-6 text-center"
      >
        <blockquote className="text-2xl md:text-3xl lg:text-4xl text-white italic leading-snug mb-8">
          "Product OS eliminated the busywork that used to eat our sprints. Now
          I focus on decisions that actually move the needle."
        </blockquote>
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Sarah Chen</p>
            <p className="text-xs text-gray-400">VP Product, TechCorp</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection() {
  const fade = useFadeIn<HTMLDivElement>();
  return (
    <section id="integrations" className="py-20 md:py-28 bg-[#111111]">
      <div
        ref={fade.ref}
        style={fade.style}
        className="max-w-6xl mx-auto px-4 sm:px-6 text-center"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 block">
          Integrations
        </span>
        <h2 className="text-3xl md:text-4xl font-semibold text-white leading-tight mb-4">
          Integrations are in phased rollout
        </h2>
        <p className="text-gray-400 max-w-lg mx-auto mb-12">
          You can use all demo modes right now. Join the waitlist to unlock
          private integrations for Jira, Slack, Notion, Linear, and more.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {INTEGRATIONS.map(({ name, icon: Icon }) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-gray-800 shadow-sm flex items-center justify-center">
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <span className="text-xs text-gray-400">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const fade = useFadeIn<HTMLDivElement>({ direction: "scale" });
  return (
    <section
      className="py-20 md:py-28 bg-[#111111]"
    >
      <div
        ref={fade.ref}
        style={fade.style}
        className="max-w-6xl mx-auto px-4 sm:px-6 text-center"
      >
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
          A week of product coordination, collapsed into one session.
        </h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto text-lg">
          Coding went agentic. Product should too. Try Flow mode now, then join
          the waitlist for full integration access.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-white text-gray-900 px-8 py-3.5 text-sm font-semibold hover:bg-gray-200 transition-colors shadow-lg shadow-black/30"
          >
            Open Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 rounded-full border border-gray-600 text-gray-300 px-8 py-3.5 text-sm font-semibold hover:bg-white/10 hover:border-gray-500 transition-colors"
          >
            Join Waitlist
          </Link>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Demo modes are available now. Private integrations are waitlist-only.
        </p>
      </div>
    </section>
  );
}
