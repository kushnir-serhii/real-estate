/**
 * The one place that turns request params into a request body. Plektan's docs
 * do not state the content type; we send PHP-style form encoding
 * (`prop_kind[]=a&prop_kind[]=b`, `price[currency_id]=2`). To switch to JSON,
 * change only this function and the Content-Type header in client.ts.
 */
export const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const append = (out: URLSearchParams, key: string, value: unknown): void => {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) append(out, `${key}[]`, item);
    return;
  }
  if (isPlainObject(value)) {
    for (const [sub, item] of Object.entries(value)) append(out, `${key}[${sub}]`, item);
    return;
  }
  if (typeof value === "boolean") {
    out.append(key, value ? "1" : "0");
    return;
  }
  out.append(key, String(value));
};

export const encodeForm = (params: Record<string, unknown>): string => {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) append(out, key, value);
  return out.toString();
};
