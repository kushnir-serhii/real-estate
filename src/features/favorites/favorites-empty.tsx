import { Heart } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const FavoritesEmpty = () => (
  <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border p-6">
    <Heart className="size-8 text-muted-foreground" aria-hidden="true" />
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Поки що нічого не збережено</h2>
      <p className="max-w-prose text-muted-foreground">
        Тут з&apos;являться об&apos;єкти, які ви збережете. Натисніть ♡ на картці.
      </p>
    </div>
    <Link href="/catalog" className={buttonVariants()}>
      До каталогу
    </Link>
  </div>
);
