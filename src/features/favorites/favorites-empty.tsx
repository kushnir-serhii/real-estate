import { ArrowRight, Heart } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const FavoritesEmpty = () => (
  <div className="flex flex-col items-start gap-5 rounded-2xl border border-dashed border-control bg-card p-6 sm:p-10">
    <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-dawn text-dawn-foreground">
      <Heart className="size-6" />
    </span>
    <div className="flex flex-col gap-2">
      <h2 className="text-h3">Поки що нічого не збережено</h2>
      <p className="max-w-prose text-muted-foreground">
        Тут з&apos;являться об&apos;єкти, які ви збережете. Натисніть ♡ на картці.
      </p>
    </div>
    <Link href="/catalog" className={buttonVariants({ variant: "dawn", size: "lg" })}>
      До каталогу
      <ArrowRight data-icon="inline-end" aria-hidden="true" />
    </Link>
  </div>
);
