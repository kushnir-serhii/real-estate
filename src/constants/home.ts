// Mock — replace for the real agency.
export const HERO = {
  eyebrow: "Київ і область · з 2014 року",
  lead: "Квартири, будинки, комерційні приміщення та ділянки в Києві й області. Допоможемо з вибором і супроводимо угоду.",
  primaryCta: "Підібрати об'єкт",
  facts: [
    { icon: "calendar", label: "12 років на ринку" },
    { icon: "handshake", label: "1 400+ угод" },
    { icon: "shield", label: "Перевірені документи" },
  ],
  image: { src: "/placeholders/flat-living-2.webp", width: 1280, height: 853 },
} as const;

export const FEATURED = {
  eyebrow: "Каталог",
  title: "Нові пропозиції",
  action: "Усі об'єкти",
} as const;

// Mock — replace for the real agency. `value` is the final number (animated up from 0 when `animate`); `suffix` follows it.
export const TRUST_STATS = [
  { value: 12, decimals: 0, animate: true, suffix: "", label: "років на ринку" },
  { value: 1400, decimals: 0, animate: true, suffix: "+", label: "успішних угод" },
  { value: 4.9, decimals: 1, animate: true, suffix: "", label: "рейтинг клієнтів" },
  { value: 300, decimals: 0, animate: true, suffix: "+", label: "об'єктів у базі" },
] as const;

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
  chip: { value: "1 400+", label: "угод за 12 років" },
  images: {
    main: { src: "/placeholders/house-exterior-2.webp", width: 1100, height: 733 },
    secondary: { src: "/placeholders/flat-kitchen-1.webp", width: 1280, height: 767 },
    tertiary: { src: "/placeholders/building-facade-1.webp", width: 1100, height: 733 },
  },
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
export const AGENTS = {
  eyebrow: "Команда",
  title: "Наші агенти",
  description: "Живі люди, які відповідають на дзвінки й супроводжують угоди.",
  role: "Агент з нерухомості",
  max: 4,
  cta: "Зв'язатися з менеджером",
  ctaHref: "/contacts#zayavka",
} as const;

// Mock — replace for the real agency (real, consented reviews only).
export const TESTIMONIALS = {
  eyebrow: "Відгуки",
  title: "Що кажуть клієнти",
  items: [
    {
      name: "Олена К.",
      deal: "Купівля 2-кімн. квартири, Поділ",
      text: "Підібрали квартиру за два тижні, юрист перевірив усі документи. Жодних сюрпризів на угоді.",
      rating: 5,
    },
    {
      name: "Андрій М.",
      deal: "Оренда 1-кімн. квартири, Оболонь",
      text: "Відповіли в чаті вночі й уже вранці показали три варіанти. Переїхали за тиждень.",
      rating: 5,
    },
    {
      name: "Ірина та Максим П.",
      deal: "Продаж будинку, Київська область",
      text: "Продали швидше, ніж очікували, і за ціною, яку обговорювали. Менеджер тримав на зв'язку весь час.",
      rating: 5,
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
