import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Plus } from "lucide-react";
import type { KnowledgeFilter, KnowledgeVisibility, KnowledgeSource } from "@product-os/shared";

interface KnowledgeSourceFormProps {
  initialData?: KnowledgeSource | null;
  onSubmit: (data: {
    name: string;
    description?: string;
    provider?: string;
    dataTypes?: string[];
    filters: KnowledgeFilter;
    visibility: KnowledgeVisibility;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const PROVIDERS = [
  { value: "", label: "All Providers" },
  { value: "airtable", label: "Airtable" },
  { value: "jira", label: "Jira" },
  { value: "notion", label: "Notion" },
  { value: "google", label: "Google" },
  { value: "slack", label: "Slack" },
];

const DATA_TYPES = [
  { value: "okrs", label: "OKRs" },
  { value: "feedback", label: "Feedback" },
  { value: "tickets", label: "Tickets" },
  { value: "docs", label: "Docs" },
  { value: "messages", label: "Messages" },
];

export function KnowledgeSourceForm({ initialData, onSubmit, onCancel, isSubmitting }: KnowledgeSourceFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [provider, setProvider] = useState(initialData?.provider || "");
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(initialData?.dataTypes || []);
  const [keywords, setKeywords] = useState<string[]>(initialData?.filters?.keywords || []);
  const [keywordInput, setKeywordInput] = useState("");
  const [channels, setChannels] = useState<string[]>(initialData?.filters?.channels || []);
  const [channelInput, setChannelInput] = useState("");
  const [visibility, setVisibility] = useState<KnowledgeVisibility>(initialData?.visibility || "team");

  const toggleDataType = (dt: string) => {
    setSelectedDataTypes(prev =>
      prev.includes(dt) ? prev.filter(d => d !== dt) : [...prev, dt]
    );
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const addChannel = () => {
    const ch = channelInput.trim();
    if (ch && !channels.includes(ch)) {
      setChannels([...channels, ch]);
    }
    setChannelInput("");
  };

  const removeChannel = (ch: string) => {
    setChannels(channels.filter(c => c !== ch));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const filters: KnowledgeFilter = {};
    if (keywords.length > 0) filters.keywords = keywords;
    if (channels.length > 0) filters.channels = channels;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      provider: provider || undefined,
      dataTypes: selectedDataTypes.length > 0 ? selectedDataTypes : undefined,
      filters,
      visibility,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 rounded-xl border bg-card">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Approval feedback"
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Description</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional notes about this knowledge source"
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Provider */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Provider</label>
        <select
          value={provider}
          onChange={e => setProvider(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {PROVIDERS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Data Types */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Data Types</label>
        <div className="flex flex-wrap gap-2">
          {DATA_TYPES.map(dt => (
            <button
              key={dt.value}
              type="button"
              onClick={() => toggleDataType(dt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                selectedDataTypes.includes(dt.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {dt.label}
            </button>
          ))}
        </div>
        {selectedDataTypes.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">All types selected by default</p>
        )}
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Keywords</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
            placeholder="Type keyword and press Enter"
            className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="px-3 py-2 rounded-lg border bg-secondary text-sm hover:bg-secondary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {keywords.map(kw => (
              <span key={kw} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs font-medium">
                {kw}
                <button type="button" onClick={() => removeKeyword(kw)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Channels */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Channels / Sources</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={channelInput}
            onChange={e => setChannelInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChannel(); } }}
            placeholder="Slack channel, Jira project key, etc."
            className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={addChannel}
            className="px-3 py-2 rounded-lg border bg-secondary text-sm hover:bg-secondary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {channels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {channels.map(ch => (
              <span key={ch} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs font-medium">
                {ch}
                <button type="button" onClick={() => removeChannel(ch)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Visibility</label>
        <div className="flex gap-3">
          <label className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors",
            visibility === "team" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
          )}>
            <input
              type="radio"
              name="visibility"
              value="team"
              checked={visibility === "team"}
              onChange={() => setVisibility("team")}
              className="sr-only"
            />
            <div className={cn("w-3 h-3 rounded-full border-2", visibility === "team" ? "border-primary bg-primary" : "border-muted-foreground/30")} />
            <span className="text-sm">Team</span>
          </label>
          <label className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors",
            visibility === "private" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
          )}>
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
              className="sr-only"
            />
            <div className={cn("w-3 h-3 rounded-full border-2", visibility === "private" ? "border-primary bg-primary" : "border-muted-foreground/30")} />
            <span className="text-sm">Private</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : (initialData ? "Update" : "Create")}
        </button>
      </div>
    </form>
  );
}
