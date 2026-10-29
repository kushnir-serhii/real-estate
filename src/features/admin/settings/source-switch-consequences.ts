import type { SourceSwitchSummary } from "@/lib/db/admin-properties";
import type { PropertiesMode } from "@/lib/db/property-permissions";
import { countObjects, pluralUk } from "./count-objects";

const NUMBER = new Intl.NumberFormat("uk-UA");

const plektanBecomeEditable = (n: number): string =>
  n === 0
    ? "Об'єктів з Plektan у базі поки немає; усі майбутні можна буде редагувати тут"
    : `${countObjects(n)} з Plektan ${pluralUk(n, {
        one: "стане редагованим",
        few: "стануть редагованими",
        many: "стануть редагованими",
      })} тут`;

const ownStay = (n: number): string =>
  n === 0
    ? "Об'єктів, створених в адмінці, поки немає"
    : `${NUMBER.format(n)} ${pluralUk(n, {
        one: "ваш об'єкт лишиться",
        few: "ваші об'єкти лишаться",
        many: "ваших об'єктів лишаться",
      })} на сайті; ${n === 1 ? "його" : "їх"} можна буде лише сховати чи опублікувати і змінити SEO`;

/** What happens after switching to `target`, with the real counts, in plain Ukrainian. */
export const sourceSwitchConsequences = (target: PropertiesMode, summary: SourceSwitchSummary): string[] => {
  switch (target) {
    case "admin":
      return [
        plektanBecomeEditable(summary.plektan.total),
        "Синхронізація з Plektan зупиниться: нові й змінені в Plektan об'єкти більше не з'являться на сайті",
        "Створювати нові об'єкти можна буде в адмінці",
      ];
    case "plektan":
      return [
        "Зміни, які ви зробили в об'єктах з Plektan, перезапишуться при наступній синхронізації, а ваші фото до них видаляться",
        ownStay(summary.admin.total),
        "Створення нових об'єктів в адмінці вимкнеться",
      ];
    default: {
      const unreachable: never = target;
      return unreachable;
    }
  }
};
