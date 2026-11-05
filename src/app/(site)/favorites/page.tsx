import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { FAVORITES_PAGE } from "@/constants/inner-pages";
import { FavoritesList } from "@/features/favorites/favorites-list";
import { FavoritesSuggestions } from "@/features/favorites/favorites-suggestions";

export const metadata: Metadata = {
  title: "Обране",
  robots: { index: false, follow: true },
  alternates: { canonical: "/favorites" },
};

const FavoritesPage = () => (
  <div>
    <PageHeader eyebrow={FAVORITES_PAGE.eyebrow} title={FAVORITES_PAGE.title} lead={FAVORITES_PAGE.lead} />
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:pb-24">
      <FavoritesList suggestions={<FavoritesSuggestions />} />
    </div>
  </div>
);

export default FavoritesPage;
