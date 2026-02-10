import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { saveOnboardingPreferences } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { UserPreferences, UserRole, AgentMode } from "@product-os/shared";
import {
  Zap,
  Code,
  Rocket,
  Compass,
  Scale,
  Bot,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FolderPlus,
  Lightbulb,
  CheckSquare,
  Square,
  ExternalLink,
} from "lucide-react";

// Step 1: Role cards
const ROLE_OPTIONS: Array<{
  value: UserRole;
  icon: typeof Zap;
  iconColor: string;
  title: string;
  description: string;
}> = [
  {
    value: "pm_automation",
    icon: Zap,
    iconColor: "bg-amber-500/10 text-amber-500",
    title: "Automate PM workflows",
    description: "Speed up specs, strategy docs, and GTM plans with AI agents that handle the heavy lifting.",
  },
  {
    value: "engineer_support",
    icon: Code,
    iconColor: "bg-blue-500/10 text-blue-500",
    title: "Engineering support",
    description: "Get structured specs and requirements from product ideas so your team can build with clarity.",
  },
  {
    value: "pm_builder",
    icon: Rocket,
    iconColor: "bg-purple-500/10 text-purple-500",
    title: "Build products faster",
    description: "Go from idea to actionable product plan in minutes, not days. Perfect for founders and solo PMs.",
  },
];

// Step 2: Agent mode cards
const AGENT_MODE_OPTIONS: Array<{
  value: AgentMode;
  icon: typeof Compass;
  iconColor: string;
  title: string;
  description: string;
  badge?: string;
}> = [
  {
    value: "guided",
    icon: Compass,
    iconColor: "bg-emerald-500/10 text-emerald-500",
    title: "Guided",
    description: "Agents ask for your input at every step. Maximum control over the output.",
  },
  {
    value: "balanced",
    icon: Scale,
    iconColor: "bg-blue-500/10 text-blue-500",
    title: "Balanced",
    description: "Agents work autonomously but pause for key decisions. Best of both worlds.",
    badge: "Recommended",
  },
  {
    value: "autonomous",
    icon: Bot,
    iconColor: "bg-purple-500/10 text-purple-500",
    title: "Autonomous",
    description: "Agents run end-to-end with minimal interruption. Review the final output.",
  },
];

// Step 3: Tool integrations
const TOOL_OPTIONS = [
  { name: "Jira", icon: "https://cdn.simpleicons.org/jira/0052CC" },
  { name: "Slack", icon: "https://cdn.simpleicons.org/slack/4A154B" },
  { name: "Notion", icon: "https://cdn.simpleicons.org/notion/000000" },
  { name: "Google Workspace", icon: "https://cdn.simpleicons.org/google/4285F4" },
  { name: "Linear", icon: "https://cdn.simpleicons.org/linear/5E6AD2" },
  { name: "Airtable", icon: "https://cdn.simpleicons.org/airtable/18BFFF" },
];

// Step 4: Framework toggles
const FRAMEWORK_OPTIONS: Array<{
  key: keyof NonNullable<UserPreferences["frameworks"]>;
  title: string;
  description: string;
}> = [
  {
    key: "jiraTaxonomy",
    title: "Jira taxonomy",
    description: "Structure outputs as Epics, Stories, and Tasks compatible with Jira.",
  },
  {
    key: "definitionOfDone",
    title: "Definition of Done",
    description: "Include acceptance criteria and done conditions in every spec.",
  },
  {
    key: "okrAlignment",
    title: "OKR alignment",
    description: "Map features to objectives and key results automatically.",
  },
  {
    key: "customTemplate",
    title: "Custom template",
    description: "Use your own spec template structure for agent outputs.",
  },
];

const TOTAL_STEPS = 5;

export function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({});

  const progress = (step / TOTAL_STEPS) * 100;

  const canContinue =
    step === 1 ? !!preferences.role :
    step === 2 ? !!preferences.agentMode :
    true;

  async function handleComplete(navigateTo: string) {
    setIsSubmitting(true);
    try {
      await saveOnboardingPreferences(preferences, true);
      await refreshUser();
      navigate(navigateTo, { replace: true });
    } catch (err) {
      console.error("Failed to save onboarding:", err);
      setIsSubmitting(false);
    }
  }

  async function handleSkip() {
    setIsSubmitting(true);
    try {
      await saveOnboardingPreferences({}, true);
      await refreshUser();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Failed to skip onboarding:", err);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-secondary">
        <div
          className="h-full bg-foreground rounded-r-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <Zap className="w-4 h-4 text-background" />
            </div>
            <span className="text-lg font-semibold">Product OS</span>
          </div>

          {/* Steps */}
          {step === 1 && (
            <StepContainer
              title="What brings you to Product OS?"
              subtitle="This helps us tailor the experience to your workflow."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {ROLE_OPTIONS.map((option) => (
                  <SelectionCard
                    key={option.value}
                    icon={option.icon}
                    iconColor={option.iconColor}
                    title={option.title}
                    description={option.description}
                    selected={preferences.role === option.value}
                    onClick={() => setPreferences((p) => ({ ...p, role: option.value }))}
                  />
                ))}
              </div>
            </StepContainer>
          )}

          {step === 2 && (
            <StepContainer
              title="How should your AI agents work?"
              subtitle="Choose how much autonomy the agents have. You can change this later."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {AGENT_MODE_OPTIONS.map((option) => (
                  <SelectionCard
                    key={option.value}
                    icon={option.icon}
                    iconColor={option.iconColor}
                    title={option.title}
                    description={option.description}
                    badge={option.badge}
                    selected={preferences.agentMode === option.value}
                    onClick={() => setPreferences((p) => ({ ...p, agentMode: option.value }))}
                  />
                ))}
              </div>
            </StepContainer>
          )}

          {step === 3 && (
            <StepContainer
              title="Connect your tools"
              subtitle="Pull in real data from the tools you already use. You can always do this later."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TOOL_OPTIONS.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => window.open("/settings", "_blank")}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-4 text-left",
                      "hover:bg-secondary/50 transition-colors"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <img src={tool.icon} alt={tool.name} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tool.name}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Opens Settings in a new tab to configure integrations
              </p>
            </StepContainer>
          )}

          {step === 4 && (
            <StepContainer
              title="Follow a framework?"
              subtitle="Enable structured output formats. All optional."
            >
              <div className="space-y-3">
                {FRAMEWORK_OPTIONS.map((fw) => {
                  const isActive = preferences.frameworks?.[fw.key] ?? false;
                  return (
                    <button
                      key={fw.key}
                      onClick={() =>
                        setPreferences((p) => ({
                          ...p,
                          frameworks: {
                            ...p.frameworks,
                            [fw.key]: !isActive,
                          },
                        }))
                      }
                      className={cn(
                        "w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                        isActive
                          ? "ring-2 ring-primary bg-primary/5 border-transparent"
                          : "hover:bg-secondary/50"
                      )}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isActive ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{fw.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{fw.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-4">
                These can be changed later in Settings
              </p>
            </StepContainer>
          )}

          {step === 5 && (
            <StepContainer
              title="You're all set!"
              subtitle="Choose your first action to get started."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ActionCard
                  icon={FolderPlus}
                  iconColor="bg-emerald-500/10 text-emerald-500"
                  title="Create a project"
                  description="Organize your ideas and specs into a project workspace."
                  loading={isSubmitting}
                  onClick={() => handleComplete("/")}
                />
                <ActionCard
                  icon={Lightbulb}
                  iconColor="bg-amber-500/10 text-amber-500"
                  title="Imagine a feature"
                  description="Describe an idea and let AI agents turn it into a full spec."
                  loading={isSubmitting}
                  onClick={() => handleComplete("/imagine")}
                />
                <ActionCard
                  icon={Compass}
                  iconColor="bg-blue-500/10 text-blue-500"
                  title="Discover opportunities"
                  description="Analyze signals from your tools to find what to build next."
                  loading={isSubmitting}
                  onClick={() => handleComplete("/discover")}
                />
              </div>
            </StepContainer>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <div>
              {step > 1 && step < 5 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>

            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip onboarding
            </button>

            <div>
              {step < 5 && (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canContinue}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors",
                    canContinue
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-secondary text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function StepContainer({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function SelectionCard({
  icon: Icon,
  iconColor,
  title,
  description,
  badge,
  selected,
  onClick,
}: {
  icon: typeof Zap;
  iconColor: string;
  title: string;
  description: string;
  badge?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center text-center rounded-xl border p-6 transition-all",
        selected
          ? "ring-2 ring-primary bg-primary/5 border-transparent"
          : "hover:bg-secondary/50"
      )}
    >
      {badge && (
        <span className="absolute top-3 right-3 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", iconColor)}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium mb-1">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

function ActionCard({
  icon: Icon,
  iconColor,
  title,
  description,
  loading,
  onClick,
}: {
  icon: typeof Zap;
  iconColor: string;
  title: string;
  description: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex flex-col items-center text-center rounded-xl border p-6 transition-all",
        "hover:bg-secondary/50 hover:border-foreground/20",
        loading && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", iconColor)}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
      </div>
      <p className="text-sm font-medium mb-1">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}
