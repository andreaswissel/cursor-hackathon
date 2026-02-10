import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Video, Upload, X, FileVideo, AlertCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface VideoUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const MAX_SIZE_MB = 500;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function VideoUpload({ onFileSelect, selectedFile, disabled }: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload an MP4, WebM, MOV, or AVI file.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large. Maximum size is ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setPendingFile(file);
      setIsConfirmOpen(true);
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    setError(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onFileSelect]);

  const handleConfirmUpload = useCallback(() => {
    if (!pendingFile) return;
    onFileSelect(pendingFile);
    setPendingFile(null);
    setIsConfirmOpen(false);
  }, [onFileSelect, pendingFile]);

  const handleCancelUpload = useCallback(() => {
    setPendingFile(null);
    setIsConfirmOpen(false);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Drop zone or selected file */}
      {selectedFile ? (
        // Selected file preview
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <FileVideo className="w-6 h-6 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)} · {selectedFile.type.split("/")[1]?.toUpperCase() ?? "VIDEO"}
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              disabled={disabled}
              className={cn(
                "p-1.5 rounded-lg hover:bg-secondary transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      ) : (
        // Drop zone
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".mp4,.webm,.mov,.avi,video/mp4,video/webm,video/quicktime,video/x-msvideo"
            onChange={handleInputChange}
            disabled={disabled}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              {isDragging ? (
                <Upload className="w-6 h-6 text-primary" />
              ) : (
                <Video className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">
                {isDragging ? "Drop video here" : "Upload a video"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Drag and drop or click to browse
              </p>
            </div>
            <p className="text-xs text-muted-foreground/60">
              MP4, WebM, MOV, AVI · Max 5 minutes · Max {MAX_SIZE_MB}MB
            </p>
          </div>
        </div>
      )}

      {/* Hint when file is selected */}
      {selectedFile && (
        <p className="text-xs text-muted-foreground/60 text-center">
          MP4, WebM, MOV, AVI · Max 5 minutes · Max {MAX_SIZE_MB}MB
        </p>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Inline data-safety reminder */}
      <p className="text-xs text-muted-foreground text-center">
        Do not upload sensitive personal data unless this workspace is explicitly approved for it.
      </p>

      {/* Just-in-time upload warning */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={handleCancelUpload}
        onConfirm={handleConfirmUpload}
        title="Before you upload"
        description="Make sure this file does not include restricted sensitive data (like health data, government IDs, payment card data, passwords, or children's data) unless your workspace is approved for it."
        confirmLabel="Continue Upload"
        cancelLabel="Cancel"
        variant="info"
      />
    </div>
  );
}
