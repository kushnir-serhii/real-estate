import { DEMO_ADMIN } from "../session";
import { buildDemoSeed } from "./index";

/**
 * `supabase/seed.sql` generator: the demo seed (`buildDemoSeed`) rendered as SQL for `supabase db reset`.
 * Pure and deterministic: the seed is built at a fixed instant and every timestamp is written relative to
 * `now()` (`now() - interval '3 days'`), so the loaded data stays fresh. `pnpm seed:sql` writes the file;
 * a test fails when the committed file drifts from this output.
 */

const SEED_NOW = Date.UTC(2026, 10, 4, 12, 0, 0);

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type Row = Record<string, unknown>;

const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const UNITS: readonly (readonly [string, string, number])[] = [
  ["day", "days", 86_400_000],
  ["hour", "hours", 3_600_000],
  ["minute", "minutes", 60_000],
  ["second", "seconds", 1000],
  ["millisecond", "milliseconds", 1],
];

/** `now()`, `now() - interval '3 days'` or `now() + interval '1 day'` for an ISO instant of the fixed seed. */
const timestampSql = (iso: string): string => {
  const delta = SEED_NOW - Date.parse(iso);
  if (delta === 0) return "now()";
  const abs = Math.abs(delta);
  const [one, many, size] = UNITS.find(([, , ms]) => abs % ms === 0) ?? UNITS[UNITS.length - 1];
  const amount = abs / size;
  return `now() ${delta > 0 ? "-" : "+"} interval '${amount} ${amount === 1 ? one : many}'`;
};

type Found = { path: string[]; iso: string };

/** Replaces ISO instants inside a JSON value with `null` and records the paths it replaced. */
const extractTimestamps = (value: unknown, path: string[], found: Found[]): unknown => {
  if (typeof value === "string" && ISO_TIMESTAMP.test(value)) {
    found.push({ path, iso: value });
    return null;
  }
  if (Array.isArray(value)) return value.map((item, index) => extractTimestamps(item, [...path, String(index)], found));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, extractTimestamps(item, [...path, key], found)]),
    );
  }
  return value;
};

const jsonSql = (value: unknown): string => {
  const found: Found[] = [];
  const stripped = extractTimestamps(value, [], found);
  let sql = `${quote(JSON.stringify(stripped))}::jsonb`;
  for (const { path, iso } of found) {
    sql = `jsonb_set(${sql}, '{${path.join(",")}}', to_jsonb(${timestampSql(iso)}))`;
  }
  return sql;
};

const valueSql = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Seed SQL: non-finite number ${value}`);
    return String(value);
  }
  if (typeof value === "string") return ISO_TIMESTAMP.test(value) ? timestampSql(value) : quote(value);
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.length === 0 ? "'{}'" : `array[${value.map((item) => quote(item as string)).join(", ")}]`;
  }
  return jsonSql(value);
};

const insertSql = (table: string, rows: Row[]): string => {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  rows.forEach((row, index) => {
    const keys = Object.keys(row);
    if (keys.length !== columns.length || keys.some((key) => !columns.includes(key))) {
      throw new Error(`Seed SQL: row ${index} of ${table} has different columns than row 0`);
    }
  });
  const tuples = rows.map((row) => `  (${columns.map((column) => valueSql(row[column])).join(", ")})`);
  return `insert into public.${table} (${columns.join(", ")}) values\n${tuples.join(",\n")};\n`;
};

const section = (title: string): string => `-- ${title} ${"-".repeat(Math.max(3, 96 - title.length))}\n`;

/** Hand-written: the local sign-in users of the `supabase` driver (the demo driver needs none). */
const authSql = (): string => `${section("auth users (LOCAL ONLY, never run against production)")}-- ${DEMO_ADMIN.email} / admin12345 is the admin (the \`admins\` row below); user@example.com / user12345 is signed up but NOT an admin.
-- All token columns are '' (not null) or GoTrue fails to sign in.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000', ${quote(DEMO_ADMIN.userId)}, 'authenticated', 'authenticated',
    ${quote(DEMO_ADMIN.email)}, crypt('admin12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated',
    'user@example.com', crypt('user12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '');

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  (${quote(DEMO_ADMIN.userId)}, ${quote(DEMO_ADMIN.userId)},
    ${quote(JSON.stringify({ sub: DEMO_ADMIN.userId, email: DEMO_ADMIN.email, email_verified: true }))}, 'email', now(), now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2',
    '{"sub":"00000000-0000-4000-8000-0000000000b2","email":"user@example.com","email_verified":true}', 'email', now(), now(), now());
`;

const HEADER = `-- GENERATED by \`pnpm seed:sql\` from src/lib/demo/seed: don't edit by hand (a test fails when this file drifts).
-- Demo dataset for local development; runs after the migrations on \`supabase db reset\`.
-- Fictional agency (Diplomat Hall), listings, phones and addresses: nobody real is dialed (+380 00 000 00 0X, @example.com).
-- Photos are placeholders from public/placeholders. Dates are relative to now(), so the data stays fresh.
-- Never run against production (\`supabase db push\` doesn't run it).
-- Insert order follows the foreign keys; the hidden_at trigger keeps the explicit hidden_at of hidden listings
-- and clears it for drafts (never published); updated_at triggers fire on update only.
`;

export const generateSeedSql = (): string => {
  const seed = buildDemoSeed(SEED_NOW);

  const table = (title: string, name: string, rows: Row[]): string =>
    rows.length === 0 ? "" : `${section(title)}${insertSql(name, rows)}`;

  const parts = [
    HEADER,
    `${section("settings: the row exists (inserted by the migration); only the rates are set")}-- properties_source stays at the migration default (plektan), as before.
update public.settings set exchange_rates = ${jsonSql(seed.settings.exchange_rates)} where id;
`,
    table("agents", "agents", seed.agents),
    table("properties (price_usd / price_per_m2 are precomputed)", "properties", seed.properties),
    table("property_photos", "property_photos", seed.property_photos),
    table("pages", "pages", seed.pages),
    table("posts", "posts", seed.posts),
    table("post_properties", "post_properties", seed.post_properties),
    authSql(),
    table("admins", "admins", seed.admins),
    table("leads", "leads", seed.leads),
    table("ai_conversations", "ai_conversations", seed.ai_conversations),
    table("ai_messages", "ai_messages", seed.ai_messages),
    table("ai_usage", "ai_usage", seed.ai_usage),
  ];
  return `${parts.filter((part) => part !== "").join("\n").trimEnd()}\n`;
};
