"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useState } from "react";

type HeroLabStageProps = {
  letter: string;
  name: string;
  /** Only the pause button, no strip (prototype D). */
  pausable?: boolean;
  children: React.ReactNode;
};

const chip =
  "inline-flex h-11 items-center gap-2 border border-on-scrim/40 bg-ink/70 px-4 text-sm text-on-scrim transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-scrim";

/** One prototype on the lab page: label, «Повторити» (re-mounts the prototype so its animation restarts) and, for D, pause. */
export const HeroLabStage = ({ letter, name, pausable, children }: HeroLabStageProps) => {
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);

  return (
    <section
      aria-label={`${letter}: ${name}`}
      data-lab-paused={paused}
      className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-ink"
    >
      <div key={run} className="contents">
        {children}
        {pausable ? (
          <div className="site-container absolute inset-x-0 bottom-4 z-20 flex items-end justify-end gap-4 sm:bottom-6">
            <button
              type="button"
              aria-pressed={paused}
              aria-label="Пауза"
              onClick={() => setPaused((p) => !p)}
              className={`${chip} w-11 justify-center px-0 motion-reduce:hidden`}
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
          </div>
        ) : null}
      </div>
      <div className="site-container absolute inset-x-0 top-24 z-30 flex items-center justify-between gap-3">
        <p className="bg-ink/70 px-3 py-2 text-sm text-on-scrim">
          <span className="font-semibold">{letter}</span> · {name}
        </p>
        <button
          type="button"
          onClick={() => {
            setPaused(false);
            setRun((r) => r + 1);
          }}
          className={chip}
        >
          <RotateCcw className="size-4" />
          Повторити
        </button>
      </div>
    </section>
  );
};
