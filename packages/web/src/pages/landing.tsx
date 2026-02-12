import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import {
  JiraIcon,
  SlackIcon,
  NotionIcon,
  IntercomIcon,
  SalesforceIcon,
  GoogleIcon,
} from "@/components/provider-icons";

// ── Fade-in on scroll hook ──────────────────────────────────────────────────

function useFadeIn<T extends HTMLElement>() {
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
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, className: visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6", style: { transition: "opacity 0.6s ease-out, transform 0.6s ease-out" } };
}

// ── Mockup previews (enhanced from home page) ───────────────────────────────

function FlowMockup() {
  return (
    <div className="rounded-xl bg-secondary/30 border border-border/50 p-5 pointer-events-none select-none w-full max-w-md">
      {/* Assistant message */}
      <div className="flex gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="rounded-lg bg-secondary/60 px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
          I've analyzed the competitive landscape. Here are 3 differentiation opportunities for your onboarding flow...
        </div>
      </div>
      {/* User message */}
      <div className="flex gap-2.5 mb-4 justify-end">
        <div className="rounded-lg bg-violet-500/15 border border-violet-500/20 px-3.5 py-2.5 text-xs text-violet-300 leading-relaxed">
          Focus on opportunity #2. Draft a spec.
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
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2.5">
        <Plus className="w-3.5 h-3.5 text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground/40 flex-1">Message agents...</span>
        <Send className="w-3.5 h-3.5 text-muted-foreground/50" />
      </div>
    </div>
  );
}

function ImagineMockup() {
  return (
    <div className="rounded-xl bg-secondary/30 border border-border/50 p-5 pointer-events-none select-none w-full max-w-md">
      {/* Textarea mockup */}
      <div className="rounded-lg border border-border/50 bg-background/50 px-3.5 py-3 mb-3">
        <span className="text-xs text-muted-foreground/70">A mobile app that helps dog owners find pet-friendly restaurants and cafes nearby...</span>
        <div className="h-4" />
      </div>
      {/* Context pills */}
      <div className="flex gap-1.5 mb-3">
        {["OKRs", "Customer Feedback", "Market Data"].map((pill) => (
          <span
            key={pill}
            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
          >
            {pill}
          </span>
        ))}
      </div>
      {/* Agent pipeline */}
      <div className="flex items-center gap-1.5 mb-3">
        {["Discovery", "Strategy", "Spec", "GTM"].map((step, i) => (
          <div key={step} className="flex items-center gap-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${i === 0 ? "bg-amber-500/20 text-amber-400" : "bg-secondary/60 text-muted-foreground/50"}`}>
              {step}
            </span>
            {i < 3 && <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/30" />}
          </div>
        ))}
      </div>
      {/* Launch button */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 px-3.5 py-2 text-xs text-amber-400 font-medium">
          Launch Agents
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

function DiscoverMockup() {
  return (
    <div className="rounded-xl bg-secondary/30 border border-border/50 p-5 pointer-events-none select-none w-full max-w-md">
      {/* Discovery card #1 */}
      <div className="rounded-lg border border-border/50 bg-background/50 p-3 mb-2.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">#1</span>
          <span className="text-xs text-muted-foreground font-medium">Mobile onboarding flow</span>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3 h-3 text-emerald-400" />
          <div className="flex-1 h-1.5 rounded-full bg-secondary">
            <div className="h-full w-[85%] rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">85%</span>
        </div>
      </div>
      {/* Discovery card #2 */}
      <div className="rounded-lg border border-border/50 bg-background/50 p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">#2</span>
          <span className="text-xs text-muted-foreground font-medium">Slack integration sync</span>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3 h-3 text-emerald-400" />
          <div className="flex-1 h-1.5 rounded-full bg-secondary">
            <div className="h-full w-[72%] rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">72%</span>
        </div>
      </div>
      {/* Signal pills */}
      <div className="flex gap-1.5 flex-wrap">
        {["Pain Severity", "Money Quotes", "Frequency", "Reach"].map((pill) => (
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

function ToolsMockup() {
  return (
    <div className="rounded-xl bg-secondary/30 border border-border/50 p-5 pointer-events-none select-none w-full max-w-md">
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: Route, label: "Guided Tours" },
          { icon: MessageSquare, label: "Feedback Forms" },
          { icon: FileText, label: "Documents" },
          { icon: LayoutGrid, label: "Roadmap" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="rounded-lg border border-border/50 bg-background/50 p-3.5 flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Icon className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature sections ────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "flow",
    title: "Your AI copilot for product work",
    description:
      "Chat with specialized AI agents that understand product strategy, market research, and technical specs. They collaborate in real-time — just like your best PM, strategist, and writer rolled into one thread.",
    accent: "violet",
    icon: Workflow,
    preview: FlowMockup,
  },
  {
    id: "imagine",
    title: "From napkin idea to validated spec in minutes",
    description:
      "Paste a product idea, customer feedback, or a rough brief. AI agents run discovery, competitive analysis, and strategy — then produce a spec you'd actually ship.",
    accent: "amber",
    icon: Lightbulb,
    preview: ImagineMockup,
  },
  {
    id: "discover",
    title: "Stop guessing what to build next",
    description:
      "Surface the highest-impact opportunities from your customer signals. AI ranks them by pain severity, frequency, and revenue potential — so you build what matters.",
    accent: "emerald",
    icon: Compass,
    preview: DiscoverMockup,
  },
  {
    id: "tools",
    title: "Extend your workflow",
    description:
      "Generate guided product tours, feedback collection forms, living documents, and roadmaps. Every tool is designed to keep your product moving — not just documented.",
    accent: "purple",
    icon: Blocks,
    preview: ToolsMockup,
  },
] as const;

const ACCENT_CLASSES: Record<string, { icon: string; bg: string }> = {
  violet: { icon: "text-violet-500", bg: "bg-violet-500/10" },
  amber: { icon: "text-amber-500", bg: "bg-amber-500/10" },
  emerald: { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
  purple: { icon: "text-purple-500", bg: "bg-purple-500/10" },
};

// ── How it works steps ──────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: "Describe your idea or paste customer feedback",
    description: "Drop in a rough idea, Slack thread, support ticket, or competitive intel. No templates required.",
    icon: MessageCircle,
  },
  {
    num: "02",
    title: "AI agents research, strategize, and write",
    description: "Specialized agents run discovery, competitive analysis, strategy, spec writing, and GTM planning — in parallel.",
    icon: Search,
  },
  {
    num: "03",
    title: "Ship a validated spec with GTM plan",
    description: "Get a structured output you can hand to engineering, marketing, and sales. Iterate in chat or export.",
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
];

// ── Main component ──────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Sticky Nav ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-white" />
            <span className="font-semibold text-sm tracking-tight text-white">Product OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/waitlist"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Join the Waitlist
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
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
          href="#features"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/60 hover:text-white/90 transition-colors"
        >
          <span className="text-xs font-medium tracking-wide uppercase">Scroll</span>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </a>
      </section>

      {/* ─── Feature Showcase ─── */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {FEATURES.map((feature, idx) => {
            const Preview = feature.preview;
            const Icon = feature.icon;
            const colors = ACCENT_CLASSES[feature.accent] ?? { icon: "text-primary", bg: "bg-primary/10" };
            const isReversed = idx % 2 === 1;
            return (
              <FeatureRow key={feature.id} isReversed={isReversed}>
                <div className="flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed max-w-md">
                    {feature.description}
                  </p>
                </div>
                <div className="flex-1 flex justify-center">
                  <Preview />
                </div>
              </FeatureRow>
            );
          })}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <HowItWorks />

      {/* ─── Integrations ─── */}
      <IntegrationsSection />

      {/* ─── Final CTA ─── */}
      <FinalCTA />

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Product OS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/imprint" className="hover:text-foreground transition-colors">
              Imprint
            </Link>
            <Link to="/changelog" className="hover:text-foreground transition-colors">
              Changelog
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FeatureRow({
  isReversed,
  children,
}: {
  isReversed: boolean;
  children: React.ReactNode;
}) {
  const fade = useFadeIn<HTMLDivElement>();
  return (
    <div
      ref={fade.ref}
      className={`flex flex-col ${isReversed ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-10 md:gap-16 mb-20 md:mb-28 last:mb-0 ${fade.className}`}
      style={fade.style}
    >
      {children}
    </div>
  );
}

function HowItWorks() {
  const fade = useFadeIn<HTMLDivElement>();
  return (
    <section className="py-20 md:py-28 bg-secondary/30">
      <div
        ref={fade.ref}
        className={`max-w-6xl mx-auto px-4 sm:px-6 ${fade.className}`}
        style={fade.style}
      >
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            How it works
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Three steps from raw idea to shipped product spec.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="rounded-xl border border-border/50 bg-background p-6 md:p-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-muted-foreground/50">
                    {step.num}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                </div>
                <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection() {
  const fade = useFadeIn<HTMLDivElement>();
  return (
    <section className="py-20 md:py-28">
      <div
        ref={fade.ref}
        className={`max-w-6xl mx-auto px-4 sm:px-6 text-center ${fade.className}`}
        style={fade.style}
      >
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
          Works with your stack
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-12">
          Connect the tools you already use. Import data, sync outputs, and keep everything in one place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {INTEGRATIONS.map(({ name, icon: Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const fade = useFadeIn<HTMLDivElement>();
  return (
    <section className="py-20 md:py-28 bg-secondary/30">
      <div
        ref={fade.ref}
        className={`max-w-6xl mx-auto px-4 sm:px-6 text-center ${fade.className}`}
        style={fade.style}
      >
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
          Ready to build products that matter?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Join the beta and let AI agents handle the busywork while you focus on decisions that move the needle.
        </p>
        <Link
          to="/waitlist"
          className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-6 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          Join the Waitlist
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-muted-foreground mt-4">
          Free during beta. No credit card required.
        </p>
      </div>
    </section>
  );
}
