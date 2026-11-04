import type { Database } from "@/lib/supabase/database.types";

type AgentRow = Database["public"]["Tables"]["agents"]["Row"];

export const SEED_AGENT_KEYS = ["a1", "a2", "a3"] as const;
export type SeedAgentKey = (typeof SEED_AGENT_KEYS)[number];

/** Same ids as supabase/seed.sql. `a3` is inactive: hidden from the public agent list, still the agent of some listings. */
export const SEED_AGENTS: Record<SeedAgentKey, Omit<AgentRow, "created_at" | "updated_at">> = {
  a1: {
    id: "00000000-0000-4000-8000-0000000000a1",
    source: "admin",
    external_id: null,
    name: "Олена Коваленко",
    phones: ["+380 00 000 00 01"],
    email: "o.kovalenko@example.com",
    photo_url: null,
    is_active: true,
  },
  a2: {
    id: "00000000-0000-4000-8000-0000000000a2",
    source: "admin",
    external_id: null,
    name: "Андрій Мельник",
    phones: ["+380 00 000 00 02", "+380 67 000 00 12"],
    email: "a.melnyk@example.com",
    photo_url: null,
    is_active: true,
  },
  a3: {
    id: "00000000-0000-4000-8000-0000000000a3",
    source: "admin",
    external_id: null,
    name: "Ірина Савченко",
    phones: ["+380 00 000 00 03"],
    email: "i.savchenko@example.com",
    photo_url: null,
    is_active: false,
  },
};
