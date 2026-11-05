// Copy of the inner pages (headers, empty and error states). Mock — replace for the real agency.

export const CATALOG_PAGE = {
  eyebrow: "Каталог",
} as const;

export const ABOUT_PAGE = {
  eyebrow: "Про нас",
  lead: "Команда, яка веде угоду від першого перегляду до ключів.",
  contactAction: "Зв'язатися з нами",
  catalogAction: "Перейти до каталогу",
} as const;

export const CONTACTS_PAGE = {
  eyebrow: "Контакти",
  contactTitle: "Зателефонуйте або напишіть",
  formTitle: "Залишити заявку",
  formDescription:
    "Напишіть, що шукаєте: купити чи орендувати, який тип, побажання. Підберемо варіанти й зателефонуємо.",
  agentsEyebrow: "Команда",
  agentsTitle: "Наші ріелтори",
  mapEyebrow: "Офіс",
  mapTitle: "Як нас знайти",
} as const;

export const FAVORITES_PAGE = {
  eyebrow: "Збережене",
  title: "Обране",
  lead: "Список зберігається лише на цьому пристрої, у цьому браузері.",
} as const;

export const PRIVACY_PAGE = {
  eyebrow: "Правова інформація",
  draftNote: "Чернетка: текст має перевірити агентство або юрист перед запуском.",
} as const;

export const NOT_FOUND_PAGE = {
  code: "404",
  eyebrow: "Сторінку не знайдено",
  title: "Тут немає нічого, окрім повітря",
  lead: "Можливо, адресу введено з помилкою, або сторінку вже видалено. Поверніться на головну чи перегляньте наші пропозиції в каталозі.",
  home: "На головну",
  catalog: "Перейти до каталогу",
} as const;

export const ERROR_PAGE = {
  eyebrow: "Помилка",
  title: "Щось пішло не так",
  lead: "Не вдалося завантажити сторінку. Спробуйте ще раз або поверніться пізніше.",
  retry: "Спробувати ще",
  home: "На головну",
} as const;

export const CATALOG_ERROR = {
  eyebrow: "Каталог",
  title: "Не вдалося відкрити каталог",
  lead: "Щось пішло не так під час завантаження об'єктів. Спробуйте ще раз або поверніться пізніше.",
  retry: "Спробувати ще раз",
  contacts: "Контакти",
} as const;

export const PROPERTY_ERROR = {
  eyebrow: "Об'єкт",
  title: "Не вдалося відкрити об'єкт",
  lead: "Щось пішло не так під час завантаження сторінки. Спробуйте ще раз або перегляньте інші пропозиції в каталозі.",
  retry: "Спробувати ще раз",
  catalog: "До каталогу",
} as const;

export const PROPERTY_PAGE = {
  back: "До каталогу",
  similarEyebrow: "Вам може сподобатись",
  similarTitle: "Схожі об'єкти",
  similarAction: "Усі об'єкти",
  factsTitle: "Характеристики",
  descriptionTitle: "Опис",
  locationTitle: "Розташування",
} as const;
