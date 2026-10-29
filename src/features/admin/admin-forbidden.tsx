import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AdminAuthCard } from "./admin-auth-card";
import { SignOutButton } from "./sign-out-button";

type AdminForbiddenProps = { email: string };

/** Signed in, but the account isn't in `admins`. */
export const AdminForbidden = ({ email }: AdminForbiddenProps) => (
  <AdminAuthCard
    title="Немає доступу"
    description={
      <p>
        {email ? (
          <>
            Акаунт <span className="font-medium break-all text-foreground">{email}</span> не має доступу до
            адмінки.
          </>
        ) : (
          "Цей акаунт не має доступу до адмінки."
        )}{" "}
        Якщо доступ потрібен, зверніться до адміністратора агенції, або увійдіть з іншим акаунтом.
      </p>
    }
  >
    <div className="flex flex-col gap-2 sm:flex-row">
      <SignOutButton className="w-full sm:w-auto" />
      <Button asChild variant="ghost" className="w-full sm:w-auto">
        <Link href="/">На сайт</Link>
      </Button>
    </div>
  </AdminAuthCard>
);
