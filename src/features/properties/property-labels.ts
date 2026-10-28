import type {
  DEALS,
  HOUSING_CLASSES,
  PROP_KINDS,
  PROPERTY_TYPES,
  REPAIRS,
  WALL_MATERIALS,
} from "@/lib/db/property-values";

export const DEAL_LABELS: Record<(typeof DEALS)[number], string> = {
  sell: "Продаж",
  rent_long: "Довгострокова оренда",
  rent_day: "Подобова оренда",
};

export const PROPERTY_TYPE_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  flat: "Квартира",
  house: "Будинок",
  commercial: "Комерційна",
  plot: "Ділянка",
};

export const PROP_KIND_LABELS: Record<(typeof PROP_KINDS)[number], string> = {
  // flat
  isolated: "Квартира",
  apartments: "Апартаменти",
  penthouse: "Пентхаус",
  studio: "Студія",
  gostinka: "Гостинка",
  another_sleeping: "Кімната",
  unfinished_new_build: "Квартира в новобудові, що будується",
  // house
  single: "Окремий будинок",
  part: "Частина будинку",
  town_house: "Таунхаус",
  palace: "Особняк",
  holiday_home: "Дача",
  unfinished: "Недобудований будинок",
  // plot
  dilapidated_house: "Ділянка зі старим будинком",
  dacha: "Дачна ділянка",
  construction_residential: "Під житлову забудову",
  construction_non_residential: "Під комерційну забудову",
  private_house_building: "Під будинок (ОСГ)",
  agricultural_purposes: "Сільськогосподарського призначення",
  island: "Острів",
  // commercial
  office_in_house: "Офіс у житловому будинку",
  office_center: "Офіс у бізнес-центрі",
  office_free: "Офіс в окремій будівлі",
  office_premise: "Офісне приміщення",
  pavilion: "Павільйон",
  pharmacy: "Аптека",
  shop: "Магазин",
  supermarket: "Супермаркет",
  mart: "Торговий центр",
  trade_premise: "Торгове приміщення",
  restaurant: "Ресторан",
  cafe: "Кафе",
  bar: "Бар",
  pizzeria: "Піцерія",
  "restaurant-fastfood": "Фастфуд",
  catering_object: "Заклад харчування",
  dry_cleaners: "Хімчистка",
  beauty_parlor: "Салон краси",
  hairdressing_saloon: "Перукарня",
  dental_office: "Стоматологія",
  clinic: "Клініка",
  car_service: "Автосервіс",
  fitness_center: "Фітнес-центр",
  service_object: "Сфера послуг",
  club: "Клуб",
  theatre: "Театр",
  cinema: "Кінотеатр",
  bowling: "Боулінг",
  night_club: "Нічний клуб",
  culture_object: "Заклад культури",
  storehouse: "Склад",
  production_area: "Виробниче приміщення",
  industrial_complex: "Промисловий комплекс",
  garage: "Гараж",
  hotel: "Готель",
  hostel: "Хостел",
  "agricultural object": "Сільськогосподарський об'єкт",
  other_infrastructure: "Інша інфраструктура",
  unfinished_object: "Недобудований об'єкт",
};

export const REPAIR_LABELS: Record<(typeof REPAIRS)[number], string> = {
  without_repair: "Без ремонту",
  no_internal_works: "Без внутрішніх робіт",
  without_finishing: "Без оздоблення",
  cosmetic: "Косметичний",
  partial: "Частковий",
  major: "Капітальний",
  evro: "Євроремонт",
  architectural_design: "Дизайнерський",
};

export const WALL_MATERIAL_LABELS: Record<(typeof WALL_MATERIALS)[number], string> = {
  panel: "Панель",
  brick: "Цегла",
  gas_block: "Газоблок",
  cinder_block: "Шлакоблок",
  monolit_carcas: "Монолітно-каркасний",
  foam_concrete: "Піноблок",
  keramzit_concrete: "Керамзитобетон",
  poroterm: "Керамоблок",
  rakushnik_brick: "Черепашник",
  wood_brick: "Дерево й цегла",
  wood: "Дерево",
};

export const HOUSING_CLASS_LABELS: Record<(typeof HOUSING_CLASSES)[number], string> = {
  econom: "Економ",
  business: "Бізнес",
  elit: "Елітний",
};

/** Label for a stored text value (`prop_kind`, `repair`, …); unknown or empty values → null (row hidden). */
export const labelOf = <K extends string>(labels: Record<K, string>, value: string | null): string | null => {
  if (value === null || !Object.hasOwn(labels, value)) return null;
  // as: Object.hasOwn above proved `value` is a key of `labels`
  return labels[value as K];
};
