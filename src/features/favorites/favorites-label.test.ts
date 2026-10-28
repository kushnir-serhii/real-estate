import { describe, expect, it } from "vitest";

import { favoritesLinkLabel, objectsCount } from "./favorites-label";

describe("objectsCount", () => {
  it("uses the Ukrainian plural forms", () => {
    expect(objectsCount(1)).toBe("1 об'єкт");
    expect(objectsCount(2)).toBe("2 об'єкти");
    expect(objectsCount(5)).toBe("5 об'єктів");
    expect(objectsCount(11)).toBe("11 об'єктів");
    expect(objectsCount(21)).toBe("21 об'єкт");
  });
});

describe("favoritesLinkLabel", () => {
  it("omits the count when nothing is saved", () => {
    expect(favoritesLinkLabel(0)).toBe("Обране");
    expect(favoritesLinkLabel(3)).toBe("Обране, 3 об'єкти");
  });
});
