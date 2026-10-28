export const SITE_CONFIG = {
  name: "Lyndrik",
  tagline: "Агентство нерухомості: допомагаємо купити, продати та орендувати житло.",
  phone: {
    display: "+380 67 000 00 01",
    href: "tel:+380670000001",
  },
  email: "office@lyndrik.example",
  address: "м. Київ, вул. Хрещатик, 10",
  hours: "щодня 9:00–19:00",
  coordinates: { lat: 50.4483, lng: 30.5227 },
  messengers: {
    telegram: { label: "Telegram", url: "https://t.me/lyndrik", enabled: true },
    viber: {
      label: "Viber",
      url: "viber://chat?number=%2B380670000001",
      enabled: true,
    },
    whatsapp: { label: "WhatsApp", url: null, enabled: false },
  },
  socials: {
    instagram: { label: "Instagram", url: "" },
    facebook: { label: "Facebook", url: "" },
  },
} as const;
