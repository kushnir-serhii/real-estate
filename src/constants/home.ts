// Mock — replace for the real agency.
export const HERO = {
  eyebrow: "Київ і область",
  lead: "Квартири, будинки, комерційні приміщення та ділянки в Києві й області.",
  image: { src: "/placeholders/flat-living-2.webp", width: 1280, height: 853 },
} as const;

export const EXCLUSIVE = {
  eyebrow: "Колекція",
  title: "Ексклюзивні об'єкти",
  lead: "Вибрані квартири та будинки, які ми рекомендуємо",
  count: 3,
  action: { href: "/catalog?deal=sell&sort=price_desc", label: "Уся колекція" },
} as const;

export const NEW_PROPERTIES = {
  eyebrow: "Каталог",
  title: "Нові пропозиції",
  allAction: "Усі об'єкти",
  emptyDeal: "У цьому розділі поки немає об'єктів.",
  tabs: [
    { deal: "sell", label: "Купити" },
    { deal: "rent_long", label: "Оренда" },
    { deal: "rent_day", label: "Подобово" },
  ],
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
export const ABOUT = {
  eyebrow: "Про агентство",
  action: "Більше про нас",
  images: {
    main: { src: "/placeholders/house-exterior-2.webp", width: 1100, height: 733 },
    secondary: { src: "/placeholders/flat-kitchen-1.webp", width: 1280, height: 767 },
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

// Mock — replace for the real agency.
export const WHY_US = {
  eyebrow: "Чому ми",
  title: "Як ми дбаємо про вашу угоду",
  items: [
    { title: "Перевірені об'єкти", text: "Перед публікацією звіряємо документи та власника, щоб ви бачили лише те, що можна купити чи орендувати." },
    { title: "Комісія без сюрпризів", text: "Називаємо розмір комісії до першого перегляду. Жодних прихованих доплат." },
    { title: "Один менеджер", text: "Одна людина веде вас від заявки до ключів і завжди на зв'язку." },
    { title: "Будь-який бюджет", text: "Працюємо і з орендою кімнати, і з купівлею будинку. Підберемо варіанти під ваші можливості." },
  ],
} as const;

// Mock — replace for the real agency.
export const SERVICES = {
  eyebrow: "Послуги",
  title: "Чим ми допоможемо",
  items: [
    { key: "buy", title: "Купівля", text: "Підбір, перегляди й супровід угоди.", href: "/catalog?deal=sell" },
    { key: "sell", title: "Продаж", text: "Оцінимо, покажемо покупцям і проведемо угоду.", href: "/contacts" },
    { key: "rent", title: "Оренда", text: "Квартири й будинки для довгого проживання.", href: "/catalog?deal=rent_long" },
    { key: "commercial", title: "Комерційна нерухомість", text: "Офіси, магазини та приміщення під бізнес.", href: "/catalog?property_type=commercial" },
    { key: "legal", title: "Юридична перевірка", text: "Документи, власник і ризики до підписання.", href: "/contacts" },
    { key: "valuation", title: "Оцінка вартості", text: "Реальна ринкова ціна вашого об'єкта.", href: "/contacts" },
  ],
} as const;

// Mock — replace for the real agency.
export const FAQ = {
  eyebrow: "FAQ",
  title: "Питання та відповіді",
  items: [
    { question: "Скільки коштують ваші послуги і хто платить комісію?", answer: "Розмір комісії узгоджуємо до першого перегляду, письмово і без прихованих доплат. Хто саме її сплачує, залежить від типу угоди, ми все пояснимо наперед." },
    { question: "Які документи потрібні для угоди?", answer: "Покупцеві й орендарю потрібні паспорт та ідентифікаційний код. Решту, зокрема документи на об'єкт, перевіряє наш юрист і підказує, що ще підготувати." },
    { question: "Чи перевіряєте ви власника та документи?", answer: "Так. Перед показом звіряємо право власності, обтяження й повноваження того, хто підписує угоду." },
    { question: "Чи можна купити з іпотекою або за програмою єОселя?", answer: "Так. Підберемо об'єкти, які підходять банку чи програмі, і допоможемо зібрати пакет документів." },
    { question: "Скільки триває угода?", answer: "Залежить від об'єкта, документів і способу оплати. Орієнтовні терміни назве менеджер, коли побачить вашу ситуацію." },
    { question: "Чи працюєте ви з подобовою орендою?", answer: "Так, у каталозі є окремий розділ подобової оренди. Бронювання уточнюйте за телефоном або у формі заявки." },
    { question: "Чи допоможете продати мою квартиру?", answer: "Так. Оцінимо об'єкт, підготуємо оголошення, покажемо його покупцям і проведемо угоду. Залиште заявку, і менеджер зв'яжеться з вами." },
    { question: "Як записатися на перегляд?", answer: "Натисніть «Записатися на перегляд» на сторінці об'єкта, зателефонуйте або напишіть нам. Менеджер підтвердить час." },
  ],
} as const;
