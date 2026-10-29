import { cn } from "@/lib/utils";

interface CenteredProps {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}

/** Full-height centered message, used for loading and error states. */
export function Centered({ children, muted, className }: CenteredProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-screen px-4 text-center",
        muted && "text-white/40",
        className
      )}
    >
      {children}
    </div>
  );
}
