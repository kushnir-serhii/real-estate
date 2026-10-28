import { PlektanError } from "../errors";

/** Local transport for `addAdvert` (flag `PLEKTAN_LEADS_FIXTURE`): `ok` answers ADDED, `fail` throws. */
export const LEADS_FIXTURE_MODES = ["ok", "fail"] as const;
export type PlektanLeadsFixtureMode = (typeof LEADS_FIXTURE_MODES)[number];

export const parseLeadsFixtureMode = (value: string | undefined): PlektanLeadsFixtureMode | null => {
  const wanted = (value ?? "").trim().toLowerCase();
  return LEADS_FIXTURE_MODES.find((mode) => mode === wanted) ?? null;
};

export const addAdvertFixtureResponse = (mode: PlektanLeadsFixtureMode): unknown => {
  if (mode === "fail") {
    throw new PlektanError({ kind: "api", message: "fixture: addAdvert failed" });
  }
  return { result: "ADDED", item_id: 900_000 + Math.floor(Math.random() * 100_000), message: "fixture" };
};
