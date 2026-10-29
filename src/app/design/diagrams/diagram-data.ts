/** Data for the dev-only diagrams page. Mirrors docs/diagrams.md. */

export type Layer = {
  title: string;
  hint: string;
  items: { name: string; note: string }[];
};

export const LAYERS: Layer[] = [
  {
    title: "Користувачі",
    hint: "Хто користується системою",
    items: [
      { name: "Відвідувач", note: "каталог, обране, заявка" },
      { name: "Адмін", note: "заявки, об’єкти, фото, налаштування" },
      { name: "Cron", note: "ретрай заявок, синхронізація" },
    ],
  },
  {
    title: "Next.js (Cloudflare Workers)",
    hint: "src/app + src/features",
    items: [
      { name: "Сторінки сайту", note: "/, /catalog, /catalog/[slug], /favorites" },
      { name: "Сторінки адмінки", note: "/admin/leads, /properties, /settings" },
      { name: "Server actions", note: "submitLead, saveProperty, switchSource" },
      { name: "Route handlers", note: "/api/cron/*, /api/admin/photos" },
    ],
  },
  {
    title: "Бізнес-логіка і клієнти",
    hint: "src/lib",
    items: [
      { name: "lib/db", note: "репозиторії Supabase, права property-permissions" },
      { name: "lib/sync", note: "runSync, mapProperty, sync-photos" },
      { name: "features/leads", note: "submit-lead → deliver-lead → retry-leads" },
      { name: "Клієнти зі fixture-режимом", note: "plektan, telegram, geocode, turnstile" },
    ],
  },
  {
    title: "Сховища",
    hint: "Основа системи — працює і без CRM",
    items: [
      { name: "Supabase Postgres", note: "properties, photos, leads, settings + RLS" },
      { name: "Supabase Auth", note: "вхід адміна" },
      { name: "Cloudflare R2", note: "фото WebP у 2–3 розмірах" },
    ],
  },
  {
    title: "Зовнішні сервіси",
    hint: "Необов’язкові: збій не губить заявку",
    items: [
      { name: "Plektan CRM", note: "search / view / addAdvert" },
      { name: "Telegram Bot", note: "сповіщення менеджеру" },
      { name: "Turnstile", note: "захист від спаму" },
      { name: "Геокодер", note: "координати з адреси" },
    ],
  },
];

export type Entity = {
  name: string;
  note: string;
  fields: string[];
  relations: string[];
};

export const ENTITIES: Entity[] = [
  {
    name: "Property",
    note: "Квартира, будинок, комерція, ділянка",
    fields: ["source: plektan | admin", "status: published | hidden", "deal, property_type", "price_amount, currency, price_usd", "area_total, room_count", "lat, lng, slug, seo_*"],
    relations: ["1 → N PropertyPhoto (cascade)", "N → 0..1 Agent (set null)"],
  },
  {
    name: "PropertyPhoto",
    note: "Фото в R2, впорядковані",
    fields: ["position (unique per property)", "r2_key", "sizes: { width: key }", "width, height", "source_url"],
    relations: ["N → 1 Property"],
  },
  {
    name: "Lead",
    note: "Заявка відвідувача",
    fields: ["kind: property_request | general | ai", "name, phone, email, message", "consent_at, client_request_id (unique)", "plektan_status / attempts / item_id", "telegram_status / attempts"],
    relations: ["N → 0..1 Property (set null)"],
  },
  {
    name: "Agent",
    note: "Контактна особа об’єкта",
    fields: ["source, external_id", "name, phones[]", "is_active"],
    relations: ["1 → N Property"],
  },
  {
    name: "Settings",
    note: "Один рядок налаштувань",
    fields: ["properties_source: plektan | admin", "exchange_rates", "sync_cursor"],
    relations: ["визначає, хто пише Property"],
  },
  {
    name: "Page / Admin",
    note: "Статичний контент і доступ",
    fields: ["Page: slug, title, body, seo_*", "Admin: user_id → auth.users, email"],
    relations: [],
  },
];

export type Flow = {
  id: string;
  title: string;
  summary: string;
  participants: string[];
  /** `from`/`to` index into `participants`; `back` draws a dashed return arrow. */
  steps: { from: number; to: number; label: string; back?: boolean }[];
};

export const FLOWS: Flow[] = [
  {
    id: "lead",
    title: "Заявка відвідувача",
    summary: "Спочатку зберігаємо в Supabase, потім Plektan і Telegram після відповіді.",
    participants: ["Відвідувач", "Server action", "Turnstile", "Supabase", "Plektan", "Telegram"],
    steps: [
      { from: 0, to: 1, label: "форма + consent + токен" },
      { from: 1, to: 1, label: "honeypot, валідація" },
      { from: 1, to: 2, label: "verifyTurnstile" },
      { from: 2, to: 1, label: "ok", back: true },
      { from: 1, to: 3, label: "createLead (unique client_request_id)" },
      { from: 1, to: 0, label: "ok — екран успіху", back: true },
      { from: 1, to: 4, label: "after(): addAdvert" },
      { from: 1, to: 5, label: "after(): sendMessage" },
      { from: 1, to: 3, label: "статуси, спроби, next_attempt_at" },
    ],
  },
  {
    id: "retry",
    title: "Ретрай доставки (cron)",
    summary: "Повторює лише pending/failed канали, алертить на вичерпані спроби.",
    participants: ["Cron", "/api/cron/leads", "Supabase", "Plektan", "Telegram"],
    steps: [
      { from: 0, to: 1, label: "POST + cron secret" },
      { from: 1, to: 2, label: "заявки з due-каналом" },
      { from: 1, to: 3, label: "addAdvert (якщо due)" },
      { from: 1, to: 4, label: "sendMessage (якщо due)" },
      { from: 1, to: 2, label: "зберегти статус і backoff" },
      { from: 1, to: 0, label: "200 summary", back: true },
    ],
  },
  {
    id: "sync",
    title: "Синхронізація Plektan",
    summary: "Лише коли properties_source = plektan. Усе читається до першого запису.",
    participants: ["Cron", "runSync", "Plektan", "Геокодер", "R2", "Supabase"],
    steps: [
      { from: 0, to: 1, label: "runSync(mode)" },
      { from: 1, to: 5, label: "getSettings → перевірка джерела" },
      { from: 1, to: 2, label: "getContactPersons, search(after_date)" },
      { from: 1, to: 2, label: "view(adid) для змінених" },
      { from: 1, to: 3, label: "geocode, якщо немає координат" },
      { from: 1, to: 4, label: "копіювання фото" },
      { from: 1, to: 5, label: "upsert property + photos" },
      { from: 1, to: 5, label: "сховати зниклі, зсунути курсор" },
      { from: 1, to: 0, label: "summary + теги кешу", back: true },
    ],
  },
  {
    id: "photo",
    title: "Завантаження фото",
    summary: "Тільки в режимі admin; при збої БД файли в R2 відкочуються.",
    participants: ["Адмін (браузер)", "/api/admin/photos", "Supabase", "R2"],
    steps: [
      { from: 0, to: 0, label: "перевірка і ресайз" },
      { from: 0, to: 1, label: "multipart: property_id, w<N>" },
      { from: 1, to: 2, label: "requireAdmin, settings, ліміт" },
      { from: 1, to: 1, label: "тип, розмір, magic bytes" },
      { from: 1, to: 3, label: "putObject × розміри" },
      { from: 1, to: 2, label: "appendPhoto" },
      { from: 1, to: 3, label: "deleteObjects (якщо збій)" },
      { from: 1, to: 0, label: "{ ok, photo }", back: true },
    ],
  },
];
