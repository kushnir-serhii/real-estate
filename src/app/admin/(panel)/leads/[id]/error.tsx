"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ADMIN_LEADS_PATH } from "@/features/admin/leads/leads-params";
import { cn } from "@/lib/utils";

type AdminLeadErrorProps = { error: Error & { digest?: string }; reset: () => void };

const AdminLeadError = ({ reset }: AdminLeadErrorProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Refetch the server data, then re-render the segment.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <div className="flex flex-col items-start gap-6">
      <Link href={ADMIN_LEADS_PATH} className={cn(buttonVariants({ variant: "ghost" }), "-ml-3")}>
        <ArrowLeft aria-hidden="true" />
        До списку заявок
      </Link>
      <div className="flex flex-col items-start gap-4 rounded-xl border border-destructive/40 p-6">
        <div role="alert" className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-destructive">Не вдалося завантажити заявку</h1>
          <p className="max-w-prose text-muted-foreground">
            Можливо, зникло з&apos;єднання або база даних тимчасово недоступна. Заявка нікуди не
            зникла — спробуйте ще раз за хвилину.
          </p>
        </div>
        <Button type="button" onClick={retry} disabled={pending}>
          <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden="true" />
          Спробувати ще раз
        </Button>
      </div>
    </div>
  );
};

export default AdminLeadError;
