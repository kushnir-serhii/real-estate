import type { PROPERTY_TYPES } from "@/lib/db/property-values";

export type TitleInput = {
  property_type: (typeof PROPERTY_TYPES)[number];
  /** Known Plektan `prop_kind` (already validated) or null. */
  prop_kind: string | null;
  room_count: number | null;
  area_total: number | null;
  /** Plots: sotky. */
  area_lot: number | null;
  locality: string | null;
  district: string | null;
};

const HOUSE_LABELS: Record<string, string> = {
  single: "Будинок",
  part: "Частина будинку",
  town_house: "Таунхаус",
  palace: "Особняк",
  holiday_home: "Дача",
  unfinished: "Незавершений будинок",
};

const COMMERCIAL_FALLBACK = "Комерційне приміщення";

const COMMERCIAL_LABELS: Record<string, string> = {
  office_in_house: "Офіс",
  office_center: "Офіс",
  office_free: "Офіс",
  office_premise: "Офіс",
  pavilion: "Павільйон",
  pharmacy: "Аптека",
  shop: "Торгове приміщення",
  supermarket: "Торгове приміщення",
  mart: "Торгове приміщення",
  trade_premise: "Торгове приміщення",
  restaurant: "Ресторан",
  cafe: "Кафе",
  bar: "Бар",
  pizzeria: "Піцерія",
  "restaurant-fastfood": "Кафе",
  catering_object: "Заклад харчування",
  dry_cleaners: "Хімчистка",
  beauty_parlor: "Салон краси",
  hairdressing_saloon: "Перукарня",
  dental_office: "Стоматологічний кабінет",
  clinic: "Клініка",
  car_service: "Автосервіс",
  fitness_center: "Фітнес-центр",
  service_object: "Приміщення під сервіс",
  club: "Клуб",
  theatre: "Театр",
  cinema: "Кінотеатр",
  bowling: "Боулінг",
  night_club: "Нічний клуб",
  culture_object: "Культурний об'єкт",
  storehouse: "Склад",
  production_area: "Виробниче приміщення",
  industrial_complex: "Виробничий комплекс",
  garage: "Гараж",
  hotel: "Готель",
  hostel: "Хостел",
  "agricultural object": "Агрооб'єкт",
  other_infrastructure: COMMERCIAL_FALLBACK,
  unfinished_object: "Незавершений об'єкт",
};

const numberFormat = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

/** 240 -> "240", 12.5 -> "12,5", 12.0 -> "12" (no trailing ".0"). */
const formatNumber = (value: number): string => numberFormat.format(value);

const flatLabel = (propKind: string | null, roomCount: number | null): string => {
  if (propKind === "studio") return "Квартира-студія";
  if (propKind === "penthouse") return "Пентхаус";
  if (propKind === "gostinka") return "Гостинка";
  if (roomCount !== null && roomCount > 0) return `${roomCount}-кімнатна квартира`;
  return "Квартира";
};

const withArea = (label: string, area: number | null): string =>
  area !== null && area > 0 ? `${label} ${formatNumber(area)} м²` : label;

/** «2-кімнатна квартира, Оболонь», «Будинок 240 м², Козин», «Ділянка 12 сот., Ірпінь», «Офіс 85 м², Печерськ». */
export const buildPropertyTitle = (input: TitleInput): string => {
  const { property_type: type, prop_kind: kind } = input;
  let head: string;
  switch (type) {
    case "flat":
      head = flatLabel(kind, input.room_count);
      break;
    case "house":
      head = withArea((kind !== null ? HOUSE_LABELS[kind] : undefined) ?? "Будинок", input.area_total);
      break;
    case "commercial":
      head = withArea(
        (kind !== null ? COMMERCIAL_LABELS[kind] : undefined) ?? COMMERCIAL_FALLBACK,
        input.area_total,
      );
      break;
    case "plot":
      head =
        input.area_lot !== null && input.area_lot > 0
          ? `Ділянка ${formatNumber(input.area_lot)} сот.`
          : "Ділянка";
      break;
  }
  const location = [input.district, input.locality]
    .map((part) => part?.trim() ?? "")
    .find((part) => part !== "");
  return location === undefined ? head : `${head}, ${location}`;
};
