import type { Metadata } from "next";

import { AdminAuthCard } from "@/features/admin/admin-auth-card";
import { AdminUnconfigured } from "@/features/admin/admin-unconfigured";
import { DemoSignIn } from "@/features/admin/demo-sign-in";
import { SignInForm } from "@/features/admin/sign-in-form";
import { hasPublicData, isDemoMode } from "@/lib/data-driver";

export const metadata: Metadata = { title: "Вхід" };

type SignInPageProps = { searchParams: Promise<{ next?: string | string[] }> };

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  if (!hasPublicData()) return <AdminUnconfigured />;

  const { next } = await searchParams;
  const nextValue = typeof next === "string" ? next : "";

  if (isDemoMode()) {
    return (
      <AdminAuthCard
        title="Вхід в демо-адмінку"
        description="Це демонстраційна версія: дані тестові, пароль не потрібен."
        footnote="Зміни, які ви зробите, видно на сайті й скидаються кнопкою «Скинути демо-дані» або після перезапуску."
      >
        <DemoSignIn next={nextValue} />
      </AdminAuthCard>
    );
  }

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
