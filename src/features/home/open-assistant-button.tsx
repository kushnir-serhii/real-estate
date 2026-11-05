"use client";

import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Opens the floating assistant by clicking its launcher button (`data-assistant-launcher`, always mounted
 * in the site layout). This leaf stays tiny: the chat panel is not imported here and still loads on first open.
 */
export const OpenAssistantButton = ({ label }: { label: string }) => (
  <Button
    type="button"
    variant="dawn"
    size="lg"
    onClick={() => document.querySelector<HTMLElement>("[data-assistant-launcher]")?.click()}
  >
    <MessageCircle aria-hidden="true" />
    {label}
  </Button>
);
