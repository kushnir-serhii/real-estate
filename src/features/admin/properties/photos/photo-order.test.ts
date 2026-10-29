import { describe, expect, it } from "vitest";
import { dropIndex, movePhoto, orderPayload, sameOrder } from "./photo-order";

const list = ["a", "b", "c", "d"].map((id) => ({ id }));
const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("movePhoto", () => {
  it("moves forward and back", () => {
    expect(ids(movePhoto(list, "a", 2))).toEqual(["b", "c", "a", "d"]);
    expect(ids(movePhoto(list, "d", 0))).toEqual(["d", "a", "b", "c"]);
  });
  it("clamps and ignores unknown ids", () => {
    expect(ids(movePhoto(list, "b", 99))).toEqual(["a", "c", "d", "b"]);
    expect(ids(movePhoto(list, "b", -3))).toEqual(["b", "a", "c", "d"]);
    expect(ids(movePhoto(list, "x", 0))).toEqual(["a", "b", "c", "d"]);
  });
});

describe("dropIndex", () => {
  it("accounts for the removed item", () => {
    expect(dropIndex(list, "a", "c", "after")).toBe(2);
    expect(dropIndex(list, "a", "c", "before")).toBe(1);
    expect(dropIndex(list, "d", "a", "before")).toBe(0);
  });
  it("returns null for no-op drops", () => {
    expect(dropIndex(list, "b", "b", "after")).toBeNull();
    expect(dropIndex(list, "b", "c", "before")).toBeNull();
    expect(dropIndex(list, "b", "a", "after")).toBeNull();
  });
});

describe("orderPayload", () => {
  it("keeps exactly the stored ids", () => {
    expect(orderPayload(["c", "a", "new"], ["a", "b", "c"])).toEqual(["c", "a", "b"]);
  });
  it("compares orders", () => {
    expect(sameOrder(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameOrder(["a", "b"], ["b", "a"])).toBe(false);
  });
});
