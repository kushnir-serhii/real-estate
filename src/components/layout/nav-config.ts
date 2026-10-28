export const NAV_LINKS = [
  { href: "/catalog?deal=sell", label: "Купити", activePath: null },
  { href: "/catalog?deal=rent_long", label: "Орендувати", activePath: null },
  { href: "/about", label: "Про нас", activePath: "/about" },
  { href: "/contacts", label: "Контакти", activePath: "/contacts" },
] as const;

export const CTA_LINK = {
  href: "/contacts#zv-yazok",
  label: "Залишити заявку",
} as const;
