import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { RoadmapTimeline } from "@/components/roadmap-timeline";
import { RoadmapItemForm } from "@/components/roadmap-item-form";
import { getRoadmapItems, createRoadmapItem, updateRoadmapItem, deleteRoadmapItem, getAllProjects } from "@/lib/api";
import { Plus, Loader2, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoadmapItem, RoadmapItemStatus, RoadmapItemPriority, ProjectWithSessions } from "@product-os/shared";

const STATUS_FILTERS: Array<{ value: RoadmapItemStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<RoadmapItemStatus | "all">("all");
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<ProjectWithSessions[]>([]);

  const fetchItems = useCallback(async () => {
    try {
      const data = await getRoadmapItems();
      setItems(data.items);
    } catch (error) {
      console.error("Failed to fetch roadmap items:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await getAllProjects();
      setProjects(data.projects);
    } catch {
      // Sidebar projects are non-critical
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchProjects();
  }, [fetchItems, fetchProjects]);

  const handleSave = async (data: {
    title: string;
    description?: string;
    status: RoadmapItemStatus;
    priority: RoadmapItemPriority;
    targetQuarter?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    linkedSessionIds: string[];
  }) => {
    if (editingItem) {
      await updateRoadmapItem(editingItem.id, data);
    } else {
      await createRoadmapItem(data);
    }
    await fetchItems();
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    await deleteRoadmapItem(editingItem.id);
    setEditingItem(null);
    await fetchItems();
  };

  const handleItemClick = (item: RoadmapItem) => {
    setIsCreating(false);
    setEditingItem(item);
  };

  const handleAddClick = () => {
    setEditingItem(null);
    setIsCreating(true);
  };

  const handleFormClose = () => {
    setEditingItem(null);
    setIsCreating(false);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        projects={projects}
        onProjectCreated={fetchProjects}
        onProjectDeleted={fetchProjects}
        onSessionDeleted={fetchProjects}
      />

      <main className="flex-1 overflow-hidden flex flex-col pt-14 md:pt-0">
        {/* Header */}
        <div className="flex-shrink-0 border-b px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Map className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Roadmap</h1>
                <p className="text-xs text-muted-foreground">Plan and track features across quarters</p>
              </div>
            </div>
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex-shrink-0 px-6 py-3 border-b">
          <div className="max-w-7xl mx-auto flex items-center gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  statusFilter === f.value
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-2 text-xs text-muted-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              </div>
            ) : (
              <RoadmapTimeline
                items={items}
                statusFilter={statusFilter}
                onItemClick={handleItemClick}
              />
            )}
          </div>
        </div>
      </main>

      {/* Form panel */}
      <RoadmapItemForm
        item={editingItem}
        isOpen={isCreating || !!editingItem}
        onClose={handleFormClose}
        onSave={handleSave}
        onDelete={editingItem ? handleDelete : undefined}
      />
    </div>
  );
}
