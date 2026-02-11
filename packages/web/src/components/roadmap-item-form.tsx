import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X, Search, Loader2, Trash2, LinkIcon } from "lucide-react";
import { searchSessionsForLinking } from "@/lib/api";
import type { RoadmapItem, RoadmapItemStatus, RoadmapItemPriority } from "@product-os/shared";

interface LinkedSession {
  id: string;
  idea: string;
  status: string;
  mode?: string;
}

interface RoadmapItemFormProps {
  item?: RoadmapItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    status: RoadmapItemStatus;
    priority: RoadmapItemPriority;
    targetQuarter?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    linkedSessionIds: string[];
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const STATUS_OPTIONS: { value: RoadmapItemStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: RoadmapItemPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function generateQuarterOptions(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const options: string[] = [];
  let y = year;
  let q = quarter;
  for (let i = 0; i < 8; i++) {
    options.push(`Q${q} ${y}`);
    if (q >= 4) {
      q = 1;
      y += 1;
    } else {
      q += 1;
    }
  }
  return options;
}

export function RoadmapItemForm({ item, isOpen, onClose, onSave, onDelete }: RoadmapItemFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<RoadmapItemStatus>("backlog");
  const [priority, setPriority] = useState<RoadmapItemPriority>("medium");
  const [targetQuarter, setTargetQuarter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkedSessions, setLinkedSessions] = useState<LinkedSession[]>([]);
  const [sessionQuery, setSessionQuery] = useState("");
  const [sessionResults, setSessionResults] = useState<LinkedSession[]>([]);
  const [searchingSession, setSearchingSession] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const quarterOptions = generateQuarterOptions();

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setStatus(item.status);
      setPriority(item.priority);
      setTargetQuarter(item.targetQuarter || "");
      setStartDate(item.startDate || "");
      setEndDate(item.endDate || "");
      setLinkedSessions(item.linkedSessions || []);
    } else {
      setTitle("");
      setDescription("");
      setStatus("backlog");
      setPriority("medium");
      setTargetQuarter("");
      setStartDate("");
      setEndDate("");
      setLinkedSessions([]);
    }
    setSessionQuery("");
    setSessionResults([]);
    setShowSessionDropdown(false);
  }, [item, isOpen]);

  const handleSessionSearch = useCallback((query: string) => {
    setSessionQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSessionResults([]);
      setShowSessionDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingSession(true);
      try {
        const result = await searchSessionsForLinking(query);
        const existingIds = new Set(linkedSessions.map((s) => s.id));
        setSessionResults(result.sessions.filter((s) => !existingIds.has(s.id)));
        setShowSessionDropdown(true);
      } catch {
        setSessionResults([]);
      } finally {
        setSearchingSession(false);
      }
    }, 300);
  }, [linkedSessions]);

  const addSession = (session: LinkedSession) => {
    setLinkedSessions((prev) => [...prev, session]);
    setSessionQuery("");
    setSessionResults([]);
    setShowSessionDropdown(false);
  };

  const removeSession = (sessionId: string) => {
    setLinkedSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        targetQuarter: targetQuarter || null,
        startDate: startDate || null,
        endDate: endDate || null,
        linkedSessionIds: linkedSessions.map((s) => s.id),
      });
      onClose();
    } catch (error) {
      console.error("Failed to save roadmap item:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error("Failed to delete roadmap item:", error);
    } finally {
      setDeleting(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSessionDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold">{item ? "Edit Item" : "Add Item"}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Feature name..."
              className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoadmapItemStatus)}
                className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RoadmapItemPriority)}
                className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Quarter */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Target Quarter</label>
            <select
              value={targetQuarter}
              onChange={(e) => setTargetQuarter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">No quarter</option>
              {quarterOptions.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Linked Sessions */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Linked Sessions</label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={sessionQuery}
                  onChange={(e) => handleSessionSearch(e.target.value)}
                  placeholder="Search sessions to link..."
                  className="w-full pl-9 pr-8 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {searchingSession && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
                )}
              </div>

              {/* Search results dropdown */}
              {showSessionDropdown && sessionResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {sessionResults.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addSession(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors border-b border-border/30 last:border-b-0"
                    >
                      <div className="truncate">{s.idea}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {s.status} {s.mode && `· ${s.mode}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Linked session chips */}
            {linkedSessions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {linkedSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md bg-secondary text-xs"
                  >
                    <LinkIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{s.idea}</span>
                    <button
                      onClick={() => removeSession(s.id)}
                      className="p-0.5 rounded hover:bg-muted-foreground/20 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center gap-2">
          {item && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : item ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </>
  );
}
