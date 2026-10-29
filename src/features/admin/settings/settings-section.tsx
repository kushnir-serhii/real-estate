import { cn } from "@/lib/utils";

type SettingsSectionProps = {
  /** Used for `aria-labelledby` and as an anchor (`#rates`). */
  id: string;
  title: string;
  className?: string;
  children: React.ReactNode;
};

/** One titled card of the settings page. */
export const SettingsSection = ({ id, title, className, children }: SettingsSectionProps) => (
  <section
    id={id}
    aria-labelledby={`${id}-title`}
    className={cn(
      "flex min-w-0 scroll-mt-24 flex-col gap-4 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 sm:p-6",
      className,
    )}
  >
    <h2 id={`${id}-title`} className="text-lg font-bold">
      {title}
    </h2>
    {children}
  </section>
);
