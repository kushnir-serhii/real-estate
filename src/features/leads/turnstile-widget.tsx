"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type TurnstileRenderOptions = {
  sitekey: string;
  language?: string;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "flexible" | "compact";
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type TurnstileWidgetProps = {
  /** Any value that changes after each submit result: the widget resets to issue a fresh token. */
  resetSignal: unknown;
  className?: string;
};

/**
 * Cloudflare Turnstile, rendered explicitly into a div inside the form; the widget adds the
 * `cf-turnstile-response` input itself. Renders nothing when the site key is empty (local work).
 */
export const TurnstileWidget = ({ resetSignal, className }: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    const container = containerRef.current;
    if (!SITE_KEY || !container || !window.turnstile || widgetIdRef.current !== null) return;
    widgetIdRef.current =
      window.turnstile.render(container, { sitekey: SITE_KEY, language: "uk", theme: "auto", size: "flexible" }) ??
      null;
  }, []);

  useEffect(() => {
    // The script may already be loaded by an earlier mount (client navigation, «Надіслати ще одну»).
    renderWidget();
    return () => {
      if (widgetIdRef.current !== null) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [renderWidget]);

  useEffect(() => {
    if (widgetIdRef.current !== null) window.turnstile?.reset(widgetIdRef.current);
  }, [resetSignal]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onReady={renderWidget} />
      <div ref={containerRef} className={cn("min-h-16", className)} />
    </>
  );
};
