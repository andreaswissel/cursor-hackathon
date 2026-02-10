import { cn } from "@/lib/utils";

interface UserAvatarProps {
  displayName?: string | null;
  email?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(displayName?: string | null, email?: string): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

const SIZE_CLASSES = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

export function UserAvatar({ displayName, email, avatarUrl, size = "md", className }: UserAvatarProps) {
  const initials = getInitials(displayName, email);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || email || "User"}
        className={cn("rounded-full object-cover flex-shrink-0", SIZE_CLASSES[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center flex-shrink-0",
        SIZE_CLASSES[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
