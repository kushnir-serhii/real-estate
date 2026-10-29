import { describe, expect, it } from "vitest";

import { describeDeliveryError } from "./describe-delivery-error";

describe("describeDeliveryError", () => {
  it.each([
    ["plektan", "timeout", "Plektan не відповів вчасно"],
    ["plektan", "network", "Немає зв'язку з Plektan"],
    ["plektan", "http 500", "Помилка на стороні Plektan (500)"],
    ["plektan", "http 401", "Plektan відхилив ключ доступу (401)"],
    ["telegram", "http 403", "Telegram відхилив ключ доступу (403)"],
    ["plektan", "http 429", "Plektan тимчасово обмежив кількість запитів (429)"],
    ["plektan", "http 404", "Plektan відхилив запит (404)"],
    ["plektan", "invalid_response", "Plektan повернув незрозумілу відповідь"],
    ["telegram", "api", "Telegram повернув помилку"],
    ["telegram", "network", "Немає зв'язку з Telegram"],
    ["telegram", "unexpected", "Невідома помилка"],
    ["plektan", null, "Невідома помилка"],
    ["plektan", "weird", "Не вдалося надіслати до Plektan [weird]"],
  ] as const)("%s / %s", (channel, error, expected) => {
    expect(describeDeliveryError(channel, error)).toBe(expected);
  });
});
