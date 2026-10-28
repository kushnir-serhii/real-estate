import { describe, expect, it, vi } from "vitest";

import { createPlektanClient, isPlektanError, PlektanError } from "@/lib/plektan";
import { encodeForm } from "@/lib/plektan/encode-form";

const ALL_FLATS = { deal: "sell", property: "flat", prop_kind: ["isolated", "apartments"] } as const;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const keyedClient = (fetchMock: typeof fetch, extra: { retries?: number } = {}) =>
  createPlektanClient({ apiKey: "secret-key", fetch: fetchMock, backoffMs: 0, ...extra });

const expectPlektanError = async (promise: Promise<unknown>, kind: string): Promise<PlektanError> => {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(isPlektanError(error)).toBe(true);
  if (!isPlektanError(error)) throw new Error("not a PlektanError");
  expect(error.kind).toBe(kind);
  return error;
};

describe("encodeForm", () => {
  it("encodes arrays and nested objects PHP-style", () => {
    const body = encodeForm({
      deal: "sell",
      prop_kind: ["a", "b"],
      price: { currency_id: 2 },
      skipped: undefined,
      flag: true,
    });
    expect(decodeURIComponent(body)).toBe(
      "deal=sell&prop_kind[]=a&prop_kind[]=b&price[currency_id]=2&flag=1",
    );
  });
});

describe("fixture mode (no key)", () => {
  const client = createPlektanClient({});

  it("is selected when the key is empty", () => {
    expect(client.isFixtureMode).toBe(true);
  });

  it("search filters by deal / property / prop_kind", async () => {
    const page = await client.search({ ...ALL_FLATS, rowsPerPage: 20 });
    expect(page.totalRows).toBe(page.items.length);
    expect(page.items.every((item) => item.property === "flat" && item.deal === "sell")).toBe(true);
    expect(page.items.map((item) => item.adid).sort()).toEqual(["1001", "1002", "1011", "1012"]);
  });

  it("search paginates with rowsPerPage and reports totalRows", async () => {
    const params = { ...ALL_FLATS, rowsPerPage: 3 };
    const first = await client.search({ ...params, currentPage: 1 });
    const second = await client.search({ ...params, currentPage: 2 });
    const third = await client.search({ ...params, currentPage: 3 });
    expect(first.totalRows).toBe(4);
    expect(first.items).toHaveLength(3);
    expect(second.items).toHaveLength(1);
    expect(third.items).toHaveLength(0);
    expect(new Set([...first.items, ...second.items].map((i) => i.adid)).size).toBe(4);
  });

  it("caps rowsPerPage at 20", async () => {
    const page = await client.search({
      deal: "sell",
      property: "flat",
      prop_kind: ["isolated", "apartments"],
      rowsPerPage: 500,
    });
    expect(page.items.length).toBeLessThanOrEqual(20);
  });

  it("searchAll walks every page", async () => {
    const all = await client.searchAll({ ...ALL_FLATS, rowsPerPage: 1 });
    expect(all.items.map((item) => item.adid).sort()).toEqual(["1001", "1002", "1011", "1012"]);
  });

  it("search honors after_date against date_mod", async () => {
    const page = await client.search({ ...ALL_FLATS, after_date: "2026-10-12 00:00" });
    expect(page.items.map((item) => item.adid)).toEqual(["1011", "1012"]);
  });

  it("normalizes strings, { value, caption } and numeric strings; keeps raw", async () => {
    const page = await client.search({ ...ALL_FLATS });
    const odd = page.items.find((item) => item.adid === "1001");
    const even = page.items.find((item) => item.adid === "1012");
    expect(odd?.deal).toBe("sell");
    expect(even?.deal).toBe("sell");
    expect(odd?.raw.deal).toEqual({ value: "sell", caption: "sell" });
    expect(odd?.area_total).toBe(68);
    expect(odd?.price.value).toBe("&asymp; 85 000 $");
    expect(odd?.media.src_small).toBe("https://plektan.example/photos/flat-living-1.jpg");
  });

  it("covers all types, deals and currencies, mls and a property without photos", async () => {
    const items = (
      await Promise.all(
        (["sell", "rent_long", "rent_day"] as const).flatMap((deal) =>
          (
            [
              ["flat", ["isolated", "apartments", "studio"]],
              ["house", ["single", "town_house"]],
              ["commercial", ["office_center", "shop"]],
              ["plot", ["private_house_building", "agricultural_purposes"]],
            ] as const
          ).map(([property, kinds]) => client.searchAll({ deal, property, prop_kind: [...kinds] })),
        ),
      )
    ).flatMap((result) => result.items);
    expect(items).toHaveLength(12);
    expect(new Set(items.map((i) => i.property))).toEqual(
      new Set(["flat", "house", "commercial", "plot"]),
    );
    expect(new Set(items.map((i) => i.deal))).toEqual(new Set(["sell", "rent_long", "rent_day"]));
    expect(new Set(items.map((i) => i.price.currency_id))).toEqual(new Set(["1", "2", "3"]));
    expect(items.filter((i) => i.is_mls)).toHaveLength(1);
    expect(items.filter((i) => Object.keys(i.media).length === 0)).toHaveLength(1);
  });

  it("view returns the card with description, photos, house and users", async () => {
    const card = await client.view({ adid: "1001" });
    expect(card.adid).toBe("1001");
    expect(card.promo_text).toContain("двокімнатна");
    expect(card.housestr).toBe("26");
    expect(card.media.map((m) => m.src)).toEqual([
      "https://plektan.example/photos/flat-living-1.jpg",
      "https://plektan.example/photos/flat-kitchen-1.jpg",
      "https://plektan.example/photos/flat-bedroom-1.jpg",
    ]);
    expect(card.users.map((u) => u.user_id)).toEqual(["501"]);
    expect(card.users[0]?.phones).toEqual(["+380501112233", "+380671112233"]);
  });

  it("view of an unknown adid is an api error", async () => {
    await expectPlektanError(client.view({ adid: "999999" }), "api");
  });

  it("getContactPersons returns the agents", async () => {
    const persons = await client.getContactPersons();
    expect(persons.map((p) => p.user_id)).toEqual(["501", "502", "503"]);
    expect(persons[0]?.name).toBe("Олена Коваленко");
    expect(persons[0]?.phones).toHaveLength(2);
  });

  it("every view.users id exists in getContactPersons", async () => {
    const ids = new Set((await client.getContactPersons()).map((p) => p.user_id));
    const all = await client.searchAll({ ...ALL_FLATS });
    for (const item of all.items) {
      const card = await client.view({ adid: item.adid });
      for (const user of card.users) expect(ids.has(user.user_id)).toBe(true);
    }
  });

  it("getDistricts returns a two-level tree", async () => {
    const districts = await client.getDistricts();
    expect(districts[0]?.caption).toBe("Київ");
    expect(districts[0]?.children.length).toBeGreaterThan(0);
  });
});

describe("fixture sets", () => {
  const base = createPlektanClient({ fixtureSet: "base" });
  const next = createPlektanClient({ fixtureSet: "next" });
  const flats = { ...ALL_FLATS };

  it("next: one gone, one changed price, one added", async () => {
    const before = await base.searchAll(flats);
    const after = await next.searchAll(flats);
    const beforeIds = before.items.map((i) => i.adid);
    const afterIds = after.items.map((i) => i.adid);
    expect(beforeIds).toContain("1002");
    expect(afterIds).not.toContain("1002");
    expect(afterIds).toContain("1013");
    expect(beforeIds).not.toContain("1013");
    const oldPrice = before.items.find((i) => i.adid === "1001");
    const newPrice = after.items.find((i) => i.adid === "1001");
    expect(oldPrice?.price.value).not.toBe(newPrice?.price.value);
    expect(newPrice?.date_mod).not.toBe(oldPrice?.date_mod);
  });

  it("incremental search on next returns only changed / new items", async () => {
    const page = await next.search({ ...flats, after_date: "2026-10-27 00:00" });
    expect(page.items.map((i) => i.adid).sort()).toEqual(["1001", "1013"]);
  });

  it("rejects an unknown set", () => {
    expect(() => createPlektanClient({ fixtureSet: "bogus" })).toThrow(PlektanError);
  });
});

describe("real mode (mocked fetch)", () => {
  it("POSTs form-encoded body with x-auth-token and version", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ data: [], totalRows: 0 }));
    await keyedClient(fetchMock).search({ ...ALL_FLATS, after_date: "2026-10-01 10:00" });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://re.plektan.com/uk/API_serp/search");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("x-auth-token")).toBe("secret-key");
    const body = decodeURIComponent(String(init?.body));
    expect(body).toContain("prop_kind[]=isolated&prop_kind[]=apartments");
    expect(body).toContain("version=1.1");
    expect(body).toContain("after_date=2026-10-01+10:00");
    expect(body).toContain("rowsPerPage=20");
  });

  it("retries 5xx and network errors, then succeeds", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ data: [], totalRows: 0 }));
    const page = await keyedClient(fetchMock).search({ ...ALL_FLATS });
    expect(page.items).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after the retries with a network / http error", async () => {
    const down = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    await expectPlektanError(keyedClient(down).search({ ...ALL_FLATS }), "network");
    expect(down).toHaveBeenCalledTimes(3);

    const broken = vi.fn<typeof fetch>(async () => jsonResponse({}, 502));
    const error = await expectPlektanError(keyedClient(broken).getContactPersons(), "http");
    expect(error.details).toMatchObject({ status: 502 });
  });

  it("does not retry 4xx", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({}, 401));
    await expectPlektanError(keyedClient(fetchMock).getContactPersons(), "http");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never puts the key into an error message", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({}, 500));
    const error = await expectPlektanError(keyedClient(fetchMock).getContactPersons(), "http");
    expect(error.message).not.toContain("secret-key");
  });

  it("a body that is not an object / has the wrong shape is invalid_response", async () => {
    const bad: unknown[] = [
      { data: "nope", totalRows: 1 },
      { totalRows: 3 },
      { data: [{ no_adid: true }], totalRows: 1 },
      null,
      "<html>",
    ];
    for (const body of bad) {
      const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(body));
      const error = await expectPlektanError(keyedClient(fetchMock).search({ ...ALL_FLATS }), "invalid_response");
      expect(error.details.kind === "invalid_response" && error.details.issues.length).toBeGreaterThan(0);
    }
  });

  it("non-JSON body is invalid_response", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("<html>oops</html>", { status: 200 }));
    await expectPlektanError(keyedClient(fetchMock).getContactPersons(), "invalid_response");
  });

  it("view / contact persons with a bad shape are invalid_response", async () => {
    const noId = vi.fn<typeof fetch>(async () => jsonResponse({ promo_text: "x" }));
    await expectPlektanError(keyedClient(noId).view({ adid: 1 }), "invalid_response");
    const badPersons = vi.fn<typeof fetch>(async () => jsonResponse([{ name: "no id" }]));
    await expectPlektanError(keyedClient(badPersons).getContactPersons(), "invalid_response");
  });

  it("an error reported inside a 200 is an api error", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ result: "ERROR", message: "Bad token" }),
    );
    const error = await expectPlektanError(keyedClient(fetchMock).search({ ...ALL_FLATS }), "api");
    expect(error.message).toContain("Bad token");
  });

  it("searchAll stops on an empty page and on repeated rows (no infinite loop)", async () => {
    const row = { adid: 1, media: [] };
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ data: [], totalRows: 100 }));
    const result = await keyedClient(fetchMock).searchAll({ ...ALL_FLATS });
    expect(result.items).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const sameRow = vi.fn<typeof fetch>(async () => jsonResponse({ data: [row], totalRows: 3 }));
    const deduped = await keyedClient(sameRow).searchAll({ ...ALL_FLATS, rowsPerPage: 1 });
    expect(deduped.items).toHaveLength(1);
    expect(sameRow).toHaveBeenCalledTimes(3);
  });
});
