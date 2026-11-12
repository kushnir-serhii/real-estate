import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type LeadRow = Tables["leads"]["Row"];
type ConversationRow = Tables["ai_conversations"]["Row"];
type MessageRow = Tables["ai_messages"]["Row"];

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Stable ids so the admin links and tests survive a reset. */
const leadId = (n: number): string => `00000000-0000-4000-8003-${String(n).padStart(12, "0")}`;
const requestId = (n: number): string => `00000000-0000-4000-8004-${String(n).padStart(12, "0")}`;
const conversationId = (n: number): string => `00000000-0000-4000-8005-${String(n).padStart(12, "0")}`;
const messageId = (n: number): string => `00000000-0000-4000-8006-${String(n).padStart(12, "0")}`;
const PROPOSAL_ID = "00000000-0000-4000-8007-000000000001";

/** Slugs of seeded listings the sample leads point at (the seed throws if one disappears). */
const SLUG_OBOLON = "2-kimnatna-kvartyra-na-oboloni-3f9a1c";
const SLUG_PODIL = "2-kimnatna-kvartyra-na-podoli-52c7d8";
const SLUG_BEREZNIAKY = "1-kimnatna-kvartyra-na-berezniakakh-9a5d02";
const SLUG_RENT = "1-kimnatna-kvartyra-v-orendu-saksahanskoho-0a6b93";

type SeedLeadsResult = {
  leads: LeadRow[];
  ai_conversations: ConversationRow[];
  ai_messages: MessageRow[];
};

/**
 * Sample leads for the admin: every kind and delivery state, one `ai` lead linked to a sample conversation with
 * messages and the stored proposal. Contacts are fake (`@example.com`, `+380 00 000 00 0X`).
 * `propertyIdBySlug` resolves the listings the leads refer to.
 */
export const buildSeedLeads = (now: number, propertyIdBySlug: ReadonlyMap<string, string>): SeedLeadsResult => {
  const iso = (msAgo: number): string => new Date(now - msAgo).toISOString();
  const idOf = (slug: string): string => {
    const id = propertyIdBySlug.get(slug);
    if (!id) throw new Error(`Demo seed: lead refers to unknown property "${slug}"`);
    return id;
  };

  const base = (n: number, msAgo: number): Pick<
    LeadRow,
    | "id"
    | "client_request_id"
    | "created_at"
    | "updated_at"
    | "consent_at"
    | "plektan_error"
    | "plektan_item_id"
    | "plektan_next_attempt_at"
    | "plektan_alerted_at"
    | "telegram_alerted_at"
    | "telegram_error"
    | "telegram_next_attempt_at"
    | "utm"
    | "email"
    | "message"
    | "payload"
    | "page_url"
    | "property_id"
  > => ({
    id: leadId(n),
    client_request_id: requestId(n),
    created_at: iso(msAgo),
    updated_at: iso(msAgo),
    consent_at: iso(msAgo),
    plektan_error: null,
    plektan_item_id: null,
    plektan_next_attempt_at: null,
    plektan_alerted_at: null,
    telegram_alerted_at: null,
    telegram_error: null,
    telegram_next_attempt_at: null,
    utm: null,
    email: null,
    message: null,
    payload: null,
    page_url: null,
    property_id: null,
  });

  const leads: LeadRow[] = [
    {
      ...base(1, 3 * HOUR_MS),
      kind: "property_request",
      name: "Ірина Шевченко",
      phone: "+380 00 000 00 01",
      email: "iryna@example.com",
      message: "Чи можна подивитися квартиру на вихідних?",
      property_id: idOf(SLUG_OBOLON),
      page_url: `/catalog/${SLUG_OBOLON}`,
      utm: { utm_source: "google", utm_medium: "cpc" },
      plektan_status: "sent",
      plektan_attempts: 1,
      plektan_item_id: "demo-advert-1001",
      telegram_status: "sent",
      telegram_attempts: 1,
    },
    {
      ...base(2, 1 * DAY_MS),
      kind: "property_request",
      name: "Максим Бондар",
      phone: "+380 00 000 00 02",
      property_id: idOf(SLUG_PODIL),
      page_url: `/catalog/${SLUG_PODIL}`,
      plektan_status: "failed",
      plektan_attempts: 2,
      plektan_error: "Plektan: request timed out",
      plektan_next_attempt_at: iso(-1 * DAY_MS),
      telegram_status: "sent",
      telegram_attempts: 1,
    },
    {
      ...base(3, 2 * DAY_MS),
      kind: "general",
      name: "Олександра Мазур",
      phone: "+380 00 000 00 03",
      email: "oleksandra@example.com",
      message: "Шукаю двокімнатну квартиру до 90 000 $ у спокійному районі.",
      payload: { deal: "sell", property_type: "flat" },
      page_url: "/contacts",
      plektan_status: "skipped",
      plektan_attempts: 0,
      telegram_status: "skipped",
      telegram_attempts: 0,
    },
    {
      ...base(4, 4 * DAY_MS),
      kind: "general",
      name: "Тарас Гнатюк",
      phone: "+380 00 000 00 04",
      payload: {
        deal: "rent_long",
        property_type: "flat",
        similar_to: { id: idOf(SLUG_RENT), slug: SLUG_RENT, title: "1-кімнатна квартира в оренду на Саксаганського" },
      },
      page_url: `/catalog/${SLUG_RENT}`,
      plektan_status: "sent",
      plektan_attempts: 1,
      plektan_item_id: "demo-advert-1002",
      telegram_status: "failed",
      telegram_attempts: 3,
      telegram_error: "Telegram: bad gateway",
      telegram_next_attempt_at: iso(-3 * HOUR_MS),
    },
    {
      ...base(5, 5 * HOUR_MS),
      kind: "ai",
      name: "Наталія Кравчук",
      phone: "+380 00 000 00 05",
      email: "nataliia@example.com",
      property_id: null,
      payload: {
        deal: "sell",
        property_type: "flat",
        districts: ["Оболонь", "Березняки"],
        rooms: ["1", "2"],
        budget: { from: 50000, to: 90000, currency: "USD" },
        payment: "mortgage",
        timing: "протягом двох місяців",
        summary: "Шукає 1–2-кімнатну квартиру на Оболоні або Березняках до 90 000 $, купівля в іпотеку.",
        conversation_id: conversationId(1),
      },
      page_url: "/",
      plektan_status: "sent",
      plektan_attempts: 1,
      plektan_item_id: "demo-advert-1003",
      telegram_status: "sent",
      telegram_attempts: 1,
    },
  ];

  const startedAt = 5 * HOUR_MS + 12 * MINUTE_MS;
  const proposal = {
    proposal_id: PROPOSAL_ID,
    summary: "Шукає 1–2-кімнатну квартиру на Оболоні або Березняках до 90 000 $, купівля в іпотеку.",
    wishes: {
      deal: "sell",
      property_type: "flat",
      districts: ["Оболонь", "Березняки"],
      rooms: ["1", "2"],
      budget: { from: 50000, to: 90000, currency: "USD" },
      payment: "mortgage",
      timing: "протягом двох місяців",
    },
    created_at: iso(5 * HOUR_MS + 4 * MINUTE_MS),
  };

  const ai_conversations: ConversationRow[] = [
    {
      id: conversationId(1),
      created_at: iso(startedAt),
      updated_at: iso(5 * HOUR_MS),
      page_url: "/",
      property_id: null,
      lead_id: leadId(5),
      proposal,
      message_count: 7,
      input_tokens: 2140,
      output_tokens: 410,
      cost_usd: 0.0009,
      ip_hash: null,
      turnstile_ok: true,
    },
  ];

  const found = JSON.stringify({
    total: 2,
    shown: 2,
    items: [
      { title: "2-кімнатна квартира на Оболоні, просп. Володимира Івасюка", url: `/catalog/${SLUG_OBOLON}`, price: "78 000 $" },
      { title: "1-кімнатна квартира на Березняках", url: `/catalog/${SLUG_BEREZNIAKY}`, price: "52 000 $" },
    ],
  });

  const transcript: Pick<MessageRow, "role" | "content" | "data">[] = [
    { role: "user", content: "Добрий день! Шукаю квартиру на Оболоні або Березняках.", data: null },
    {
      role: "assistant",
      content: "",
      data: { tool_calls: [{ id: "call_demo_1", name: "search_properties", arguments: "{}" }] },
    },
    { role: "tool", content: found, data: { tool_call_id: "call_demo_1", name: "search_properties" } },
    { role: "assistant", content: "Знайшла два варіанти в цих районах. Який у вас бюджет і як плануєте платити?", data: null },
    { role: "user", content: "До 90 тисяч доларів, візьму іпотеку. Хочу переїхати протягом двох місяців.", data: null },
    {
      role: "tool",
      content: '{"status":"card_shown"}',
      data: { tool_call_id: "call_demo_2", name: "propose_lead" },
    },
    { role: "assistant", content: "Дякую! Перевірте картку та залиште контакти: менеджер зателефонує вам.", data: null },
  ];

  const ai_messages: MessageRow[] = transcript.map((message, index) => ({
    id: messageId(index + 1),
    conversation_id: conversationId(1),
    role: message.role,
    content: message.content,
    data: message.data,
    client_message_id: null,
    created_at: iso(startedAt - (index + 1) * MINUTE_MS),
  }));

  return { leads, ai_conversations, ai_messages };
};
