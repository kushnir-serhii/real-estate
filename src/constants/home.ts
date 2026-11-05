// Mock — replace for the real agency.
export const HERO = {
  eyebrow: "AI-асистент 24/7 · Київ і область",
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

// Mock — replace for the real agency. `value` is the final number (animated up from 0); `suffix` follows it.
export const TRUST_STATS = [
  { value: 12, decimals: 0, suffix: "", label: "років на ринку" },
  { value: 1400, decimals: 0, suffix: "+", label: "успішних угод" },
  { value: 4.9, decimals: 1, suffix: "", label: "рейтинг клієнтів" },
  { value: 24, decimals: 0, suffix: "/7", label: "AI-асистент онлайн" },
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
  eyebrow: "Технології",
  title: "Технології, що працюють на вас",
  description: "Менше очікування і ручної рутини, більше часу на вибір житла.",
  assistant: {
    title: "AI-асистент 24/7",
    text: "Підбирає об'єкти за вашим описом, відповідає на питання про агентство і передає заявку менеджеру. У будь-який час доби.",
    cta: "Запитати асистента",
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
