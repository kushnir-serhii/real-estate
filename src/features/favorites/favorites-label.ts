const rules = new Intl.PluralRules("uk");

/** «1 об'єкт», «2 об'єкти», «5 об'єктів». */
export const objectsCount = (count: number): string => {
  switch (rules.select(count)) {
    case "one":
      return `${count} об'єкт`;
    case "few":
      return `${count} об'єкти`;
    default:
      return `${count} об'єктів`;
  }
};

/** Accessible name of the header link. */
export const favoritesLinkLabel = (count: number): string =>
  count > 0 ? `Обране, ${objectsCount(count)}` : "Обране";
