import { cn } from "@/lib/utils";
import type { RoadmapItem } from "@product-os/shared";
import { LinkIcon } from "lucide-react";

interface QuarterInfo {
  key: string;
  label: string;
  year: number;
  quarter: number;
}

interface RoadmapTimelineRowProps {
  item: RoadmapItem;
  quarters: QuarterInfo[];
  onClick: () => void;
}

const STATUS_COLORS: Record<string, { bar: string; text: string }> = {
  backlog: { bar: "bg-muted-foreground/30", text: "text-muted-foreground" },
  planned: { bar: "bg-blue-500/70", text: "text-blue-500" },
  "in-progress": { bar: "bg-amber-500/70", text: "text-amber-500" },
  done: { bar: "bg-emerald-500/70", text: "text-emerald-500" },
};

const PRIORITY_DOTS: Record<string, string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-blue-400",
  high: "bg-amber-400",
  critical: "bg-red-500",
};

function getQuarterFromDate(dateStr: string): { year: number; quarter: number } {
  const d = new Date(dateStr);
  return { year: d.getFullYear(), quarter: Math.ceil((d.getMonth() + 1) / 3) };
}

function getQuarterIndex(quarters: QuarterInfo[], year: number, quarter: number): number {
  return quarters.findIndex((q) => q.year === year && q.quarter === quarter);
}

function getPositionInQuarter(dateStr: string): number {
  const d = new Date(dateStr);
  const month = d.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const dayInQuarter = (month - quarterStartMonth) * 30 + d.getDate();
  return Math.min(Math.max(dayInQuarter / 90, 0), 1);
}

export function RoadmapTimelineRow({ item, quarters, onClick }: RoadmapTimelineRowProps) {
  const colors = STATUS_COLORS[item.status] ?? STATUS_COLORS.backlog!;
  const priorityDot = PRIORITY_DOTS[item.priority] || PRIORITY_DOTS.medium;

  // Calculate bar position
  let startIdx = -1;
  let endIdx = -1;
  let startOffset = 0;
  let endOffset = 1;

  if (item.startDate && item.endDate) {
    const s = getQuarterFromDate(item.startDate!);
    const e = getQuarterFromDate(item.endDate!);
    startIdx = getQuarterIndex(quarters, s.year, s.quarter);
    endIdx = getQuarterIndex(quarters, e.year, e.quarter);
    startOffset = getPositionInQuarter(item.startDate!);
    endOffset = getPositionInQuarter(item.endDate!);
  } else if (item.targetQuarter) {
    const match = item.targetQuarter.match(/Q(\d)\s+(\d{4})/);
    if (match) {
      const q = parseInt(match[1]!);
      const y = parseInt(match[2]!);
      startIdx = getQuarterIndex(quarters, y, q);
      endIdx = startIdx;
      startOffset = 0;
      endOffset = 1;
    }
  }

  const hasBar = startIdx >= 0 && endIdx >= 0;

  return (
    <div
      className="group flex items-stretch border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors min-h-[48px]"
      onClick={onClick}
    >
      {/* Left label column */}
      <div className="w-48 flex-shrink-0 flex items-center gap-2 px-3 py-2 border-r border-border/50 sticky left-0 bg-card group-hover:bg-secondary/30 z-10">
        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", priorityDot)} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{item.title}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn("text-[10px] font-medium uppercase", colors.text)}>
              {item.status}
            </span>
            {item.linkedSessions && item.linkedSessions.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <LinkIcon className="w-2.5 h-2.5" />
                {item.linkedSessions.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quarter cells with bar */}
      <div className="flex flex-1 relative">
        {quarters.map((q, idx) => (
          <div
            key={q.key}
            className={cn(
              "w-[240px] flex-shrink-0 border-r border-border/30 relative",
              idx % 2 === 0 && "bg-muted/20"
            )}
          >
            {hasBar && idx >= startIdx && idx <= endIdx && (
              <div
                className={cn("absolute top-1/2 -translate-y-1/2 h-6 rounded", colors.bar)}
                style={{
                  left: idx === startIdx ? `${startOffset * 100}%` : "0%",
                  right: idx === endIdx ? `${(1 - endOffset) * 100}%` : "0%",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
