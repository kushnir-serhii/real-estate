import { SectionHeading } from "@/components/section-heading";
import { WHY_US } from "@/constants/home";
import { HomeSection } from "./home-section";

/** Editorial list of principles: big numbers, thin brand rules, no cards. */
export const WhyUs = () => (
  <HomeSection labelledBy="why-title">
    <div className="flex flex-col gap-8 lg:gap-12">
      <div className="reveal">
        <SectionHeading id="why-title" eyebrow={WHY_US.eyebrow} title={WHY_US.title} />
      </div>
      <ol className="reveal-stagger grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
        {WHY_US.items.map((item, index) => (
          <li key={item.title} className="flex flex-col gap-3 border-t border-brand pt-5">
            <span aria-hidden="true" className="text-3xl font-semibold text-brand-text tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-h3">{item.title}</h3>
            <p className="text-muted-foreground">{item.text}</p>
          </li>
        ))}
      </ol>
    </div>
  </HomeSection>
);
