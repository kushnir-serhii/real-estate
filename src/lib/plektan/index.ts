export {
  createPlektanClient,
  getContactPersons,
  getDistricts,
  PLEKTAN_DEALS,
  PLEKTAN_MAX_ROWS_PER_PAGE,
  PLEKTAN_PROPERTIES,
  search,
  searchAll,
  view,
} from "./client";
export type {
  PlektanClient,
  PlektanClientConfig,
  PlektanDeal,
  PlektanDistrictsParams,
  PlektanProperty,
  PlektanSearchPage,
  PlektanSearchParams,
  PlektanViewParams,
} from "./client";
export { isPlektanError, PlektanError } from "./errors";
export type { PlektanErrorDetails, PlektanErrorKind } from "./errors";
export type {
  PlektanContactPerson,
  PlektanDistrict,
  PlektanListItem,
  PlektanPrice,
  PlektanRaw,
  PlektanViewItem,
  PlektanViewUser,
} from "./schemas";
