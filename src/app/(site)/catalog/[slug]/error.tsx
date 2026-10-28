"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

type PropertyErrorProps = { error: Error & { digest?: string }; reset: () => void };

const PropertyError = ({ reset }: PropertyErrorProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Refetch the server data, then re-render the segment.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
      <div role="alert" className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-bold">Не вдалося відкрити об&apos;єкт</h1>
        <p className="text-muted-foreground">
          Щось пішло не так під час завантаження сторінки. Спробуйте ще раз або перегляньте інші
          пропозиції в каталозі.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={retry} disabled={pending}>
          <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden="true" />
          Спробувати ще раз
        </Button>
        <Link href="/catalog" className={buttonVariants({ variant: "outline" })}>
          До каталогу
        </Link>
      </div>
    </div>
  );
};

export default PropertyError;
