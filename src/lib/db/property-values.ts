import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

// Postgres enums (source of truth: generated types). Arrays feed zod and UI option lists.
export const DEALS = ["sell", "rent_long", "rent_day"] as const satisfies readonly Enums["deal"][];
export const PROPERTY_TYPES = [
  "flat",
  "house",
  "commercial",
  "plot",
] as const satisfies readonly Enums["property_type"][];
export const CURRENCIES = ["UAH", "USD", "EUR"] as const satisfies readonly Enums["currency"][];

// Plektan value lists (docs/reference/plektan-api.md). Stored as text, so a new value needs no migration.
export const PROP_KINDS = [
  // flat
  "isolated", "apartments", "penthouse", "studio", "gostinka", "another_sleeping", "unfinished_new_build",
  // house
  "single", "part", "town_house", "palace", "holiday_home", "unfinished",
  // plot
  "dilapidated_house", "dacha", "construction_residential", "construction_non_residential",
  "private_house_building", "agricultural_purposes", "island",
  // commercial
  "office_in_house", "office_center", "office_free", "office_premise", "pavilion", "pharmacy", "shop",
  "supermarket", "mart", "trade_premise", "restaurant", "cafe", "bar", "pizzeria", "restaurant-fastfood",
  "catering_object", "dry_cleaners", "beauty_parlor", "hairdressing_saloon", "dental_office", "clinic",
  "car_service", "fitness_center", "service_object", "club", "theatre", "cinema", "bowling", "night_club",
  "culture_object", "storehouse", "production_area", "industrial_complex", "garage", "hotel", "hostel",
  "agricultural object", "other_infrastructure", "unfinished_object",
] as const;
export const REPAIRS = [
  "without_repair", "no_internal_works", "without_finishing", "cosmetic", "partial", "major", "evro",
  "architectural_design",
] as const;
export const WALL_MATERIALS = [
  "panel", "brick", "gas_block", "cinder_block", "monolit_carcas", "foam_concrete", "keramzit_concrete",
  "poroterm", "rakushnik_brick", "wood_brick", "wood",
] as const;
export const HOUSING_CLASSES = ["econom", "business", "elit"] as const;

export const propKindSchema = z.enum(PROP_KINDS);
export const repairSchema = z.enum(REPAIRS);
export const wallMaterialSchema = z.enum(WALL_MATERIALS);
export const housingClassSchema = z.enum(HOUSING_CLASSES);

export type PropKind = z.infer<typeof propKindSchema>;
export type Repair = z.infer<typeof repairSchema>;
export type WallMaterial = z.infer<typeof wallMaterialSchema>;
export type HousingClass = z.infer<typeof housingClassSchema>;
