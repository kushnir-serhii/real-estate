import "server-only";
import { getAdminProperty } from "@/lib/db/admin-properties";
import type { AdminProperty, AdminPropertyListItem } from "@/lib/db/admin-properties";
import { smallestPhotoUrl } from "@/lib/photos/photo-src-set";
import { propertyListStatus } from "@/features/admin/properties/property-list-status";
import { propertyAddress, propertyPrice } from "@/features/admin/properties/property-row-text";
import type { PickerProperty } from "./post-media-values";

/** Maps admin property rows to the small shape the picker shows (the browser never gets the full row). */

export const pickerPropertyFromListItem = (item: AdminPropertyListItem): PickerProperty => ({
  id: item.id,
  title: item.title,
  price: propertyPrice(item),
  address: propertyAddress(item),
  status: item.listStatus,
  thumb: item.cover ? smallestPhotoUrl(item.cover) : null,
});

const pickerProperty = (property: AdminProperty): PickerProperty => ({
  id: property.id,
  title: property.title,
  price: propertyPrice(property),
  address: propertyAddress(property),
  status: propertyListStatus(property),
  thumb: property.photos[0] ? smallestPhotoUrl(property.photos[0]) : null,
});

/** The post's linked properties (any status, order kept, unknown ids dropped). The caller has run `requireAdmin()`. */
export const loadPickerSelection = async (ids: readonly string[]): Promise<PickerProperty[]> =>
  (await Promise.all(ids.map((id) => getAdminProperty(id)))).flatMap((property) =>
    property ? [pickerProperty(property)] : [],
  );
