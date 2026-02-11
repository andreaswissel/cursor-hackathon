import { useMemo } from "react";
import type { RoadmapItem, RoadmapItemStatus } from "@product-os/shared";
import { RoadmapTimelineRow } from "./roadmap-timeline-row";

interface QuarterInfo {
  key: string;
  label: string;
  year: number;
  quarter: number;
}

interface RoadmapTimelineProps {
  items: RoadmapItem[];
  statusFilter: RoadmapItemStatus | "all";
  onItemClick: (item: RoadmapItem) => void;
}

function generateQuarters(items: RoadmapItem[]): QuarterInfo[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

  let minYear = currentYear;
  let minQ = currentQuarter;
  let maxYear = currentYear;
  let maxQ = currentQuarter;

  for (const item of items) {
    if (item.startDate) {
      const d = new Date(item.startDate);
      const y = d.getFullYear();
      const q = Math.ceil((d.getMonth() + 1) / 3);
      if (y < minYear || (y === minYear && q < minQ)) {
        minYear = y;
        minQ = q;
      }
    }
    if (item.endDate) {
      const d = new Date(item.endDate);
      const y = d.getFullYear();
      const q = Math.ceil((d.getMonth() + 1) / 3);
      if (y > maxYear || (y === maxYear && q > maxQ)) {
        maxYear = y;
        maxQ = q;
      }
    }
    if (item.targetQuarter) {
      const match = item.targetQuarter.match(/Q(\d)\s+(\d{4})/);
      if (match) {
        const q = parseInt(match[1]!);
        const y = parseInt(match[2]!);
        if (y < minYear || (y === minYear && q < minQ)) {
          minYear = y;
          minQ = q;
        }
        if (y > maxYear || (y === maxYear && q > maxQ)) {
          maxYear = y;
          maxQ = q;
        }
      }
    }
  }

  // Pad 1 quarter before and 2 after
  if (minQ <= 1) {
    minQ = 4;
    minYear -= 1;
  } else {
    minQ -= 1;
  }

  for (let i = 0; i < 2; i++) {
    if (maxQ >= 4) {
      maxQ = 1;
      maxYear += 1;
    } else {
      maxQ += 1;
    }
  }

  const quarters: QuarterInfo[] = [];
  let y = minYear;
  let q = minQ;
  while (y < maxYear || (y === maxYear && q <= maxQ)) {
    quarters.push({
      key: `${y}-Q${q}`,
      label: `Q${q} ${y}`,
      year: y,
      quarter: q,
    });
    if (q >= 4) {
      q = 1;
      y += 1;
    } else {
      q += 1;
    }
  }

  // Minimum 4 quarters
  while (quarters.length < 4) {
    const last = quarters[quarters.length - 1]!;
    const nextQ = last.quarter >= 4 ? 1 : last.quarter + 1;
    const nextY = last.quarter >= 4 ? last.year + 1 : last.year;
    quarters.push({
      key: `${nextY}-Q${nextQ}`,
      label: `Q${nextQ} ${nextY}`,
      year: nextY,
      quarter: nextQ,
    });
  }

  return quarters;
}

export function RoadmapTimeline({ items, statusFilter, onItemClick }: RoadmapTimelineProps) {
  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  const quarters = useMemo(() => generateQuarters(items), [items]);

  const now = new Date();
  const currentQuarterKey = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;

  if (filteredItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">
            {items.length === 0
              ? "No roadmap items yet. Click \"Add Item\" to get started."
              : "No items match the current filter."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        {/* Header */}
        <div className="flex border-b border-border bg-muted/40 sticky top-0 z-20">
          <div className="w-48 flex-shrink-0 px-3 py-2 border-r border-border/50 sticky left-0 bg-muted/40 z-30">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item</span>
          </div>
          <div className="flex">
            {quarters.map((q) => (
              <div
                key={q.key}
                className={`w-[240px] flex-shrink-0 px-3 py-2 border-r border-border/30 text-center ${
                  q.key === currentQuarterKey ? "bg-primary/5 font-semibold" : ""
                }`}
              >
                <span className="text-xs font-medium text-muted-foreground">{q.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {filteredItems.map((item) => (
          <RoadmapTimelineRow
            key={item.id}
            item={item}
            quarters={quarters}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </div>
  );
}
