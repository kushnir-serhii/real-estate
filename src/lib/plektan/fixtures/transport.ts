import { PlektanError } from "../errors";
import {
  FIXTURE_DEFS,
  FIXTURE_DISTRICTS,
  FIXTURE_PHOTO_BASE_URL,
  FIXTURE_SETS,
  FIXTURE_USERS,
  type FixtureDef,
  type FixtureSet,
} from "./data";

/**
 * Fixture "server": answers like Plektan would (raw, un-normalized JSON) so the
 * real schemas run on it. Honors deal / property / prop_kind[] / after_date and
 * pagination. Enum fields alternate between plain strings and `{ value, caption }`
 * to exercise both shapes.
 */

export const parseFixtureSet = (value: string | undefined): FixtureSet => {
  const wanted = (value ?? "").trim();
  if (wanted === "") return "base";
  const found = FIXTURE_SETS.find((set) => set === wanted);
  if (found === undefined) {
    throw new PlektanError({
      kind: "api",
      message: `Unknown PLEKTAN_FIXTURE_SET "${wanted}" (expected ${FIXTURE_SETS.join(" | ")})`,
    });
  }
  return found;
};

const photoUrl = (name: string): string => `${FIXTURE_PHOTO_BASE_URL}/${name}.jpg`;

const wrapEnum = (def: FixtureDef, value: string | undefined): unknown => {
  if (value === undefined) return undefined;
  // Even ids come as plain strings, odd ones as { value, caption }.
  return Number(def.adid) % 2 === 0 ? value : { value, caption: value };
};

const currencyCaption = (id: string): string => (id === "1" ? "UAH" : id === "2" ? "USD" : "EUR");

const commonFields = (def: FixtureDef): Record<string, unknown> => ({
  adid: Number(def.adid),
  date_add: def.date_add,
  date_mod: def.date_mod,
  state: "actual",
  deal: wrapEnum(def, def.deal),
  property: wrapEnum(def, def.property),
  prop_kind: wrapEnum(def, def.prop_kind),
  is_mls: def.is_mls === true,
  price: {
    value: def.price.value,
    value_obj: def.price.value,
    value_m2: def.price.value_m2 ?? "",
    value_are: "",
    kind: def.price.kind,
    currency_id: def.price.currency_id,
  },
  base_price: def.price.value,
  // Numbers arrive as strings sometimes.
  area_total: def.area_total === undefined ? null : String(def.area_total),
  area_life: def.area_life ?? null,
  area_lot: def.area_lot ?? null,
  room_count: def.room_count ?? null,
  storey: def.storey ?? null,
  storeys: def.storeys ?? null,
  repair: wrapEnum(def, def.repair),
  locality: def.locality,
  district: def.district ?? "",
  street: def.street,
});

const buildListItem = (def: FixtureDef): Record<string, unknown> => {
  const first = def.photos[0];
  return {
    ...commonFields(def),
    // An empty PHP array arrives as [] when there are no photos.
    media:
      first === undefined
        ? []
        : { src_small: photoUrl(first), src_middle: photoUrl(first), src_small_2: photoUrl(first) },
  };
};

const buildViewItem = (def: FixtureDef): Record<string, unknown> => {
  const users = def.users.flatMap((id) => {
    const user = FIXTURE_USERS.find((candidate) => candidate.user_id === id);
    return user === undefined
      ? []
      : [
          {
            user_id: Number(user.user_id),
            name: user.name,
            phones: user.phones,
            email: user.email,
            url_small: user.url_small,
            site: `https://plektan.example/u/${user.site_id}`,
            status: "active",
          },
        ];
  });
  return {
    ...commonFields(def),
    advert_id: def.adid,
    media: def.photos.map((name, index) => ({ src: photoUrl(name), title: `Фото ${index + 1}` })),
    promo_text: def.promo_text,
    housestr: def.housestr,
    currency: currencyCaption(def.price.currency_id),
    users,
  };
};

type Params = Record<string, unknown>;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.flatMap((item) => asString(item) ?? []) : [];

const MAX_ROWS = 20;
const DEFAULT_ROWS = 15;

const handleSearch = (defs: FixtureDef[], params: Params): unknown => {
  const deal = asString(params.deal);
  const property = asString(params.property);
  const kinds = asStringArray(params.prop_kind);
  const afterDate = asString(params.after_date);

  const matched = defs.filter(
    (def) =>
      (deal === undefined || def.deal === deal) &&
      (property === undefined || def.property === property) &&
      (kinds.length === 0 || kinds.includes(def.prop_kind)) &&
      // after_date is 'YYYY-MM-DD HH:MM'; date_mod is a full timestamp; both sort as text.
      (afterDate === undefined || def.date_mod.slice(0, 16) > afterDate.slice(0, 16)),
  );

  const rows = Math.min(Math.max(Number(asString(params.rowsPerPage)) || DEFAULT_ROWS, 1), MAX_ROWS);
  const page = Math.max(Number(asString(params.currentPage)) || 1, 1);
  const slice = matched.slice((page - 1) * rows, page * rows);
  return { data: slice.map(buildListItem), totalRows: String(matched.length) };
};

export const fixtureResponse = (
  set: FixtureSet,
  section: string,
  command: string,
  params: Params,
): unknown => {
  const defs = FIXTURE_DEFS[set];
  const route = `${section}/${command}`;
  switch (route) {
    case "API_serp/search":
      return handleSearch(defs, params);
    case "API_view/view": {
      const adid = asString(params.adid);
      const def = defs.find((candidate) => candidate.adid === adid);
      if (def === undefined) {
        return { result: "ERROR", message: `Advert ${adid ?? ""} not found` };
      }
      return buildViewItem(def);
    }
    case "API_user/getContactPersons":
      return FIXTURE_USERS.map((user) => ({
        ...user,
        user_id: Number(user.user_id),
      }));
    case "API_geo/getDistricts":
      return { data: FIXTURE_DISTRICTS };
    default:
      throw new PlektanError({ kind: "api", message: `No fixture for ${route}` });
  }
};
