import type { PageSlug } from "@/constants/pages";

export const ADMIN_PAGES_PATH = "/admin/pages";

export const adminPageHref = (slug: PageSlug) => `${ADMIN_PAGES_PATH}/${slug}`;

/** Admin names of the pages (stable, unlike the editable title). */
export const PAGE_NAMES: Record<PageSlug, string> = {
  home: "Головна",
  about: "Про агентство",
  contacts: "Контакти",
  privacy: "Політика конфіденційності",
};

/** Where the title and the text show up on the site. */
export const PAGE_CONTENT_HINTS: Record<PageSlug, string> = {
  home: "Заголовок — великий напис на першому екрані головної. Текст — блок про агентство під новими пропозиціями.",
  about: "Заголовок і текст сторінки «Про агентство».",
  contacts: "Заголовок і вступний текст над контактами, формою заявки й картою (їх змінюють у коді).",
  privacy: "Заголовок і повний текст політики конфіденційності.",
};
