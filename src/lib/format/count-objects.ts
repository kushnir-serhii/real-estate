const rules = new Intl.PluralRules("uk-UA");
const NUMBER = new Intl.NumberFormat("uk-UA");

type Forms = { one: string; few: string; many: string };

/** Picks the Ukrainian form for a whole count: 1 об'єкт, 2 об'єкти, 5 об'єктів. */
export const pluralUk = (n: number, forms: Forms): string => {
  const rule = rules.select(n);
  switch (rule) {
    case "one":
      return forms.one;
    case "two":
    case "few":
      return forms.few;
    case "zero":
    case "many":
    case "other":
      return forms.many;
    default: {
      const unreachable: never = rule;
      return unreachable;
    }
  }
};

/** «1 об'єкт», «2 об'єкти», «5 об'єктів» (uk-UA digits). */
export const countObjects = (n: number): string =>
  `${NUMBER.format(n)} ${pluralUk(n, { one: "об'єкт", few: "об'єкти", many: "об'єктів" })}`;
