"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { objectsLabel } from "../objects-label";

const TWEEN_MS = 400;

const QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);

/**
 * «12 об'єктів» that counts to a new value instead of jumping. The visible text is aria-hidden and changes every
 * frame; a screen reader gets only the final value (sr-only span), so a live region announces it once.
 */
export const CountTween = ({ count, approx = false }: { count: number; approx?: boolean }) => {
  const [shown, setShown] = useState(count);
  const shownRef = useRef(count);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const from = shownRef.current;
    if (reduced || from === count) {
      shownRef.current = count;
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / TWEEN_MS);
      const eased = 1 - (1 - t) ** 3;
      shownRef.current = Math.round(from + (count - from) * eased);
      setShown(shownRef.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [count, reduced]);

  const value = reduced ? count : shown;
  const prefix = approx ? "≈ " : "";
  return (
    <>
      <span aria-hidden="true">
        {prefix}
        {objectsLabel(value)}
      </span>
      <span className="sr-only">
        {prefix}
        {objectsLabel(count)}
      </span>
    </>
  );
};
