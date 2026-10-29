import { cn } from "@/lib/utils";

type PropertyFormSectionProps = {
  /** Used for `aria-labelledby` and as an anchor. */
  id: string;
  title: string;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** One titled card of the property form. */
export const PropertyFormSection = ({ id, title, description, className, children }: PropertyFormSectionProps) => (
  <section
    id={id}
    aria-labelledby={`${id}-title`}
    className={cn(
      "flex min-w-0 scroll-mt-24 flex-col gap-4 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 sm:p-6",
      className,
    )}
  >
    <div className="flex flex-col gap-1">
      <h2 id={`${id}-title`} className="text-lg font-bold">
        {title}
      </h2>
      {description && <p className="max-w-prose text-sm text-muted-foreground">{description}</p>}
    </div>
    {children}
  </section>
);
