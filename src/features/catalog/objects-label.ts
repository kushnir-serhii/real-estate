const pluralRules = new Intl.PluralRules("uk");
const OBJECT_FORMS: Record<Intl.LDMLPluralRule, string> = {
  zero: "об'єктів",
  one: "об'єкт",
  two: "об'єкти",
  few: "об'єкти",
  many: "об'єктів",
  other: "об'єкта",
};

/** 1 об'єкт, 2 об'єкти, 5 об'єктів (`Intl.PluralRules('uk')`). Light on purpose: client components import it. */
export const objectsLabel = (n: number): string =>
  `${new Intl.NumberFormat("uk-UA").format(n)} ${OBJECT_FORMS[pluralRules.select(n)]}`;
