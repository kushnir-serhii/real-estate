import type { Metadata } from "next";

import { FavoritesList } from "@/features/favorites/favorites-list";

export const metadata: Metadata = {
  title: "Обране",
  robots: { index: false, follow: true },
  alternates: { canonical: "/favorites" },
};

const FavoritesPage = () => (
  <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
    <h1 className="text-2xl font-bold text-balance sm:text-3xl">Обране</h1>
    <p className="mt-2 text-sm text-muted-foreground">
      Список зберігається лише на цьому пристрої, у цьому браузері.
    </p>
    <div className="mt-6">
      <FavoritesList />
    </div>
  </div>
);

export default FavoritesPage;
