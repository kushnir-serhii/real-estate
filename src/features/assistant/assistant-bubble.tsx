import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const bubbleVariants = cva(
  "max-w-[85%] min-w-0 rounded-2xl px-4 py-2.5 text-base/relaxed break-words whitespace-pre-wrap",
  {
    variants: {
      from: {
        user: "self-end rounded-br-md bg-primary text-primary-foreground",
        assistant: "self-start rounded-bl-md bg-muted text-foreground",
      },
    },
  },
);

type AssistantBubbleProps = Required<VariantProps<typeof bubbleVariants>> & {
  children: ReactNode;
  className?: string;
};

/** One chat bubble. Text is rendered as plain text: line breaks kept, nothing parsed as HTML or markdown. */
export const AssistantBubble = ({ from, children, className }: AssistantBubbleProps) => (
  <div className={cn(bubbleVariants({ from }), className)}>{children}</div>
);
