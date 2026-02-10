import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DiscoveryCluster } from "@product-os/shared";
import {
  TrendingUp,
  Flame,
  DollarSign,
  Clock,
  Quote,
  ChevronDown,
  Hash,
  ArrowRight,
} from "lucide-react";

interface DiscoveryCardProps {
  cluster: DiscoveryCluster;
  rank: number;
  onStartSession?: (cluster: DiscoveryCluster) => void;
}

const RANK_COLORS: Record<number, string> = {
  1: "bg-amber-500 text-white",
  2: "bg-zinc-400 text-white",
  3: "bg-amber-700 text-white",
};

export function DiscoveryCard({ cluster, rank, onStartSession }: DiscoveryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const rankColor = RANK_COLORS[rank] ?? "bg-secondary text-muted-foreground";

  return (
    <div className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
      {/* Header: rank + score */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold flex-shrink-0",
              rankColor
            )}
          >
            {rank}
          </span>
          <h3 className="font-semibold text-sm leading-snug">
            {cluster.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-medium text-muted-foreground">
            Score
          </span>
          <span className="text-sm font-bold">{cluster.compositeScore}</span>
        </div>
      </div>

      {/* Score progress bar */}
      <div className="w-full h-1.5 bg-secondary rounded-full mb-4">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            cluster.compositeScore >= 80
              ? "bg-emerald-500"
              : cluster.compositeScore >= 50
                ? "bg-amber-500"
                : "bg-muted-foreground"
          )}
          style={{ width: `${cluster.compositeScore}%` }}
        />
      </div>

      {/* Feature suggestion */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {cluster.featureSuggestion}
      </p>

      {/* Score breakdown pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-secondary text-muted-foreground">
          <Hash className="w-3 h-3" />
          {cluster.signalCount} signals
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-secondary text-muted-foreground">
          <Flame className="w-3 h-3" />
          Pain {cluster.painSeverity}/10
        </span>
        {cluster.hasMoneyQuotes && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-500/10 text-amber-600">
            <DollarSign className="w-3 h-3" />
            Money quotes
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-secondary text-muted-foreground">
          <Clock className="w-3 h-3" />
          Recency {cluster.recencyScore}%
        </span>
      </div>

      {/* Sources */}
      {cluster.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {cluster.sources.map((source, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded bg-primary/10 text-primary"
            >
              {source}
            </span>
          ))}
        </div>
      )}

      {/* CTA button */}
      {onStartSession && (
        <button
          onClick={() => onStartSession(cluster)}
          className="inline-flex items-center gap-2 w-full justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors mb-3"
        >
          Work on this
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-1"
      >
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform",
            isExpanded && "rotate-180"
          )}
        />
        {isExpanded ? "Hide details" : "Show details"}
      </button>

      {/* Expanded section */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {/* Summary */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Summary
            </h4>
            <p className="text-sm leading-relaxed">{cluster.summary}</p>
          </div>

          {/* Money quotes */}
          {cluster.moneyQuotes.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Quote className="w-3 h-3" />
                Money Quotes
              </h4>
              <div className="space-y-2">
                {cluster.moneyQuotes.map((quote, i) => (
                  <div
                    key={i}
                    className="text-sm italic border-l-2 border-amber-500 pl-3 py-1 text-muted-foreground"
                  >
                    "{quote}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample signals */}
          {cluster.sampleSignals.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                Sample Signals
              </h4>
              <ul className="space-y-1.5">
                {cluster.sampleSignals.map((signal, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground pl-3 border-l border-border"
                  >
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
