import { useState } from "react";
import { isTauri } from "@/lib/platform";
import { FileText, X, Plus } from "lucide-react";

interface ImportedFile {
  filename: string;
  content: string;
}

interface FileImportPanelProps {
  onImport: (content: string, filename: string) => void;
}

export function FileImportPanel({ onImport }: FileImportPanelProps) {
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);

  if (!isTauri()) return null;

  const handlePickFiles = async () => {
    try {
      const [{ open }, { invoke }] = await Promise.all([
        import("@tauri-apps/plugin-dialog"),
        import("@tauri-apps/api/core"),
      ]);

      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Text files",
            extensions: ["md", "txt", "markdown"],
          },
        ],
      });

      if (!selected) return;

      const paths = Array.isArray(selected) ? selected : [selected];

      for (const filePath of paths) {
        const content: string = await invoke("fs_read_file", {
          path: filePath,
        });
        const filename = (filePath as string).split("/").pop() || "file";

        // Skip if already imported
        if (importedFiles.some((f) => f.filename === filename)) continue;

        setImportedFiles((prev) => [...prev, { filename, content }]);
        onImport(content, filename);
      }
    } catch {
      // User cancelled or error
    }
  };

  const handleRemove = (filename: string) => {
    setImportedFiles((prev) => prev.filter((f) => f.filename !== filename));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handlePickFiles}
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground"
      >
        <Plus className="w-3.5 h-3.5" />
        Import Notes
      </button>

      {importedFiles.map((file) => (
        <div
          key={file.filename}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-sm"
        >
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="max-w-[120px] truncate">{file.filename}</span>
          <button
            onClick={() => handleRemove(file.filename)}
            type="button"
            className="p-0.5 rounded hover:bg-muted-foreground/20 transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}
