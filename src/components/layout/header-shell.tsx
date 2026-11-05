"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Scroll distance after which the header turns into a solid bar. */
const SCROLLED_AFTER = 40;

const subscribe = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};
const getScrolled = () => window.scrollY > SCROLLED_AFTER;

/**
 * The header frame and the only client code the header needs. The slot (`h-header`) never changes size, so nothing
 * shifts; only the bar inside it does. `data-tone="light"` = transparent over the home hero (children switch to
 * light text with the `on-hero:` variant), `solid` = everywhere else and after scrolling.
 */
export const HeaderShell = ({ children }: { children: React.ReactNode }) => {
  const overHero = usePathname() === "/";
  const scrolled = useSyncExternalStore(subscribe, getScrolled, () => false);
  const tone = overHero && !scrolled ? "light" : "solid";

  return (
    <header
      data-tone={tone}
      data-scrolled={scrolled}
      className="group/header pointer-events-none sticky top-0 z-40 h-header"
    >
      <div
        className={cn(
          "pointer-events-auto h-20 border-b text-foreground transition-[height,background-color,border-color,box-shadow,color] duration-(--duration-base) ease-out-soft motion-reduce:transition-none",
          "group-data-[scrolled=true]/header:h-16",
          "border-border bg-background/90 backdrop-blur-md",
          "on-hero:border-transparent on-hero:bg-transparent on-hero:text-on-scrim on-hero:backdrop-blur-none",
          scrolled && "shadow-sm shadow-foreground/5",
        )}
      >
        {children}
      </div>
    </header>
  );
};
