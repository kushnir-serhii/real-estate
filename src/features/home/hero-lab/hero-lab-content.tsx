import { Search } from "lucide-react";

import { HERO } from "@/constants/home";
import { cn } from "@/lib/utils";

const TITLE = "Нерухомість у Києві та передмісті";

type HeroLabContentProps = {
  /** When the text starts, ms after mount (the prototype's own beat). */
  start?: number;
  className?: string;
};

/** The hero copy shared by the three prototypes: same words and the same per-word mask rise as the real hero. */
export const HeroLabContent = ({ start = 0, className }: HeroLabContentProps) => {
  const words = TITLE.split(/\s+/);
  const delay = (ms: number) => `calc(var(--lab-start) + ${ms}ms)`;

  return (
    <div
      className={cn(
        "lab-text site-container relative z-10 flex flex-col items-start gap-4 pt-32 pb-12 text-on-scrim sm:gap-5",
        className,
      )}
      style={{ "--lab-start": `${start}ms` } as React.CSSProperties}
    >
      <p className="eyebrow hero-wipe text-on-scrim/90" style={{ "--hero-delay": delay(0) } as React.CSSProperties}>
        {HERO.eyebrow}
      </p>
      <h1 className="text-display max-w-4xl">
        {words.map((word, i) => (
          <span key={i}>
            <span className="hero-word">
              <span className="hero-word-inner" style={{ "--i": i } as React.CSSProperties}>
                {word}
              </span>
            </span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </h1>
      <p
        className="hero-wipe max-w-2xl text-base text-pretty text-on-scrim/90 sm:text-lg"
        style={{ "--hero-delay": delay(600) } as React.CSSProperties}
      >
        {HERO.lead}
      </p>
      <div
        className="hero-wipe mt-2 flex h-14 w-full max-w-4xl items-center gap-3 border border-on-scrim/30 bg-ink/50 px-4 text-on-scrim/80 sm:mt-4"
        style={{ "--hero-delay": delay(760) } as React.CSSProperties}
        aria-hidden="true"
      >
        <Search className="size-5" />
        <span className="text-sm sm:text-base">Тип, район, ціна</span>
      </div>
    </div>
  );
};
