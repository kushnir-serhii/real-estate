"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Safety net: the bar never hangs if a navigation never changes the URL (e.g. it failed). */
const MAX_PENDING_MS = 5000;

/** Same normalisation on both sides: `useSearchParams` re-encodes, `location.search` does not. */
const urlKey = (pathname: string, search: string) => {
  const query = new URLSearchParams(search).toString();
  return query ? `${pathname}?${query}` : pathname;
};
const currentUrl = () => urlKey(window.location.pathname, window.location.search);

const internalTarget = (url: URL) => (url.origin === window.location.origin ? urlKey(url.pathname, url.search) : null);

/**
 * Thin top bar for client-side navigations (links and GET forms) now that routes have no `loading.tsx`
 * (a route-level loading boundary hides the page in the HTML for visitors without JS, spec 013).
 * Starts on click or submit, ends when the URL changes. The bar fades in after a short delay, so fast navigations show nothing.
 */
export const NavProgress = () => {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // The URL the navigation started from: pending ends as soon as the URL differs.
  const here = urlKey(pathname, search);
  const [from, setFrom] = useState<string | null>(null);
  const pending = from === here;

  useEffect(() => {
    const start = (target: string | null) => {
      if (target && target !== currentUrl()) setFrom(currentUrl());
    };
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href);
      start(internalTarget(url));
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() !== "get") return;
      // server-action forms get a non-URL action; only real same-origin GET forms navigate
      try {
        // a GET submit navigates to action + form fields: same URL as now (same filters resubmitted) → no bar
        const url = new URL(form.action);
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(form, event.submitter)) if (typeof value === "string") params.append(key, value);
        url.search = params.toString();
        start(internalTarget(url));
      } catch {
        // not a URL
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setFrom(null), MAX_PENDING_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  if (!pending) return null;
  return (
    <div role="progressbar" aria-label="Завантаження" className="nav-progress pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-transparent">
      <div className="nav-progress-bar h-full w-1/3 bg-dawn" />
    </div>
  );
};
