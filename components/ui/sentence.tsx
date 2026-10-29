import { cn } from "@/lib/utils";

interface SentenceProps {
  text: string;
  className?: string;
  /** Style for the tile words (the `[bracketed]` parts of a framed sentence). */
  tileClassName?: string;
}

/**
 * Renders a submission. Framed rounds store placed tiles as `[word]`; those
 * are shown as highlighted chips. Freestyle sentences have no brackets and
 * render as plain text.
 */
export function Sentence({ text, className, tileClassName }: SentenceProps) {
  const parts = text.split(/(\[[^\]]*\])/g).filter(Boolean);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const match = /^\[([^\]]*)\]$/.exec(part);
        if (!match) return <span key={i}>{part}</span>;
        return (
          <span
            key={i}
            className={cn(
              "inline-block rounded-md bg-violet-500/30 px-1.5 py-0.5 font-bold text-violet-100 leading-tight",
              tileClassName
            )}
          >
            {match[1] || "___"}
          </span>
        );
      })}
    </span>
  );
}
