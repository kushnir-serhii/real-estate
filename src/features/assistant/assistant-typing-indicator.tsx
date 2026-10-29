import { cn } from "@/lib/utils";

const DOT_DELAYS = ["", "[animation-delay:0.15s]", "[animation-delay:0.3s]"] as const;

/** Three dots before the first words of a reply. Static (dimmed) when the visitor prefers less motion. */
export const AssistantTypingIndicator = () => (
  <span className="flex h-6 items-center gap-1" aria-hidden="true">
    {DOT_DELAYS.map((delay) => (
      <span
        key={delay}
        className={cn("size-2 rounded-full bg-muted-foreground opacity-60 motion-safe:animate-typing-dot", delay)}
      />
    ))}
  </span>
);
