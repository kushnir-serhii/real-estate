import { AdminAuthCard } from "./admin-auth-card";

/** Supabase env is empty: the admin can't work yet. Shown instead of crashing. */
export const AdminUnconfigured = () => (
  <AdminAuthCard
    title="Адмінку ще не підключено"
    description="Адмінка запрацює, щойно для сайту вкажуть ключі бази даних Supabase. Сайт для відвідувачів при цьому працює як завжди."
    footnote={
      <>
        Як це зробити, описано в <code className="font-mono text-foreground">docs/setup.md</code>.
      </>
    }
  />
);
