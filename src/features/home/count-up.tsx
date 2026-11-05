"use client";

import { useEffect, useRef } from "react";

type CountUpProps = { value: number; decimals: number };

const DURATION_MS = 1400;

/** «1 400» / «4,9»: manual so the server and browser output is identical (no Intl differences). */
const format = (value: number, decimals: number) => {
  const [whole, fraction] = value.toFixed(decimals).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return fraction ? `${grouped},${fraction}` : grouped;
};

/**
 * Renders the final number (so it is in the server HTML) and, only when motion is allowed, counts it up
 * from 0 the first time it scrolls into view. Without JS or with reduced motion nothing changes.
 */
export const CountUp = ({ value, decimals }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const rect = node.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
    const passed = rect.bottom <= 0;
    if (!alreadyVisible && !passed) node.textContent = format(0, decimals);

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / DURATION_MS, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        node.textContent = format(value * eased, decimals);
        if (progress < 1) frame = requestAnimationFrame(tick);
        else node.textContent = format(value, decimals);
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        run();
      },
      { threshold: 0.6 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.textContent = format(value, decimals);
    };
  }, [value, decimals]);

  return <span ref={ref}>{format(value, decimals)}</span>;
};
