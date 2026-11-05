import { TRUST_STATS } from "@/constants/home";
import { CountUp } from "./count-up";

/** Numbers band right under the quick search. Final values are in the HTML; the count-up is progressive and skipped for values that are not counts («24/7»). */
export const TrustStats = () => (
  <section aria-label="Агентство в цифрах" className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
    <ul className="reveal-stagger grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
      {TRUST_STATS.map((stat) => (
        <li key={stat.label} className="flex flex-col gap-2 border-t border-border pt-5">
          <span aria-hidden="true" className="mb-2 h-1 w-8 rounded-full bg-dawn" />
          <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {stat.animate ? <CountUp value={stat.value} decimals={stat.decimals} /> : stat.value}
            {stat.suffix && <span className="text-dawn-text">{stat.suffix}</span>}
          </p>
          <p className="text-sm text-muted-foreground">{stat.label}</p>
        </li>
      ))}
    </ul>
  </section>
);
