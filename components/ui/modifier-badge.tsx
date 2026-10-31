import { MODIFIER_INFO, type RoundModifier } from "@/lib/game/modifiers";
import { cn } from "@/lib/utils";

/** Each special round has its own color, used on badges and banners. */
export const MODIFIER_STYLE: Record<RoundModifier, { badge: string; banner: string; glow: string }> = {
  double: {
    badge: "bg-yellow-400 text-yellow-950",
    banner: "border-yellow-300 bg-yellow-400/15 text-yellow-100",
    glow: "shadow-[0_0_40px_rgba(250,204,21,0.35)]",
  },
  speed: {
    badge: "bg-cyan-400 text-cyan-950",
    banner: "border-cyan-300 bg-cyan-400/15 text-cyan-100",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.35)]",
  },
  chaos: {
    badge: "bg-fuchsia-400 text-fuchsia-950",
    banner: "border-fuchsia-300 bg-fuchsia-400/15 text-fuchsia-100",
    glow: "shadow-[0_0_40px_rgba(232,121,249,0.35)]",
  },
};

/** Small pill such as "⚡ Speed round", for headers. */
export function ModifierBadge({ modifier, className }: { modifier: RoundModifier; className?: string }) {
  const info = MODIFIER_INFO[modifier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide whitespace-nowrap",
        MODIFIER_STYLE[modifier].badge,
        className
      )}
    >
      <span aria-hidden>{info.icon}</span>
      {info.title}
    </span>
  );
}
