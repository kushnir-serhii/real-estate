import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ASSISTANT_PERSONA } from "@/constants/assistant";

type AssistantPanelHeaderProps = {
  /** «Нова розмова» once the chat is loaded. */
  actions?: ReactNode;
};

export const AssistantPanelHeader = ({ actions }: AssistantPanelHeaderProps) => (
  <div className="flex min-h-16 shrink-0 items-center gap-3 border-b py-2 pr-2 pl-4">
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center max-sm:hidden justify-center rounded-full bg-accent text-base font-semibold text-accent-foreground"
    >
      {ASSISTANT_PERSONA.name.charAt(0)}
    </span>
    <div className="min-w-0 flex-1">
      <SheetTitle className="flex flex-col text-base font-semibold">
        <span className="truncate">{ASSISTANT_PERSONA.name}</span>
        <span className="sr-only"> — </span>
        <span className="truncate text-sm font-normal text-muted-foreground">асистент агенції</span>
      </SheetTitle>
      <SheetDescription className="sr-only">
        Допоможе підібрати житло та відповість на питання про агенцію.
      </SheetDescription>
    </div>
    {actions}
    <SheetClose asChild>
      <Button variant="ghost" size="icon" aria-label="Закрити чат">
        <X aria-hidden="true" />
      </Button>
    </SheetClose>
  </div>
);
