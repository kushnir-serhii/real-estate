"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ADMIN_PROPERTIES_PATH } from "@/features/admin/properties/properties-params";
import { cn } from "@/lib/utils";

type AdminPropertyErrorProps = { error: Error & { digest?: string }; reset: () => void };

const AdminPropertyError = ({ reset }: AdminPropertyErrorProps) => {
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
      <Link href={ADMIN_PROPERTIES_PATH} className={cn(buttonVariants({ variant: "ghost" }), "-ml-3")}>
        <ArrowLeft aria-hidden="true" />
        До списку об&apos;єктів
      </Link>
      <div className="flex flex-col items-start gap-4 rounded-xl border border-destructive/40 p-6">
        <div role="alert" className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-destructive">Не вдалося завантажити об&apos;єкт</h1>
          <p className="max-w-prose text-muted-foreground">
            Можливо, зникло з&apos;єднання або база даних тимчасово недоступна. Дані нікуди не зникли — спробуйте ще
            раз за хвилину.
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

export default AdminPropertyError;
