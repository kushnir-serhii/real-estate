import { resolveUaPhone, type UaPhone } from "@/lib/format/format-phone";

// Mock data — replace with the agency's real contacts.
const MOCK_PHONE: UaPhone = {
  display: "+380 00 000 00 01",
  href: "tel:+380000000001",
  e164: "+380000000001",
};

/**
 * The agency phone: `NEXT_PUBLIC_AGENCY_PHONE` (E.164, e.g. `+380671234567`), or the mock when it is empty or not a
 * Ukrainian number. Inlined at build time, so a new value needs a rebuild. Every phone link and text on the site,
 * the JSON-LD and the Viber link read it from here.
 */
const PHONE = resolveUaPhone(process.env.NEXT_PUBLIC_AGENCY_PHONE, MOCK_PHONE);

export const CONTACTS = {
  phone: PHONE,
  email: "office@example.com",
  address: "м. Київ, вул. Хрещатик, 10",
  hours: "щодня 9:00–19:00",
  coordinates: { lat: 50.4483, lng: 30.5227 },
  messengers: {
    telegram: { label: "Telegram", url: "https://t.me/diplomathall_demo", enabled: true },
    viber: {
      label: "Viber",
      url: `viber://chat?number=${encodeURIComponent(PHONE.e164)}`,
      enabled: true,
    },
    whatsapp: { label: "WhatsApp", url: null, enabled: false },
  },
  socials: {
    instagram: { label: "Instagram", url: "" },
    facebook: { label: "Facebook", url: "" },
  },
} as const;
