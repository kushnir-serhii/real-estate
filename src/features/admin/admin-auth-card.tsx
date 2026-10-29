import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

type AdminAuthCardProps = {
  title: string;
  description?: React.ReactNode;
  /** Small print under the card. */
  footnote?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

/** Centered card for the admin's sign-in and its «can't enter» states. */
export const AdminAuthCard = ({ title, description, footnote, className, children }: AdminAuthCardProps) => (
  <main className="flex min-h-dvh items-center justify-center bg-muted px-4 py-10">
    <div className={cn("flex w-full max-w-sm flex-col gap-4", className)}>
      <section
        aria-labelledby="admin-auth-title"
        className="flex flex-col gap-6 rounded-xl bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              адмінка
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 id="admin-auth-title" className="text-xl font-bold text-balance">
              {title}
            </h1>
            {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
          </div>
        </div>
        {children}
      </section>
      {footnote ? <p className="px-2 text-center text-sm text-muted-foreground">{footnote}</p> : null}
    </div>
  </main>
);
