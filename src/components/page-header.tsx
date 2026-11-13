import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  /** Breadcrumb or back link, above the eyebrow. */
  breadcrumb?: React.ReactNode;
  /** Actions under the lead (buttons). */
  children?: React.ReactNode;
  /** `narrow` matches reading pages (about, privacy); `wide` matches grids (catalog, favorites). */
  width?: "narrow" | "wide";
  /** Title and lead are announced right away (error states). */
  alert?: boolean;
  className?: string;
};

/** One page header for every inner route: eyebrow, heading-font h1, lead. Sits right under the solid site header. */
export const PageHeader = ({
  eyebrow,
  title,
  lead,
  breadcrumb,
  children,
  width = "wide",
  alert = false,
  className,
}: PageHeaderProps) => (
  <header
    className={cn(
      "pt-8 pb-8 sm:pt-12 sm:pb-10",
      width === "narrow" ? "mx-auto w-full max-w-3xl px-4 sm:px-6" : "site-container",
      className,
    )}
  >
    {breadcrumb}
    <div role={alert ? "alert" : undefined} className="flex flex-col items-start gap-3">
      {eyebrow && <p className="eyebrow text-dawn-text">{eyebrow}</p>}
      <h1 className="text-h1 max-w-3xl">{title}</h1>
      {lead && <p className="max-w-prose text-lg text-muted-foreground">{lead}</p>}
    </div>
    {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
  </header>
);
