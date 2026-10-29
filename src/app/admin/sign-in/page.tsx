import type { Metadata } from "next";

import { AdminAuthCard } from "@/features/admin/admin-auth-card";
import { AdminUnconfigured } from "@/features/admin/admin-unconfigured";
import { SignInForm } from "@/features/admin/sign-in-form";
import { getSupabasePublicEnvOrNull } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Вхід" };

type SignInPageProps = { searchParams: Promise<{ next?: string | string[] }> };

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  if (getSupabasePublicEnvOrNull() === null) return <AdminUnconfigured />;

  const { next } = await searchParams;
  const nextValue = typeof next === "string" ? next : "";

  return (
    <AdminAuthCard
      title="Вхід в адмінку"
      footnote="Доступ лише для працівників агенції. Забули пароль — зверніться до адміністратора."
    >
      <SignInForm next={nextValue} />
    </AdminAuthCard>
  );
};

export default SignInPage;
