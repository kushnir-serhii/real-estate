export const NAV_LINKS = [
  { href: "/catalog?deal=sell", label: "Купити", activePath: null },
  { href: "/catalog?deal=rent_long", label: "Орендувати", activePath: null },
  { href: "/about", label: "Про нас", activePath: "/about" },
  { href: "/blog", label: "Блог", activePath: "/blog" },
  { href: "/contacts", label: "Контакти", activePath: "/contacts" },
] as const;

/**
 * A desktop nav item (links and the phone): text in the header colour, a 2px underline in the current text colour
 * growing from the centre on hover / focus / when active. Lives here, not in the client `NavLink`, so the server
 * header can use it for the phone link.
 */
export const NAV_ITEM_CLASS = [
  "relative inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-foreground outline-none transition-colors duration-(--duration-base) on-hero:text-on-scrim focus-visible:ring-3 focus-visible:ring-ring/50",
  "after:absolute after:inset-x-3 after:bottom-2 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-(--duration-base) after:ease-out-soft hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none",
].join(" ");

/** Extra classes for ghost icon buttons in the header: light text and a light hover while it is transparent over the hero. */
export const HEADER_ICON_CLASS =
  "on-hero:hover:bg-on-scrim/15 on-hero:hover:text-on-scrim";

export const CTA_LINK = {
  href: "/contacts#zv-yazok",
  label: "Залишити заявку",
} as const;
