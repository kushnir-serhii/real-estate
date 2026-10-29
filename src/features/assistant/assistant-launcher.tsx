"use client";

import { MessageCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AssistantPanelSkeleton } from "./assistant-panel-skeleton";

const loadPanel = () => import("./assistant-panel");

const AssistantPanel = dynamic(() => loadPanel().then((module) => module.AssistantPanel), {
  ssr: false,
  loading: () => <AssistantPanelSkeleton />,
});

/** Starts fetching the chat code when the visitor is about to open it (hover, focus). */
const preloadPanel = () => {
  void loadPanel();
};

/**
 * Floating chat button on every public page and the sheet it opens (spec 010). The sheet shell
 * (Radix Dialog: focus trap, Esc, focus return) is here; the chat itself loads on first open.
 */
export const AssistantLauncher = () => {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          aria-label="Відкрити чат з асистентом"
          onPointerEnter={preloadPanel}
          onFocus={preloadPanel}
          // `chat-launcher-bottom` also lifts it above the property page's mobile bar (globals.css).
          className="fixed right-4 z-40 size-chat-button rounded-full shadow-lg chat-launcher-bottom focus-visible:ring-4 [&_svg:not([class*='size-'])]:size-6"
        >
          <MessageCircle aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        ref={contentRef}
        side="right"
        showCloseButton={false}
        // The panel itself focuses the input where it helps (desktop); focus starts on the dialog.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
        className="gap-0 pt-[env(safe-area-inset-top)] data-[side=right]:h-dvh data-[side=right]:w-full data-[side=right]:sm:max-w-(--container-chat-panel)"
      >
        <AssistantPanel />
      </SheetContent>
    </Sheet>
  );
};
