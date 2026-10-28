import { describe, expect, it } from "vitest";

import { leadFormSchema, parseUtm } from "./lead-form-schema";

const ID = "11111111-1111-4111-8111-111111111111";
const base = { client_request_id: ID, name: " Олена ", phone: "067 123 45 67", consent: "on" };

describe("leadFormSchema", () => {
  it("accepts a general request and normalizes name and phone", () => {
    const r = leadFormSchema.safeParse({ ...base, kind: "general", deal: "buy", email: "", property_type: "flat" });
    expect(r.success && r.data).toMatchObject({ name: "Олена", phone: "+380671234567", email: undefined });
  });

  it("requires property_id for property requests", () => {
    expect(leadFormSchema.safeParse({ ...base, kind: "property_request" }).success).toBe(false);
    expect(leadFormSchema.safeParse({ ...base, kind: "property_request", property_id: ID }).success).toBe(true);
  });

  it("reports Ukrainian messages for a bad phone, empty name, missing consent, bad email", () => {
    const r = leadFormSchema.safeParse({
      kind: "general", deal: "rent", client_request_id: ID, name: " ", phone: "123", email: "x", consent: undefined,
    });
    expect(r.success).toBe(false);
    if (r.success) return;
    const byField = Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
    expect(byField).toMatchObject({
      name: "Вкажіть ім'я",
      phone: "Перевірте номер телефону",
      email: "Перевірте email",
      consent: "Потрібна ваша згода",
    });
  });
});

describe("parseUtm", () => {
  it("keeps only utm_* strings", () => {
    expect(parseUtm('{"utm_source":"g","x":"y","utm_n":5}')).toEqual({ utm_source: "g" });
  });
  it("ignores bad input", () => {
    expect(parseUtm("nope")).toBeUndefined();
    expect(parseUtm("[]")).toBeUndefined();
    expect(parseUtm(undefined)).toBeUndefined();
  });
});
