import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getAllSessions, searchSessionsForLinking, getTeam, getIntegrationData } from "@/lib/api";
import {
  Code2,
  ShieldCheck,
  FileText,
  Target,
  Search,
  Megaphone,
  Newspaper,
  ScrollText,
  MessageSquare,
  Users,
  Database,
  Hash,
} from "lucide-react";

export interface ContextMenuItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  category?: string;
}

interface ContextMenuPopupProps {
  trigger: "@" | "$" | "#";
  query: string;
  position: { bottom: number; left: number };
  sessionId: string;
  onSelect: (item: ContextMenuItem) => void;
  onDismiss: () => void;
}

// Static agent items for @ trigger
const AGENT_ITEMS: ContextMenuItem[] = [
  { id: "Code", label: "Code", description: "Implement code changes", icon: Code2, category: "Agents" },
  { id: "Review", label: "Review", description: "Review code for issues", icon: ShieldCheck, category: "Agents" },
  { id: "Spec", label: "Spec", description: "Write a feature spec", icon: FileText, category: "Agents" },
  { id: "Strategy", label: "Strategy", description: "Assess strategic fit", icon: Target, category: "Agents" },
  { id: "Discovery", label: "Discovery", description: "Run discovery research", icon: Search, category: "Agents" },
  { id: "GTM", label: "GTM", description: "Plan go-to-market", icon: Megaphone, category: "Agents" },
  { id: "Marketing", label: "Marketing", description: "Write product update", icon: Newspaper, category: "Agents" },
  { id: "Changelog", label: "Changelog", description: "Write changelog entries", icon: ScrollText, category: "Agents" },
];

// Static skill items for # trigger
const SKILL_ITEMS: ContextMenuItem[] = [
  { id: "@Spec", label: "Write Spec", description: "Trigger Spec agent", icon: FileText, category: "Skills" },
  { id: "@Strategy", label: "Assess Strategy", description: "Trigger Strategy agent", icon: Target, category: "Skills" },
  { id: "@Discovery", label: "Run Discovery", description: "Trigger Discovery agent", icon: Search, category: "Skills" },
  { id: "@GTM", label: "Plan GTM", description: "Trigger GTM agent", icon: Megaphone, category: "Skills" },
  { id: "@Marketing", label: "Write Update", description: "Trigger Marketing agent", icon: Newspaper, category: "Skills" },
  { id: "@Changelog", label: "Write Changelog", description: "Trigger Changelog agent", icon: ScrollText, category: "Skills" },
  { id: "@Review", label: "Code Review", description: "Trigger Review agent", icon: ShieldCheck, category: "Skills" },
  { id: "@Code", label: "Implement Code", description: "Trigger Code agent", icon: Code2, category: "Skills" },
];

export function ContextMenuPopup({
  trigger,
  query,
  position,
  onSelect,
  onDismiss,
}: ContextMenuPopupProps) {
  const [items, setItems] = useState<ContextMenuItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load items based on trigger
  const loadItems = useCallback(async () => {
    if (trigger === "#") {
      // Static skill list
      const filtered = query
        ? SKILL_ITEMS.filter((s) => s.label.toLowerCase().includes(query.toLowerCase()))
        : SKILL_ITEMS;
      setItems(filtered);
      setSelectedIndex(0);
      return;
    }

    if (trigger === "@") {
      // Start with agents
      const filteredAgents = query
        ? AGENT_ITEMS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
        : AGENT_ITEMS;

      // For short/no query, just show agents
      if (!query || query.length < 2) {
        setItems(filteredAgents);
        setSelectedIndex(0);
        return;
      }

      // For longer queries, also search sessions and team/data
      setLoading(true);
      try {
        const [sessionResult] = await Promise.all([
          searchSessionsForLinking(query),
        ]);

        const sessionItems: ContextMenuItem[] = sessionResult.sessions.slice(0, 5).map((s) => ({
          id: s.id,
          label: s.idea.slice(0, 50),
          description: `${s.mode || "session"} - ${s.status}`,
          icon: MessageSquare,
          category: "Sessions",
        }));

        setItems([...filteredAgents, ...sessionItems]);
      } catch {
        setItems(filteredAgents);
      } finally {
        setLoading(false);
        setSelectedIndex(0);
      }
      return;
    }

    if (trigger === "$") {
      // Sessions only
      setLoading(true);
      try {
        if (!query || query.length < 2) {
          const result = await getAllSessions();
          const sessionItems: ContextMenuItem[] = result.sessions.slice(-10).reverse().map((s) => ({
            id: s.id,
            label: s.idea.slice(0, 50),
            description: `${s.mode || "session"} - ${s.status}`,
            icon: MessageSquare,
            category: "Sessions",
          }));
          setItems(sessionItems);
        } else {
          const result = await searchSessionsForLinking(query);
          const sessionItems: ContextMenuItem[] = result.sessions.slice(0, 10).map((s) => ({
            id: s.id,
            label: s.idea.slice(0, 50),
            description: `${s.mode || "session"} - ${s.status}`,
            icon: MessageSquare,
            category: "Sessions",
          }));
          setItems(sessionItems);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
        setSelectedIndex(0);
      }
    }
  }, [trigger, query]);

  // Debounce API calls
  useEffect(() => {
    if (trigger === "#" || (trigger === "@" && (!query || query.length < 2))) {
      // No debounce needed for static items
      loadItems();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(loadItems, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trigger, query, loadItems]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && items.length > 0 && items[selectedIndex]) {
        e.preventDefault();
        onSelect(items[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onSelect, onDismiss]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onDismiss]);

  if (items.length === 0 && !loading) return null;

  // Group items by category
  const categories = [...new Set(items.map((i) => i.category || ""))];

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[240px] max-w-[320px] max-h-[280px] overflow-y-auto"
      style={{ bottom: position.bottom, left: Math.min(position.left, window.innerWidth - 340) }}
    >
      {loading && (
        <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
      )}

      {categories.map((category) => {
        const categoryItems = items.filter((i) => (i.category || "") === category);
        return (
          <div key={category}>
            {category && (
              <div className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                {category}
              </div>
            )}
            {categoryItems.map((item) => {
              const globalIndex = items.indexOf(item);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                    globalIndex === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{item.label}</div>
                    {item.description && (
                      <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
