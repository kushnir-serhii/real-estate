const rules = new Intl.PluralRules("uk-UA");

// «Знайдено …»: 1 заявку, 2 заявки, 5 заявок, 1,5 заявки.
const FORMS: Record<Intl.LDMLPluralRule, string> = {
  zero: "заявок",
  one: "заявку",
  two: "заявки",
  few: "заявки",
  many: "заявок",
  other: "заявки",
};

export const leadsCountLabel = (n: number): string =>
  `${new Intl.NumberFormat("uk-UA").format(n)} ${FORMS[rules.select(n)]}`;
