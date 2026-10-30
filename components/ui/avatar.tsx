import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-fuchsia-500",
  "bg-pink-500",
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarColor(id: string): string {
  return PALETTE[hash(id) % PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  id: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Colorful initials avatar; the color is stable per player id. */
export function Avatar({ id, name, size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full font-black text-white shadow-inner shadow-black/20 shrink-0",
        avatarColor(id),
        size === "sm" && "w-7 h-7 text-xs",
        size === "md" && "w-9 h-9 text-sm",
        size === "lg" && "w-14 h-14 text-xl",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
