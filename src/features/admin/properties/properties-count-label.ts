const rules = new Intl.PluralRules("uk-UA");

// «Знайдено …»: 1 об'єкт, 2 об'єкти, 5 об'єктів, 1,5 об'єкта.
const FORMS: Record<Intl.LDMLPluralRule, string> = {
  zero: "об'єктів",
  one: "об'єкт",
  two: "об'єкти",
  few: "об'єкти",
  many: "об'єктів",
  other: "об'єкта",
};

export const propertiesCountLabel = (n: number): string =>
  `${new Intl.NumberFormat("uk-UA").format(n)} ${FORMS[rules.select(n)]}`;
