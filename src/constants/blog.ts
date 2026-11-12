import { BRAND } from "./brand";

// Mock — replace for the real agency. Keep the keys in sync with the check constraint in the posts migration.
export const BLOG_CATEGORIES = [
  { key: "buyers", label: "Покупцям" },
  { key: "sellers", label: "Продавцям" },
  { key: "rent", label: "Оренда" },
  { key: "market", label: "Ринок" },
  { key: "tips", label: "Поради" },
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number]["key"];

// Cast: `map` loses the non-empty tuple type that z.enum needs; the keys come from the const array above.
export const BLOG_CATEGORY_KEYS = BLOG_CATEGORIES.map((category) => category.key) as [BlogCategory, ...BlogCategory[]];

export const BLOG_PAGE_SIZE = 6;

/** Related properties shown under a post. */
export const BLOG_RELATED_MAX = 3;

/** Shown as the author when a post has no agent. */
export const BLOG_DEFAULT_AUTHOR = `Команда ${BRAND.name}`;

export const isBlogCategory = (value: unknown): value is BlogCategory =>
  BLOG_CATEGORIES.some((category) => category.key === value);

export const blogCategoryLabel = (key: BlogCategory): string =>
  BLOG_CATEGORIES.find((category) => category.key === key)?.label ?? key;

// Copy of the public blog pages. Mock — replace for the real agency.
export const BLOG_PAGE = {
  eyebrow: "Блог",
  title: "Статті про нерухомість",
  lead: "Поради покупцям, продавцям і орендарям, огляди ринку та відповіді на питання, які нам ставлять найчастіше.",
  allCategories: "Усі",
  filterLabel: "Категорії статей",
  listLabel: "Статті",
  emptyAllTitle: "Статті з'являться незабаром",
  emptyAllBody: "Ми готуємо корисні матеріали. А поки перегляньте об'єкти в каталозі або зателефонуйте нам.",
  emptyCategoryTitle: "У цій категорії поки немає статей",
  emptyCategoryBody: "Перегляньте всі статті або оберіть іншу категорію.",
  outOfRangeTitle: "Такої сторінки немає",
  outOfRangeBody: "Почніть з першої сторінки блогу.",
  allArticles: "Усі статті",
  toFirstPage: "На першу сторінку",
  toCatalog: "До каталогу",
  loadError: "Не вдалося завантажити статті",
  loadErrorBody: "Перевірте з'єднання і спробуйте ще раз.",
} as const;

export const BLOG_POST_PAGE = {
  breadcrumbsLabel: "Навігація сторінкою",
  related: "Об'єкти до статті",
  relatedEyebrow: "Каталог",
  authorEyebrow: "Автор",
  authorRole: "Агент з нерухомості",
  authorTeamRole: "Редакція блогу",
  tagsLabel: "Теги",
  ctaTitle: "Є питання щодо вашої ситуації?",
  ctaLead: "Розкажіть, що вам потрібно, і ми підкажемо наступний крок або підберемо варіанти.",
  ctaAction: "Залишити заявку",
  backToBlog: "Усі статті",
  coverMissing: "Без обкладинки",
} as const;

export const BLOG_ERROR = {
  eyebrow: "Блог",
  title: "Не вдалося відкрити блог",
  lead: "Щось пішло не так під час завантаження статей. Спробуйте ще раз або поверніться пізніше.",
  retry: "Спробувати ще раз",
  home: "На головну",
} as const;

export const BLOG_NOT_FOUND = {
  eyebrow: "Блог",
  title: "Цієї статті немає",
  lead: "Можливо, її видалили або посилання містить помилку. Перегляньте інші статті.",
  action: "До всіх статей",
} as const;
