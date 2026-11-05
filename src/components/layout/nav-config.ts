export const NAV_LINKS = [
  { href: "/catalog?deal=sell", label: "Купити", activePath: null },
  { href: "/catalog?deal=rent_long", label: "Орендувати", activePath: null },
  { href: "/about", label: "Про нас", activePath: "/about" },
  { href: "/contacts", label: "Контакти", activePath: "/contacts" },
] as const;

/** Extra classes for ghost icon buttons in the header: light text and a light hover while it is transparent over the hero. */
export const HEADER_ICON_CLASS =
  "on-hero:hover:bg-on-scrim/15 on-hero:hover:text-on-scrim";

export const CTA_LINK = {
  href: "/contacts#zv-yazok",
  label: "Залишити заявку",
} as const;
