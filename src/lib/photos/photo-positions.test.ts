import { describe, expect, it } from "vitest";
import { planCompactAfterDelete, planOrder, planReorder } from "./photo-positions";

const rows = [
  { id: "a", position: 0 },
  { id: "b", position: 1 },
  { id: "c", position: 2 },
  { id: "d", position: 3 },
];

describe("planReorder", () => {
  it("moves only the rows whose position changes", () => {
    expect(planReorder(rows, ["a", "c", "b", "d"])).toEqual({
      ok: true,
      moves: [
        { id: "c", position: 1 },
        { id: "b", position: 2 },
      ],
    });
  });
  it("is a no-op for the same order", () => {
    expect(planReorder(rows, ["a", "b", "c", "d"])).toEqual({ ok: true, moves: [] });
  });
  it("refuses missing, extra, unknown and duplicate ids", () => {
    expect(planReorder(rows, ["a", "b", "c"]).ok).toBe(false);
    expect(planReorder(rows, ["a", "b", "c", "d", "e"]).ok).toBe(false);
    expect(planReorder(rows, ["a", "b", "c", "x"]).ok).toBe(false);
    expect(planReorder(rows, ["a", "a", "b", "c"]).ok).toBe(false);
  });
  it("works when stored positions have gaps", () => {
    expect(
      planReorder(
        [
          { id: "a", position: 3 },
          { id: "b", position: 7 },
        ],
        ["b", "a"],
      ),
    ).toEqual({
      ok: true,
      moves: [
        { id: "b", position: 0 },
        { id: "a", position: 1 },
      ],
    });
  });
});

describe("planCompactAfterDelete", () => {
  it("closes the gap", () => {
    expect(planCompactAfterDelete(rows, "b")).toEqual({
      ok: true,
      moves: [
        { id: "c", position: 1 },
        { id: "d", position: 2 },
      ],
    });
  });
  it("deleting the last photo moves nothing; unknown id is refused", () => {
    expect(planCompactAfterDelete(rows, "d")).toEqual({ ok: true, moves: [] });
    expect(planCompactAfterDelete(rows, "x")).toEqual({ ok: false });
  });
});

describe("planOrder", () => {
  it("returns nothing when positions already match", () => {
    expect(planOrder(rows, ["a", "b", "c", "d"])).toEqual([]);
  });
});
