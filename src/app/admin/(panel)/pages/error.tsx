"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

type AdminPagesErrorProps = { error: Error & { digest?: string }; reset: () => void };

const AdminPagesError = ({ reset }: AdminPagesErrorProps) => {
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
      <h1 className="text-2xl font-bold sm:text-3xl">Сторінки</h1>
      <div className="flex flex-col items-start gap-4 rounded-xl border border-destructive/40 p-6">
        <div role="alert" className="flex flex-col gap-2">
          <p className="font-medium text-destructive">Не вдалося завантажити сторінки</p>
          <p className="max-w-prose text-muted-foreground">
            Можливо, зникло з&apos;єднання або база даних тимчасово недоступна. Сайт працює як і раніше — спробуйте
            ще раз за хвилину.
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

export default AdminPagesError;
