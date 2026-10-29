import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ADMIN_NAV } from "./admin-nav";
import { AdminNavLink } from "./admin-nav-link";
import { SignOutButton } from "./sign-out-button";

type AdminHeaderProps = { email: string };

/**
 * One row from `sm`; at 375px two rows: brand + sections, then the account (email, theme, «Вийти»).
 * DOM order matches the visual order in both layouts.
 */
export const AdminHeader = ({ email }: AdminHeaderProps) => (
  <header className="border-b bg-background sm:sticky sm:top-0 sm:z-40">
    <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 px-4 sm:flex-nowrap">
      <div className="flex shrink-0 items-center gap-2">
        <Logo />
        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          адмінка
        </span>
      </div>

      <nav aria-label="Розділи адмінки" className="min-w-0">
        <ul className="flex flex-wrap items-center gap-1">
          {ADMIN_NAV.map((item) => (
            <li key={item.href}>
              <AdminNavLink href={item.href}>{item.label}</AdminNavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 basis-full items-center gap-2 border-t py-2 sm:ml-auto sm:basis-auto sm:border-t-0">
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground sm:max-w-64" title={email}>
          <span className="sr-only">Ви увійшли як </span>
          {email}
        </span>
        <ThemeToggle />
        <SignOutButton className="max-sm:px-3 max-sm:[&_svg]:hidden" />
      </div>
    </div>
  </header>
);
