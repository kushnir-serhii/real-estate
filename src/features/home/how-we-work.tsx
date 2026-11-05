import { SectionHeading } from "@/components/section-heading";
import { HOW_WE_WORK } from "@/constants/home";
import { HomeSection } from "./home-section";

/** Four numbered steps on the ink surface, joined by a line (vertical on phones, horizontal from lg). */
export const HowWeWork = () => (
  <HomeSection labelledBy="how-title" tone="ink">
    <div className="flex flex-col gap-12">
      <div className="reveal">
        <SectionHeading id="how-title" eyebrow={HOW_WE_WORK.eyebrow} title={HOW_WE_WORK.title} tone="ink" />
      </div>
      <ol className="reveal-stagger relative grid gap-10 lg:grid-cols-4 lg:gap-6">
        {HOW_WE_WORK.steps.map((step, index) => (
          <li key={step.title} className="relative flex gap-5 lg:flex-col lg:gap-6">
            {/* connector: down from this number to the next on phones, across on desktop */}
            {index < HOW_WE_WORK.steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-14 -bottom-10 left-6 w-px bg-ink-border lg:top-6 lg:-right-6 lg:bottom-auto lg:left-14 lg:h-px lg:w-auto"
              />
            )}
            <span
              aria-hidden="true"
              className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border border-dawn/60 bg-ink font-heading text-lg font-semibold text-dawn tabular-nums"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-2">
              <h3 className="text-h3">{step.title}</h3>
              <p className="text-ink-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </HomeSection>
);
