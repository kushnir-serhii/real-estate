"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { TURNSTILE_SITE_KEY } from "./turnstile-site-key";

type TurnstileAppearance = "always" | "interaction-only";

type TurnstileRenderOptions = {
  sitekey: string;
  language?: string;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "flexible" | "compact";
  appearance?: TurnstileAppearance;
  "response-field"?: boolean;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
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

type TurnstileWidgetProps = {
  /** Any value that changes after each submit result: the widget resets to issue a fresh token. */
  resetSignal: unknown;
  /** Gets every fresh token, and `null` when it expires or the check fails (for code that sends it itself). */
  onToken?: (token: string | null) => void;
  /** `interaction-only`: invisible unless Cloudflare needs the visitor to click (the chat). */
  appearance?: TurnstileAppearance;
  /** `false`: no hidden `cf-turnstile-response` input (the token is read through `onToken`). */
  responseField?: boolean;
  className?: string;
};

/**
 * Cloudflare Turnstile, rendered explicitly into a div; by default the widget adds the
 * `cf-turnstile-response` input to the form around it. Renders nothing when the site key is empty (local work).
 */
export const TurnstileWidget = ({
  resetSignal,
  onToken,
  appearance = "always",
  responseField = true,
  className,
}: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // The widget is rendered once; the latest callback is read through the ref.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const renderWidget = useCallback(() => {
    const container = containerRef.current;
    if (!TURNSTILE_SITE_KEY || !container || !window.turnstile || widgetIdRef.current !== null) return;
    widgetIdRef.current =
      window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        language: "uk",
        theme: "auto",
        size: "flexible",
        appearance,
        "response-field": responseField,
        callback: (token) => onTokenRef.current?.(token),
        "expired-callback": () => onTokenRef.current?.(null),
        "error-callback": () => onTokenRef.current?.(null),
      }) ?? null;
  }, [appearance, responseField]);

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

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onReady={renderWidget} />
      <div ref={containerRef} className={cn("min-h-16", className)} />
    </>
  );
};
