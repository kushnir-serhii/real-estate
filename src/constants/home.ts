// Mock — replace for the real agency.
export const HERO = {
  eyebrow: "Київ і область",
  lead: "Квартири, будинки, комерційні приміщення та ділянки в Києві й області. Допоможемо з вибором і супроводимо угоду.",
  primaryCta: "Підібрати об'єкт",
  image: { src: "/placeholders/flat-living-2.webp", width: 1280, height: 853 },
} as const;

export const FEATURED = {
  eyebrow: "Каталог",
  title: "Нові пропозиції",
  action: "Усі об'єкти",
} as const;

// Mock — replace for the real agency.
export const HOW_WE_WORK = {
  eyebrow: "Процес",
  title: "Як ми працюємо",
  steps: [
    { title: "Заявка", text: "Розповідаєте, що шукаєте. Це хвилина в чаті, формі або по телефону." },
    { title: "Підбір", text: "Менеджер добирає варіанти під бюджет, район і терміни." },
    { title: "Перегляди і перевірка", text: "Їздимо на перегляди, юрист перевіряє документи й власника." },
    { title: "Угода і ключі", text: "Супроводжуємо підписання, розрахунок і передачу ключів." },
  ],
} as const;

// Mock — replace for the real agency.
export const PROPTECH = {
  eyebrow: "Сервіс",
  title: "Зручно на кожному кроці",
  description: "Менше очікування і ручної рутини, більше часу на вибір житла.",
  assistant: {
    title: "Віртуальний консультант",
    text: "Підкаже об'єкти за вашим описом, відповість на питання про агентство і передасть заявку менеджеру. У будь-який час доби.",
    cta: "Розпочати чат",
    preview: "Шукаю 2-кімнатну біля метро до 90 000 $",
  },
  features: [
    {
      icon: "refresh",
      title: "Синхронізація з CRM",
      text: "Об'єкти й ціни оновлюються автоматично з Plektan, без застарілих оголошень.",
    },
    {
      icon: "send",
      title: "Миттєві сповіщення",
      text: "Щойно ви залишаєте заявку, менеджер отримує повідомлення в Telegram.",
    },
    {
      icon: "heart",
      title: "Обрані та підбір",
      text: "Зберігайте об'єкти, порівнюйте їх і шукайте за власними критеріями.",
    },
  ],
} as const;

// Mock — replace for the real agency.
export const ABOUT = {
  eyebrow: "Про агентство",
  action: "Більше про нас",
  images: {
    main: { src: "/placeholders/house-exterior-2.webp", width: 1100, height: 733 },
    secondary: { src: "/placeholders/flat-kitchen-1.webp", width: 1280, height: 767 },
    tertiary: { src: "/placeholders/building-facade-1.webp", width: 1100, height: 733 },
  },
} as const;

// Mock — replace for the real agency (real district photos: see spec 018 → External needs). Photos are 1000px-wide
// copies in public/placeholders/districts/ (≤ ~75 KB each, see its README).
// `name` must match a district in the catalog data (it is the `district` filter value). The first item's photo is the
// default one, shown while no district is hovered or focused.
export const DISTRICT_PICKER = {
  eyebrow: "Райони",
  title: "Райони Києва",
  description: "Оберіть район, щоб побачити об'єкти в ньому.",
  items: [
    { name: "Голосіївський", image: { src: "/placeholders/districts/house-exterior-1-1000.webp", width: 1000, height: 663 } },
    { name: "Дарницький", image: { src: "/placeholders/districts/building-facade-1-1000.webp", width: 1000, height: 666 } },
    { name: "Деснянський", image: { src: "/placeholders/districts/plot-landscape-1-1000.webp", width: 1000, height: 562 } },
    { name: "Дніпровський", image: { src: "/placeholders/districts/flat-living-2-1000.webp", width: 1000, height: 666 } },
    { name: "Оболонський", image: { src: "/placeholders/districts/house-exterior-2-1000.webp", width: 1000, height: 666 } },
    { name: "Печерський", image: { src: "/placeholders/districts/office-interior-1-1000.webp", width: 1000, height: 667 } },
    { name: "Подільський", image: { src: "/placeholders/districts/flat-living-3-1000.webp", width: 1000, height: 667 } },
    { name: "Святошинський", image: { src: "/placeholders/districts/flat-kitchen-1-1000.webp", width: 1000, height: 599 } },
    { name: "Солом'янський", image: { src: "/placeholders/districts/flat-living-1-1000.webp", width: 1000, height: 882 } },
    { name: "Шевченківський", image: { src: "/placeholders/districts/flat-bedroom-1-1000.webp", width: 1000, height: 667 } },
  ],
} as const;

// Mock — replace for the real agency. `name` must match a district in the catalog data (it is the `district` filter value).
export const DISTRICTS = {
  eyebrow: "Райони",
  title: "Шукайте за районом",
  description: "Оберіть район Києва, де хочете жити.",
  cta: "Дивитись",
  items: [
    {
      name: "Печерський",
      tagline: "Центр, парки і Лавра",
      image: { src: "/placeholders/building-facade-1.webp", width: 1100, height: 733 },
    },
    {
      name: "Подільський",
      tagline: "Історичний Поділ біля Дніпра",
      image: { src: "/placeholders/house-exterior-1.webp", width: 1280, height: 849 },
    },
    {
      name: "Голосіївський",
      tagline: "Зелені двори й нові ЖК",
      image: { src: "/placeholders/flat-bedroom-1.webp", width: 1000, height: 667 },
    },
    {
      name: "Оболонський",
      tagline: "Набережна й тихі квартали",
      image: { src: "/placeholders/house-exterior-2.webp", width: 1100, height: 733 },
    },
    {
      name: "Шевченківський",
      tagline: "Метро, університети, кафе",
      image: { src: "/placeholders/flat-living-1.webp", width: 1280, height: 1129 },
    },
    {
      name: "Дарницький",
      tagline: "Лівий берег, доступні ціни",
      image: { src: "/placeholders/flat-living-3.webp", width: 1280, height: 854 },
    },
  ],
} as const;

// Mock — replace for the real agency.
export const HOME_CTA = {
  title: "Не знайшли потрібне?",
  lead: "Розкажіть, що шукаєте, і ми підберемо варіанти. Залиште заявку або зателефонуйте чи напишіть.",
} as const;

export const HOME_BLOG = {
  eyebrow: "Блог",
  title: "Останні статті",
  action: "Усі статті",
  count: 3,
} as const;
