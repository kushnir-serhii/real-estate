/**
 * Recorded-shape Plektan data for fixture mode (no API key). Two snapshots:
 * `base`, and `next` where 1002 is gone, 1001 has a new price and 1013 is new.
 * Photo names match files in public/placeholders/ (the sync's photo step reads them in fixture mode).
 * `next` also drops 1001's kitchen photo.
 */

export type FixtureDef = {
  adid: string;
  deal: "sell" | "rent_long" | "rent_day";
  property: "flat" | "house" | "commercial" | "plot";
  prop_kind: string;
  date_add: string;
  date_mod: string;
  /** Price as Plektan sends it: text, with HTML entities. */
  price: { value: string; value_m2?: string; kind: "all" | "m2"; currency_id: "1" | "2" | "3" };
  area_total?: number;
  area_lot?: number;
  area_life?: number;
  room_count?: number;
  storey?: number;
  storeys?: number;
  repair?: string;
  locality: string;
  district?: string;
  street: string;
  housestr: string;
  promo_text: string;
  photos: string[];
  users: string[];
  is_mls?: boolean;
};

export type FixtureUser = {
  user_id: string;
  name: string;
  greeting: string;
  phones: string[];
  email: string;
  url_small: string;
  site_id: string;
};

export type FixtureDistrict = {
  value: string;
  caption: string;
  children?: FixtureDistrict[];
};

export const FIXTURE_SETS = ["base", "next"] as const;
export type FixtureSet = (typeof FIXTURE_SETS)[number];

export const FIXTURE_PHOTO_BASE_URL = "https://plektan.example/photos";

// currency_id: 1 = UAH, 2 = USD, 3 = EUR (Plektan's own ids are unverified; the sync reads the text).

export const FIXTURE_USERS: FixtureUser[] = [
  {
    user_id: "501",
    name: "Олена Коваленко",
    greeting: "Допоможу знайти квартиру в Києві",
    phones: ["+380501112233", "+380671112233"],
    email: "olena@lyndrik.example",
    url_small: "https://plektan.example/agents/501.jpg",
    site_id: "9001",
  },
  {
    user_id: "502",
    name: "Андрій Мельник",
    greeting: "Будинки та ділянки Київщини",
    phones: ["+380502223344"],
    email: "andrii@lyndrik.example",
    url_small: "https://plektan.example/agents/502.jpg",
    site_id: "9002",
  },
  {
    user_id: "503",
    name: "Ірина Шевчук",
    greeting: "Комерційна нерухомість",
    phones: ["+380503334455"],
    email: "iryna@lyndrik.example",
    url_small: "https://plektan.example/agents/503.jpg",
    site_id: "9003",
  },
];

export const FIXTURE_DISTRICTS: FixtureDistrict[] = [
  {
    value: "10",
    caption: "Київ",
    children: [
      { value: "101", caption: "Оболонь" },
      { value: "102", caption: "Печерськ" },
      { value: "103", caption: "Поділ" },
      { value: "104", caption: "Позняки" },
      { value: "105", caption: "Теремки" },
    ],
  },
  {
    value: "20",
    caption: "Київська область",
    children: [
      { value: "201", caption: "Козин" },
      { value: "202", caption: "Ірпінь" },
    ],
  },
];

const BASE_DEFS: FixtureDef[] = [
  {
    adid: "1001",
    deal: "sell",
    property: "flat",
    prop_kind: "isolated",
    date_add: "2026-09-02 10:15:00",
    date_mod: "2026-10-10 12:00:00",
    price: { value: "&asymp; 85 000 $", value_m2: "&asymp; 1 250 $/м²", kind: "all", currency_id: "2" },
    area_total: 68,
    area_life: 41,
    room_count: 2,
    storey: 7,
    storeys: 16,
    repair: "evro",
    locality: "Київ",
    district: "Оболонь",
    street: "проспект Оболонський",
    housestr: "26",
    promo_text: "Світла двокімнатна квартира з євроремонтом біля метро. Меблі та техніка залишаються.",
    photos: ["flat-living-1", "flat-kitchen-1", "flat-bedroom-1"],
    users: ["501"],
  },
  {
    adid: "1002",
    deal: "sell",
    property: "flat",
    prop_kind: "apartments",
    date_add: "2026-09-05 09:30:00",
    date_mod: "2026-10-05 16:40:00",
    price: { value: "145 000 €", kind: "all", currency_id: "3" },
    area_total: 52,
    area_life: 30,
    room_count: 1,
    storey: 4,
    storeys: 9,
    repair: "major",
    locality: "Київ",
    district: "Печерськ",
    street: "вулиця Інститутська",
    housestr: "11Б",
    promo_text: "Апартаменти в центрі, поруч парк і Хрещатик. Є паркомісце.",
    photos: ["flat-living-2", "flat-bathroom-1"],
    users: ["501", "503"],
  },
  {
    adid: "1003",
    deal: "rent_long",
    property: "flat",
    prop_kind: "isolated",
    date_add: "2026-09-12 14:00:00",
    date_mod: "2026-10-18 09:10:00",
    price: { value: "18 000 грн/міс", kind: "all", currency_id: "1" },
    area_total: 45,
    area_life: 26,
    room_count: 1,
    storey: 12,
    storeys: 25,
    repair: "cosmetic",
    locality: "Київ",
    district: "Позняки",
    street: "вулиця Драгоманова",
    housestr: "31",
    promo_text: "Затишна однокімнатна на довгий термін. Підходить парі або одній людині.",
    photos: ["flat-living-3", "flat-kitchen-1"],
    users: ["501"],
  },
  {
    adid: "1004",
    deal: "rent_day",
    property: "flat",
    prop_kind: "studio",
    date_add: "2026-09-20 18:20:00",
    date_mod: "2026-10-20 11:00:00",
    price: { value: "1 200 грн/доба", kind: "all", currency_id: "1" },
    area_total: 30,
    room_count: 1,
    storey: 3,
    storeys: 5,
    repair: "evro",
    locality: "Київ",
    district: "Поділ",
    street: "вулиця Сагайдачного",
    housestr: "8",
    promo_text: "Студія подобово на Подолі, чисто і тихо.",
    photos: ["flat-bedroom-1"],
    users: ["503"],
  },
  {
    adid: "1005",
    deal: "sell",
    property: "house",
    prop_kind: "single",
    date_add: "2026-08-25 08:00:00",
    date_mod: "2026-10-12 15:30:00",
    price: { value: "&asymp; 320 000 $", kind: "all", currency_id: "2" },
    area_total: 240,
    area_lot: 12,
    room_count: 6,
    storeys: 2,
    repair: "evro",
    locality: "Козин",
    street: "вулиця Лісова",
    housestr: "14",
    promo_text: "Будинок із гаражем та садом у Козині. Опалення газове, свій колодязь.",
    photos: ["house-exterior-1", "house-exterior-2"],
    users: ["502"],
  },
  {
    adid: "1006",
    deal: "rent_long",
    property: "house",
    prop_kind: "town_house",
    date_add: "2026-09-28 13:45:00",
    date_mod: "2026-10-22 10:20:00",
    price: { value: "1 100 $ / міс", kind: "all", currency_id: "2" },
    area_total: 130,
    area_lot: 3,
    room_count: 4,
    storeys: 2,
    repair: "cosmetic",
    locality: "Ірпінь",
    street: "вулиця Соборна",
    housestr: "52А",
    promo_text: "Таунхаус в Ірпені, закрита територія, дві парковки.",
    photos: ["house-exterior-2"],
    users: ["502"],
  },
  {
    adid: "1007",
    deal: "sell",
    property: "commercial",
    prop_kind: "office_center",
    date_add: "2026-09-01 11:00:00",
    date_mod: "2026-10-08 14:00:00",
    price: { value: "178 500 $", value_m2: "2 100 $/м²", kind: "all", currency_id: "2" },
    area_total: 85,
    storey: 3,
    storeys: 10,
    repair: "evro",
    locality: "Київ",
    district: "Печерськ",
    street: "вулиця Мечникова",
    housestr: "16",
    promo_text: "Офіс у бізнес-центрі, відкрите планування, переговорна кімната.",
    photos: ["office-interior-1", "building-facade-1"],
    users: ["503"],
  },
  {
    adid: "1008",
    deal: "rent_long",
    property: "commercial",
    prop_kind: "shop",
    date_add: "2026-10-01 10:00:00",
    date_mod: "2026-10-19 17:50:00",
    price: { value: "450 €/м²", value_m2: "450 €/м²", kind: "m2", currency_id: "3" },
    area_total: 140,
    storey: 1,
    storeys: 5,
    locality: "Київ",
    district: "Печерськ",
    street: "вулиця Хрещатик",
    housestr: "22",
    promo_text: "Торгове приміщення на першому поверсі, великі вітрини, жвавий потік людей.",
    photos: ["building-facade-1"],
    users: ["503"],
  },
  {
    adid: "1009",
    deal: "sell",
    property: "plot",
    prop_kind: "private_house_building",
    date_add: "2026-08-15 12:00:00",
    date_mod: "2026-10-01 09:00:00",
    price: { value: "&asymp; 45 000 $", kind: "all", currency_id: "2" },
    area_lot: 12,
    locality: "Ірпінь",
    street: "вулиця Лугова",
    housestr: "",
    promo_text: "Рівна ділянка 12 соток під забудову, всі комунікації поруч.",
    photos: ["plot-landscape-1"],
    users: ["502"],
  },
  {
    adid: "1010",
    deal: "sell",
    property: "plot",
    prop_kind: "agricultural_purposes",
    date_add: "2026-09-10 16:00:00",
    date_mod: "2026-09-30 16:00:00",
    price: { value: "1 800 000 грн", kind: "all", currency_id: "1" },
    area_lot: 60,
    locality: "Козин",
    street: "",
    housestr: "",
    promo_text: "Земля сільгосппризначення, 60 соток.",
    photos: [],
    users: ["502"],
  },
  {
    adid: "1011",
    deal: "sell",
    property: "flat",
    prop_kind: "isolated",
    date_add: "2026-10-03 09:00:00",
    date_mod: "2026-10-15 09:00:00",
    price: { value: "62 000 $", kind: "all", currency_id: "2" },
    area_total: 38,
    room_count: 1,
    storey: 2,
    storeys: 9,
    locality: "Київ",
    district: "Теремки",
    street: "вулиця Сосніних",
    housestr: "5",
    promo_text: "Партнерський об'єкт (MLS), на сайті не показується.",
    photos: ["flat-living-1"],
    users: ["501"],
    is_mls: true,
  },
  {
    adid: "1012",
    deal: "sell",
    property: "flat",
    prop_kind: "isolated",
    date_add: "2026-10-06 15:00:00",
    date_mod: "2026-10-25 12:30:00",
    price: { value: "Договірна", kind: "all", currency_id: "2" },
    area_total: 90,
    area_life: 55,
    room_count: 3,
    storey: 5,
    storeys: 5,
    repair: "partial",
    locality: "Київ",
    district: "Оболонь",
    street: "вулиця Героїв Дніпра",
    housestr: "40",
    promo_text: "Трикімнатна в цегляному будинку, ціна за домовленістю.",
    photos: ["flat-living-2", "flat-living-3", "flat-kitchen-1"],
    users: ["501"],
  },
];

const NEXT_NEW_DEF: FixtureDef = {
  adid: "1013",
  deal: "sell",
  property: "flat",
  prop_kind: "isolated",
  date_add: "2026-10-27 16:10:00",
  date_mod: "2026-10-27 16:10:00",
  price: { value: "&asymp; 71 500 $", value_m2: "1 300 $/м²", kind: "all", currency_id: "2" },
  area_total: 55,
  area_life: 32,
  room_count: 2,
  storey: 9,
  storeys: 24,
  repair: "evro",
  locality: "Київ",
  district: "Теремки",
  street: "вулиця Академіка Заболотного",
  housestr: "148",
  promo_text: "Нова двокімнатна біля парку, готова до заселення.",
  photos: ["flat-bedroom-1", "flat-living-2"],
  users: ["501"],
};

const NEXT_DEFS: FixtureDef[] = [
  ...BASE_DEFS.filter((def) => def.adid !== "1002").map((def) =>
    def.adid === "1001"
      ? {
          ...def,
          date_mod: "2026-10-27 14:30:00",
          // The kitchen photo is gone: the bedroom one moves up (exercises delete + reorder).
          photos: ["flat-living-1", "flat-bedroom-1"],
          price: { ...def.price, value: "&asymp; 82 000 $", value_m2: "&asymp; 1 206 $/м²" },
        }
      : def,
  ),
  NEXT_NEW_DEF,
];

export const FIXTURE_DEFS: Record<FixtureSet, FixtureDef[]> = {
  base: BASE_DEFS,
  next: NEXT_DEFS,
};
