import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, X } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive" | "info";
  /** If true, only shows a dismiss button (alert mode) */
  alertOnly?: boolean;
  /** Shows loading state on confirm button */
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  alertOnly = false,
  isLoading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && !alertOnly && onConfirm && !isLoading) {
        e.preventDefault();
        onConfirm();
      }
    },
    [isOpen, onClose, onConfirm, alertOnly, isLoading]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus management
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const Icon = variant === "destructive" ? AlertTriangle : Info;
  const iconColorClass =
    variant === "destructive" ? "text-red-500" : "text-muted-foreground";
  const iconBgClass =
    variant === "destructive" ? "bg-red-500/10" : "bg-secondary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-[2px]",
          "animate-in fade-in duration-150"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        className={cn(
          "relative w-full max-w-[380px] mx-4",
          "bg-card border rounded-xl shadow-2xl",
          "animate-in zoom-in-95 fade-in duration-150"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-3 right-3 p-1.5 rounded-lg",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-secondary transition-colors"
          )}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-5 pt-6">
          {/* Icon */}
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
              iconBgClass
            )}
          >
            <Icon className={cn("w-5 h-5", iconColorClass)} />
          </div>

          {/* Title */}
          <h2
            id="dialog-title"
            className="text-base font-semibold tracking-tight mb-1.5"
          >
            {title}
          </h2>

          {/* Description */}
          <p
            id="dialog-description"
            className="text-sm text-muted-foreground leading-relaxed"
          >
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-2 flex gap-2.5">
          {alertOnly ? (
            <button
              ref={confirmButtonRef}
              onClick={onClose}
              className={cn(
                "flex-1 px-4 py-2.5 text-sm font-medium rounded-lg",
                "bg-foreground text-background",
                "hover:bg-foreground/90 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2 focus:ring-offset-background"
              )}
            >
              Dismiss
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isLoading}
                className={cn(
                  "flex-1 px-4 py-2.5 text-sm font-medium rounded-lg",
                  "border bg-transparent",
                  "hover:bg-secondary transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2 focus:ring-offset-background"
                )}
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  "flex-1 px-4 py-2.5 text-sm font-medium rounded-lg",
                  "transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
                  variant === "destructive"
                    ? "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/20"
                    : "bg-foreground text-background hover:bg-foreground/90 focus:ring-foreground/20"
                )}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {confirmLabel}
                  </span>
                ) : (
                  confirmLabel
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
