// Mock — replace for the real agency.
export const BRAND = {
  name: "Sofiacity",
  tagline: "Агентство нерухомості: допомагаємо купити, продати та орендувати житло.",
  siteTitle: "Sofiacity — агентство нерухомості",
  siteDescription:
    "Sofiacity — агентство нерухомості: купівля, продаж та оренда квартир і будинків. Допоможемо знайти житло та оформити угоду.",
} as const;

// Mock — a solid-colour placeholder; replace public/og-default.png with the real branded 1200x630 image.
export const OG_DEFAULT_IMAGE = {
  url: "/og-default.png",
  width: 1200,
  height: 630,
  alt: BRAND.siteTitle,
} as const;
