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

function AppScreenshotMockup() {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Gradient glow behind */}
      <div className="absolute -inset-6 md:-inset-10 rounded-3xl bg-gradient-to-br from-blue-400/20 via-violet-400/20 to-amber-300/20 blur-2xl" />

      {/* Window chrome */}
      <div className="relative rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-gray-400 font-medium">
              Product OS
            </span>
          </div>
        </div>

        {/* Content area */}
        <div className="flex min-h-[280px] md:min-h-[380px]">
          {/* Sidebar — hidden on mobile */}
          <div className="hidden md:flex flex-col w-56 bg-gray-900 text-white p-3 shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 py-1.5 mb-4">
              <Zap className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold">Product OS</span>
            </div>

            {/* Nav items */}
            <div className="space-y-0.5 mb-4">
              {[
                { icon: Workflow, label: "Flow", active: true },
                { icon: Lightbulb, label: "Imagine", active: false },
                { icon: Compass, label: "Discover", active: false },
                { icon: Wrench, label: "Tools", active: false },
              ].map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
              ))}
            </div>

            {/* Project tree */}
            <div className="text-[10px] text-gray-500 uppercase tracking-wider px-2.5 mb-2">
              Projects
            </div>
            {["Onboarding Flow", "Mobile App v2", "Q2 Planning"].map((p) => (
              <div
                key={p}
                className="flex items-center gap-2 px-2.5 py-1 text-xs text-gray-400"
              >
                <Folder className="w-3 h-3" />
                {p}
              </div>
            ))}
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Chat header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Onboarding Flow
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 px-4 py-3 space-y-3 overflow-hidden">
              {/* Assistant message */}
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-violet-600" />
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600 leading-relaxed max-w-xs">
                  I've analyzed the competitive landscape. Here are 3
                  differentiation opportunities for your onboarding flow...
                </div>
              </div>

              {/* User message */}
              <div className="flex gap-2.5 justify-end">
                <div className="rounded-xl bg-gray-900 px-3 py-2 text-xs text-white leading-relaxed max-w-xs">
                  Focus on opportunity #2. Draft a spec.
                </div>
              </div>

              {/* Agent pills */}
              <div className="flex gap-1.5">
                {["@Strategy", "@Spec", "@GTM"].map((pill) => (
                  <span
                    key={pill}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            {/* Input bar */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                <Plus className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-400 flex-1">
                  Message agents...
                </span>
                <Send className="w-3.5 h-3.5 text-gray-400" />
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
        <span className="text-xs text-gray-400 flex-1">Message agents...</span>
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
      {/* Discovery card #1 */}
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
      {/* Discovery card #2 */}
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
      {/* Signal pills */}
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
    title: "Your AI copilot for product work",
    description:
      "Chat with specialized AI agents that understand product strategy, market research, and technical specs. They collaborate in real-time — just like your best PM, strategist, and writer rolled into one thread.",
    accent: "violet",
    icon: Workflow,
    preview: FlowMockup,
    gradient: "from-violet-50 to-purple-50",
    accentColor: "text-violet-600",
  },
  {
    id: "imagine",
    category: "Ideation Engine",
    title: "From napkin idea to validated spec in minutes",
    description:
      "Paste a product idea, customer feedback, or a rough brief. AI agents run discovery, competitive analysis, and strategy — then produce a spec you'd actually ship.",
    accent: "amber",
    icon: Lightbulb,
    preview: ImagineMockup,
    gradient: "from-amber-50 to-orange-50",
    accentColor: "text-amber-600",
  },
  {
    id: "discover",
    category: "Signal Intelligence",
    title: "Stop guessing what to build next",
    description:
      "Surface the highest-impact opportunities from your customer signals. AI ranks them by pain severity, frequency, and revenue potential — so you build what matters.",
    accent: "emerald",
    icon: Compass,
    preview: DiscoverMockup,
    gradient: "from-emerald-50 to-teal-50",
    accentColor: "text-emerald-600",
  },
  {
    id: "tools",
    category: "Productivity Suite",
    title: "Extend your workflow",
    description:
      "Generate guided product tours, feedback collection forms, living documents, and roadmaps. Every tool is designed to keep your product moving — not just documented.",
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
    title: "Describe your idea or paste customer feedback",
    description:
      "Drop in a rough idea, Slack thread, support ticket, or competitive intel. No templates required.",
    icon: MessageCircle,
  },
  {
    num: "02",
    title: "AI agents research, strategize, and write",
    description:
      "Specialized agents run discovery, competitive analysis, strategy, spec writing, and GTM planning — in parallel.",
    icon: Search,
  },
  {
    num: "03",
    title: "Ship a validated spec with GTM plan",
    description:
      "Get a structured output you can hand to engineering, marketing, and sales. Iterate in chat or export.",
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
    <div className="min-h-screen bg-white text-gray-900">
      {/* ─── Floating Pill Navbar ─── */}
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-full transition-all duration-500 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-lg shadow-black/5 border border-gray-200/60"
            : "bg-white/10 backdrop-blur-md border border-white/20"
        }`}
      >
        <div className="flex items-center gap-2 px-3">
          <Zap
            className={`w-4 h-4 transition-colors duration-500 ${
              scrolled ? "text-gray-900" : "text-white"
            }`}
          />
          <span
            className={`font-semibold text-sm tracking-tight transition-colors duration-500 ${
              scrolled ? "text-gray-900" : "text-white"
            }`}
          >
            Product OS
          </span>
        </div>

        {/* Center nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how-it-works" },
            { label: "Integrations", href: "#integrations" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors duration-500 ${
                scrolled
                  ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-1">
          <Link
            to="/login"
            className={`px-3 py-1.5 rounded-full text-sm transition-colors duration-500 ${
              scrolled
                ? "text-gray-600 hover:text-gray-900"
                : "text-white/70 hover:text-white"
            }`}
          >
            Sign in
          </Link>
          <Link
            to="/waitlist"
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-500 ${
              scrolled
                ? "bg-gray-900 text-white hover:bg-gray-800"
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
            "linear-gradient(180deg, #f9f8f6 0%, #f0f4f8 50%, #e8eef5 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Category pill */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 shadow-sm">
              <Zap className="w-3 h-3 text-blue-500" />
              AI-Powered Product Management
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-center text-gray-900 leading-[1.1] mb-6 max-w-4xl mx-auto">
            Build products that{" "}
            <em className="italic">actually matter</em>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-500 text-center max-w-2xl mx-auto mb-10 leading-relaxed">
            From napkin idea to validated spec in minutes. AI agents handle
            discovery, strategy, and spec writing — so you can focus on
            decisions that move the needle.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 md:mb-20">
            <Link
              to="/waitlist"
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-7 py-3 text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 text-gray-700 px-7 py-3 text-sm font-medium hover:bg-white hover:border-gray-400 transition-colors"
            >
              See how it works
            </a>
          </div>

          {/* App screenshot with parallax */}
          <div ref={parallax.ref} style={parallax.style}>
            <AppScreenshotMockup />
          </div>
        </div>
      </section>

      {/* ─── Social Proof Bar ─── */}
      <SocialProofBar />

      {/* ─── Feature Sections ─── */}
      <section id="features">
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
      <footer className="bg-[#f9f8f6] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-900">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">Product OS</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <Link
                to="/privacy"
                className="hover:text-gray-600 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="hover:text-gray-600 transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/imprint"
                className="hover:text-gray-600 transition-colors"
              >
                Imprint
              </Link>
              <Link
                to="/changelog"
                className="hover:text-gray-600 transition-colors"
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
    <section className="py-14 bg-white border-b border-gray-100">
      <div ref={fade.ref} style={fade.style} className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-8">
          Integrates with your favorite tools
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {INTEGRATIONS.map(({ name, icon: Icon }) => (
            <div
              key={name}
              className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity"
            >
              <Icon className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-500 font-medium">{name}</span>
            </div>
          ))}
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
        index % 2 === 0 ? "bg-white" : "bg-[#fafaf8]"
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
            <h3 className="font-display text-3xl md:text-4xl text-gray-900 leading-tight mb-4">
              {feature.title}
            </h3>
            <p className="text-gray-500 leading-relaxed max-w-md mb-6">
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
            <div
              className={`rounded-3xl bg-gradient-to-br ${feature.gradient} p-6 md:p-8`}
            >
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
    <section id="how-it-works" className="py-20 md:py-28 bg-[#f9f8f6]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div ref={headingFade.ref} style={headingFade.style} className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3 block">
            How it works
          </span>
          <h2 className="font-display text-3xl md:text-4xl text-gray-900 leading-tight mb-4">
            Three steps to shipping
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            From raw idea to validated product spec — no templates, no busywork.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <StaggerCard key={step.num} delay={i * 150}>
                <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 hover:shadow-lg hover:shadow-gray-200/50 transition-shadow duration-300 h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xs font-bold text-gray-300">
                      {step.num}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
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
    <section className="py-20 md:py-28 bg-white">
      <div
        ref={fade.ref}
        style={fade.style}
        className="max-w-4xl mx-auto px-4 sm:px-6 text-center"
      >
        <blockquote className="font-display text-2xl md:text-3xl lg:text-4xl text-gray-900 italic leading-snug mb-8">
          "Product OS replaced our entire spec-writing process. What used to
          take a week now takes an afternoon — and the output is better."
        </blockquote>
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500" />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Sarah Chen</p>
            <p className="text-xs text-gray-500">VP Product, TechCorp</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection() {
  const fade = useFadeIn<HTMLDivElement>();
  return (
    <section id="integrations" className="py-20 md:py-28 bg-[#f9f8f6]">
      <div
        ref={fade.ref}
        style={fade.style}
        className="max-w-6xl mx-auto px-4 sm:px-6 text-center"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 block">
          Integrations
        </span>
        <h2 className="font-display text-3xl md:text-4xl text-gray-900 leading-tight mb-4">
          Works with your stack
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto mb-12">
          Connect the tools you already use. Import data, sync outputs, and keep
          everything in one place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {INTEGRATIONS.map(({ name, icon: Icon }) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                <Icon className="w-5 h-5 text-gray-500" />
              </div>
              <span className="text-xs text-gray-500">{name}</span>
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
      className="py-20 md:py-28"
      style={{
        background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)",
      }}
    >
      <div
        ref={fade.ref}
        style={fade.style}
        className="max-w-6xl mx-auto px-4 sm:px-6 text-center"
      >
        <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-white leading-tight mb-4">
          Ready to build products that matter?
        </h2>
        <p className="text-white/80 mb-8 max-w-lg mx-auto text-lg">
          Join the beta and let AI agents handle the busywork while you focus on
          decisions that move the needle.
        </p>
        <Link
          to="/waitlist"
          className="inline-flex items-center gap-2 rounded-full bg-white text-gray-900 px-8 py-3.5 text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg shadow-blue-900/20"
        >
          Join the Waitlist
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-white/60 mt-4">
          Free $25 credits during beta. No credit card required.
        </p>
      </div>
    </section>
  );
}
