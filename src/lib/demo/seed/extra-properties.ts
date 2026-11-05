import type { Database } from "@/lib/supabase/database.types";
import type { SeedPhotoFile } from "./photos";
import type { SeedProperty } from "./properties";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type Agent = SeedProperty["agent"];

/**
 * More published listings (spec 012, slice 10) so no public page looks empty: every home district has ≥ 3 results,
 * every deal has ≥ 4, and every published listing has ≥ 3 similar ones (same deal + type, price within ±30%).
 * Appended after the original rows, so the ids of existing rows (index-based) never change. `coverage.test.ts` pins the counts.
 */

type Spot = { district: string | null; locality: string; lat: number; lng: number };

const KYIV = "Київ";
const SPOTS = {
  shevchenkivskyi: { district: "Шевченківський", locality: KYIV, lat: 50.453, lng: 30.493 },
  pecherskyi: { district: "Печерський", locality: KYIV, lat: 50.418, lng: 30.54 },
  podilskyi: { district: "Подільський", locality: KYIV, lat: 50.469, lng: 30.515 },
  holosiivskyi: { district: "Голосіївський", locality: KYIV, lat: 50.39, lng: 30.5 },
  obolonskyi: { district: "Оболонський", locality: KYIV, lat: 50.51, lng: 30.498 },
  darnytskyi: { district: "Дарницький", locality: KYIV, lat: 50.44, lng: 30.63 },
  sviatoshynskyi: { district: "Святошинський", locality: KYIV, lat: 50.457, lng: 30.37 },
  dniprovskyi: { district: "Дніпровський", locality: KYIV, lat: 50.47, lng: 30.6 },
  desnianskyi: { district: "Деснянський", locality: KYIV, lat: 50.52, lng: 30.61 },
  irpin: { district: null, locality: "Ірпінь", lat: 50.5183, lng: 30.2498 },
  bucha: { district: null, locality: "Буча", lat: 50.543, lng: 30.212 },
  vyshneve: { district: null, locality: "Вишневе", lat: 50.388, lng: 30.372 },
  kozyn: { district: null, locality: "Козин", lat: 50.275, lng: 30.65 },
  feofaniia: { district: "Голосіївський", locality: KYIV, lat: 50.338, lng: 30.493 },
  hostomel: { district: null, locality: "Гостомель", lat: 50.586, lng: 30.265 },
  hatne: { district: null, locality: "Гатне", lat: 50.379, lng: 30.348 },
  borshchahivka: { district: null, locality: "Софіївська Борщагівка", lat: 50.403, lng: 30.359 },
  kriukivshchyna: { district: null, locality: "Крюківщина", lat: 50.395, lng: 30.33 },
} as const satisfies Record<string, Spot>;
type SpotKey = keyof typeof SPOTS;

type Currency = NonNullable<PropertyRow["currency"]>;

/** One compact row; `toSeed` fills the rest (coordinates, living area, finishing) deterministically. */
type Row = {
  slug: string;
  title: string;
  deal: PropertyRow["deal"];
  type: PropertyRow["property_type"];
  kind: PropertyRow["prop_kind"];
  price: number;
  cur: Currency;
  area: number;
  rooms: number | null;
  storey: number | null;
  storeys: number | null;
  spot: SpotKey;
  street: string;
  house: string;
  days: number;
  agent: Agent;
  text: string;
  lot?: number;
};

const FLAT = "flat";
const A1 = "a1";
const A2 = "a2";
const A4 = "a4";
const A5 = "a5";

const ROWS: Row[] = [
  // Sale, flats: cheap cluster (about 20 000 USD), middle (56–78 000), 120–155 000 and 300–360 000.
  { slug: "gostynka-na-sviatoshyni-zhmerynska-c4a1e2", title: "Гостинка на Святошині, вул. Жмеринська, 18 м²", deal: "sell", type: FLAT, kind: "gostinka", price: 20000, cur: "USD", area: 18, rooms: 1, storey: 3, storeys: 9, spot: "sviatoshynskyi", street: "вул. Жмеринська", house: "9", days: 6, agent: A4, text: "Гостинка з окремим санвузлом і невеликою кухнею в цегляному будинку. Підійде для першої покупки або здачі в оренду. Поруч зупинка трамвая, ринок і парк." },
  { slug: "1-kimnatna-kvartyra-pozniaky-yaltynska-d92b07", title: "1-кімнатна квартира на Позняках, вул. Ялтинська", deal: "sell", type: FLAT, kind: "isolated", price: 22000, cur: "USD", area: 33, rooms: 1, storey: 4, storeys: 9, spot: "darnytskyi", street: "вул. Ялтинська", house: "3", days: 11, agent: A5, text: "Світла однокімнатна квартира з балконом, плиткою і новими вікнами. Тихий двір, поруч метро «Позняки», супермаркет і школа." },
  { slug: "1-kimnatna-kvartyra-raiduzhna-a68f13", title: "1-кімнатна квартира на Райдужній, Дніпровський район", deal: "sell", type: FLAT, kind: "isolated", price: 23500, cur: "USD", area: 35, rooms: 1, storey: 6, storeys: 10, spot: "dniprovskyi", street: "вул. Райдужна", house: "21", days: 18, agent: A4, text: "Однокімнатна квартира з косметичним ремонтом на 6 поверсі. Вікна на південь, кухня 8 м². До набережної та метро «Дарниця» близько 10 хвилин." },
  { slug: "3-kimnatna-kvartyra-pecherskyi-instytutska-5b1e90", title: "3-кімнатна квартира на Печерську, вул. Інститутська", deal: "sell", type: FLAT, kind: "isolated", price: 340000, cur: "USD", area: 98, rooms: 3, storey: 5, storeys: 8, spot: "pecherskyi", street: "вул. Інститутська", house: "18", days: 8, agent: A1, text: "Простора трикімнатна квартира в цегляному будинку біля урядового кварталу. Високі стелі, дві ванні кімнати, окрема гардеробна. Поруч метро «Арсенальна» і Маріїнський парк." },
  { slug: "3-kimnatna-kvartyra-shevchenkivskyi-hlybochytska-7f30c4", title: "3-кімнатна квартира на Глибочицькій, Шевченківський район", deal: "sell", type: FLAT, kind: "isolated", price: 360000, cur: "USD", area: 105, rooms: 3, storey: 7, storeys: 12, spot: "shevchenkivskyi", street: "вул. Глибочицька", house: "40", days: 22, agent: A1, text: "Трикімнатна квартира з європейським ремонтом у сучасному будинку. Кухня-вітальня 32 м², дві спальні, велика тераса. Підземний паркінг і консьєрж." },
  { slug: "3-kimnatna-kvartyra-holosiivskyi-antonovycha-e2d855", title: "3-кімнатна квартира на Антоновича, Голосіївський район", deal: "sell", type: FLAT, kind: "isolated", price: 300000, cur: "EUR", area: 110, rooms: 3, storey: 9, storeys: 14, spot: "holosiivskyi", street: "вул. Антоновича", house: "72", days: 29, agent: A5, text: "Квартира в монолітно-каркасному будинку зі світлим плануванням і панорамними вікнами. Дві ванні кімнати, меблі залишаються. Поруч виставковий центр, парки та метро «Голосіївська»." },
  { slug: "2-kimnatna-kvartyra-obolon-tymoshenka-3c9a47", title: "2-кімнатна квартира на Оболоні, вул. Маршала Тимошенка", deal: "sell", type: FLAT, kind: "isolated", price: 70000, cur: "USD", area: 58, rooms: 2, storey: 8, storeys: 16, spot: "obolonskyi", street: "вул. Маршала Тимошенка", house: "15", days: 13, agent: A4, text: "Двокімнатна квартира з роздільними кімнатами та засклений балкон. Зроблено косметичний ремонт, кухня 10 м². Поруч магазини, школа та вихід до Оболонської набережної." },
  { slug: "2-kimnatna-kvartyra-kharkivskyi-masyv-revutskoho-81b6d2", title: "2-кімнатна квартира на Харківському масиві, вул. Ревуцького", deal: "sell", type: FLAT, kind: "isolated", price: 72000, cur: "USD", area: 60, rooms: 2, storey: 3, storeys: 9, spot: "darnytskyi", street: "вул. Ревуцького", house: "40", days: 25, agent: A2, text: "Квартира з окремими кімнатами, ремонтом 2021 року та новою сантехнікою. Тихий зелений двір, поруч метро «Харківська» і супермаркет." },
  { slug: "1-kimnatna-kvartyra-dniprovskyi-kaunaska-0d47fa", title: "1-кімнатна квартира біля Гідропарку, вул. Каунаська", deal: "sell", type: FLAT, kind: "isolated", price: 60000, cur: "USD", area: 40, rooms: 1, storey: 5, storeys: 9, spot: "dniprovskyi", street: "вул. Каунаська", house: "11", days: 32, agent: A5, text: "Однокімнатна квартира з просторою кухнею та видом на зелений двір. Ремонт середньої давності, чиста юридична історія. До Гідропарку та метро 7 хвилин пішки." },
  { slug: "1-kimnatna-kvartyra-troieshchyna-saburova-9e2c36", title: "1-кімнатна квартира на Троєщині, вул. Сабурова", deal: "sell", type: FLAT, kind: "isolated", price: 56000, cur: "USD", area: 38, rooms: 1, storey: 11, storeys: 16, spot: "desnianskyi", street: "вул. Сабурова", house: "5", days: 37, agent: A2, text: "Квартира на високому поверсі з видом на ліс. Нові вікна, ламінат, кондиціонер. Поруч садок, школа і зупинка до метро «Лісова»." },
  { slug: "2-kimnatna-kvartyra-podil-khoryva-4a7d18", title: "2-кімнатна квартира на Подолі, вул. Хорива", deal: "sell", type: FLAT, kind: "isolated", price: 120000, cur: "USD", area: 66, rooms: 2, storey: 4, storeys: 6, spot: "podilskyi", street: "вул. Хорива", house: "34", days: 15, agent: A1, text: "Двокімнатна квартира в історичному кварталі Подолу. Високі стелі, свіжий ремонт, вікна у двір. Кафе, набережна та метро «Контрактова площа» поруч." },
  { slug: "2-kimnatna-kvartyra-pecherskyi-konovaltsia-b53e60", title: "2-кімнатна квартира на Печерську, вул. Коновальця", deal: "sell", type: FLAT, kind: "isolated", price: 135000, cur: "USD", area: 70, rooms: 2, storey: 6, storeys: 10, spot: "pecherskyi", street: "вул. Євгена Коновальця", house: "26", days: 20, agent: A4, text: "Квартира з окремою кухнею та двома ізольованими кімнатами. Євроремонт, вбудовані шафи. Охоронюваний двір, поруч метро «Палац спорту»." },
  { slug: "3-kimnatna-kvartyra-shevchenkivskyi-bahhovutivska-6c0f91", title: "3-кімнатна квартира на Багговутівській", deal: "sell", type: FLAT, kind: "isolated", price: 155000, cur: "USD", area: 82, rooms: 3, storey: 2, storeys: 5, spot: "shevchenkivskyi", street: "вул. Багговутівська", house: "17", days: 41, agent: A5, text: "Трикімнатна квартира в тихому районі біля Лук'янівки. Три ізольовані кімнати, ремонт 2019 року. Ліфта немає, зате поруч парк і метро «Лук'янівська»." },

  // Long rent, flats.
  { slug: "1-kimnatna-kvartyra-orenda-zakrevskoho-f17b2a", title: "1-кімнатна квартира в оренду, вул. Закревського", deal: "rent_long", type: FLAT, kind: "isolated", price: 18500, cur: "UAH", area: 33, rooms: 1, storey: 4, storeys: 9, spot: "desnianskyi", street: "вул. Закревського", house: "67", days: 9, agent: A4, text: "Затишна однокімнатна квартира з меблями й технікою. Здається на довгий термін, комунальні платежі окремо. Поруч метро «Чернігівська» та великий торговий центр." },
  { slug: "1-kimnatna-kvartyra-orenda-symyrenka-2e8c75", title: "1-кімнатна квартира в оренду на Святошині, вул. Симиренка", deal: "rent_long", type: FLAT, kind: "isolated", price: 20000, cur: "UAH", area: 36, rooms: 1, storey: 7, storeys: 12, spot: "sviatoshynskyi", street: "вул. Симиренка", house: "10", days: 16, agent: A5, text: "Квартира після ремонту з новою кухнею, пральною машиною і кондиціонером. Тихий район, поруч станція «Академмістечко»." },
  { slug: "1-kimnatna-kvartyra-orenda-obolon-heroiv-dnipra-a30d19", title: "1-кімнатна квартира в оренду на Оболоні, вул. Героїв Дніпра", deal: "rent_long", type: FLAT, kind: "isolated", price: 24000, cur: "UAH", area: 40, rooms: 1, storey: 10, storeys: 16, spot: "obolonskyi", street: "вул. Героїв Дніпра", house: "30", days: 23, agent: A2, text: "Світла квартира з видом на озеро, меблі та техніка в наявності. Підійде парі або одній людині. Поруч метро «Оболонь», парк і супермаркет." },
  { slug: "2-kimnatna-kvartyra-orenda-kruhlouniversytetska-7b64e8", title: "2-кімнатна квартира в оренду на Печерську, вул. Круглоуніверситетська", deal: "rent_long", type: FLAT, kind: "isolated", price: 32000, cur: "UAH", area: 55, rooms: 2, storey: 3, storeys: 6, spot: "pecherskyi", street: "вул. Круглоуніверситетська", house: "8", days: 27, agent: A1, text: "Двокімнатна квартира в центрі Печерська. Свіжий ремонт, окрема спальня, робочий кут, швидкісний інтернет. Можна з домашніми тваринами за домовленістю." },
  { slug: "2-kimnatna-kvartyra-orenda-verkhnii-val-5d90c3", title: "2-кімнатна квартира в оренду на Подолі, Верхній Вал", deal: "rent_long", type: FLAT, kind: "isolated", price: 36000, cur: "UAH", area: 62, rooms: 2, storey: 5, storeys: 7, spot: "podilskyi", street: "вул. Верхній Вал", house: "44", days: 34, agent: A4, text: "Простора квартира у сучасному будинку на Подолі: дві спальні, велика вітальня, кухня з технікою. Поруч кафе, ринок і метро «Контрактова площа»." },
  { slug: "3-kimnatna-kvartyra-orenda-tarasivska-c8e2b4", title: "3-кімнатна квартира в оренду, вул. Тарасівська", deal: "rent_long", type: FLAT, kind: "isolated", price: 1100, cur: "USD", area: 90, rooms: 3, storey: 4, storeys: 7, spot: "shevchenkivskyi", street: "вул. Тарасівська", house: "13", days: 45, agent: A5, text: "Велика квартира для сім'ї біля центру: три спальні, два санвузли, меблі. Здається на рік і більше, депозит — одна місячна оплата." },

  // Long rent, houses.
  { slug: "budynok-v-orendu-bucha-vokzalna-1a5f72", title: "Будинок в оренду в Бучі, вул. Вокзальна", deal: "rent_long", type: "house", kind: "single", price: 1000, cur: "USD", area: 120, rooms: 4, storey: null, storeys: 2, spot: "bucha", street: "вул. Вокзальна", house: "22", days: 19, agent: A2, text: "Двоповерховий будинок з каміном, облаштованою кухнею та приватним двором. Підійде родині з дітьми, поруч школа, парк і станція електрички.", lot: 6 },
  { slug: "budynok-v-orendu-irpin-soborna-8c3d06", title: "Будинок в оренду в Ірпені, вул. Соборна", deal: "rent_long", type: "house", kind: "single", price: 1150, cur: "USD", area: 140, rooms: 5, storey: null, storeys: 2, spot: "irpin", street: "вул. Соборна", house: "7", days: 28, agent: A4, text: "Сучасний будинок із теплою підлогою, трьома спальнями та гаражем. Територія з ландшафтним дизайном, є альтернативне опалення.", lot: 8 },
  { slug: "budynok-v-orendu-vyshneve-sviatoiurivska-d4b9a1", title: "Будинок в оренду у Вишневому, вул. Святоюріївська", deal: "rent_long", type: "house", kind: "single", price: 42000, cur: "UAH", area: 110, rooms: 4, storey: null, storeys: 2, spot: "vyshneve", street: "вул. Святоюріївська", house: "31", days: 39, agent: A5, text: "Затишний цегляний будинок біля парку. Чотири кімнати, дві ванні, газове опалення. Власник може залишити меблі й техніку.", lot: 5 },

  // Long rent, commercial.
  { slug: "ofis-v-orendu-obolon-heroiv-stalinhradu-6f2e83", title: "Офіс в оренду на Оболоні, просп. Героїв Сталінграда", deal: "rent_long", type: "commercial", kind: "office_free", price: 1900, cur: "USD", area: 85, rooms: null, storey: 3, storeys: 9, spot: "obolonskyi", street: "просп. Героїв Сталінграда", house: "12", days: 14, agent: A1, text: "Офіс вільного планування з двома кабінетами та переговорною. Кондиціонування, мережі, парковка біля входу. Окремий вхід з двору." },
  { slug: "torhove-prymishchennia-orenda-verkhovnoi-rady-3b77d0", title: "Торгове приміщення в оренду, бульв. Верховної Ради", deal: "rent_long", type: "commercial", kind: "shop", price: 2000, cur: "USD", area: 70, rooms: null, storey: 1, storeys: 9, spot: "darnytskyi", street: "бульв. Верховної Ради", house: "26", days: 21, agent: A2, text: "Перший поверх житлового будинку з вітринними вікнами на жваву вулицю. Висока прохідність, підведені всі комунікації, місце під вивіску." },
  { slug: "ofis-v-orendu-vasylkivska-e1c56a", title: "Офіс в оренду на Васильківській, Голосіївський район", deal: "rent_long", type: "commercial", kind: "office_free", price: 2400, cur: "USD", area: 120, rooms: null, storey: 2, storeys: 6, spot: "holosiivskyi", street: "вул. Васильківська", house: "35", days: 30, agent: A5, text: "Світле приміщення з панорамними вікнами, відкритий простір на 14 робочих місць, кухня для персоналу, два санвузли. Поруч метро «Деміївська»." },
  { slug: "ofis-v-orendu-volodymyrska-9d04f7", title: "Офіс в оренду на Володимирській, центр", deal: "rent_long", type: "commercial", kind: "office_center", price: 2600, cur: "USD", area: 130, rooms: null, storey: 4, storeys: 5, spot: "shevchenkivskyi", street: "вул. Володимирська", house: "49", days: 42, agent: A1, text: "Представницький офіс в історичній будівлі: високі стелі, відремонтовані кабінети, ліфт, охорона. Пішки до Золотих воріт і метро." },

  // Sale, commercial.
  { slug: "ofis-na-hrushevskoho-pecherskyi-4c18b9", title: "Офіс на Грушевського, Печерськ, 95 м²", deal: "sell", type: "commercial", kind: "office_center", price: 230000, cur: "USD", area: 95, rooms: null, storey: 3, storeys: 6, spot: "pecherskyi", street: "вул. Грушевського", house: "9", days: 12, agent: A1, text: "Офіс у діловому кварталі біля урядових установ. Євроремонт, відкрите планування, окремий санвузол, кондиціонери. Орендні відносини можна зберегти." },
  { slug: "torhove-prymishchennia-obolonskyi-prospekt-a7e320", title: "Торгове приміщення на Оболонському проспекті, 110 м²", deal: "sell", type: "commercial", kind: "shop", price: 280000, cur: "USD", area: 110, rooms: null, storey: 1, storeys: 16, spot: "obolonskyi", street: "Оболонський просп.", house: "20", days: 24, agent: A2, text: "Приміщення на першому поверсі нового будинку з прохідною локацією: біля метро та торгового центру. Вільного призначення, вхід з вулиці." },
  { slug: "prymishchennia-vilnoho-pryznachennia-trostianetska-0e92d5", title: "Приміщення вільного призначення на Тростянецькій", deal: "sell", type: "commercial", kind: "office_free", price: 290000, cur: "USD", area: 135, rooms: null, storey: 1, storeys: 9, spot: "darnytskyi", street: "вул. Тростянецька", house: "6", days: 36, agent: A4, text: "Просторе приміщення під кафе, студію або магазин. Власний вхід, висока стеля, готова вентиляція. Поруч житловий масив і зупинка транспорту." },

  // Sale, houses.
  { slug: "budynok-v-irpeni-sosnova-b6d40c", title: "Будинок в Ірпені, вул. Соснова, 130 м²", deal: "sell", type: "house", kind: "single", price: 175000, cur: "USD", area: 130, rooms: 4, storey: null, storeys: 2, spot: "irpin", street: "вул. Соснова", house: "18", days: 10, agent: A4, text: "Двоповерховий будинок із цегли, ділянка 7 соток із фруктовим садом. Газове опалення, гараж, тераса. До центру Ірпеня 7 хвилин на авто.", lot: 7 },
  { slug: "budynok-v-buchi-lisova-52a8e1", title: "Будинок у Бучі, вул. Лісова, 150 м²", deal: "sell", type: "house", kind: "single", price: 190000, cur: "USD", area: 150, rooms: 5, storey: null, storeys: 2, spot: "bucha", street: "вул. Лісова", house: "5", days: 17, agent: A5, text: "Новий будинок поруч із сосновим лісом. Вітальня з кухнею 45 м², три спальні, дві ванні кімнати. Автономне опалення, дорога асфальтована.", lot: 9 },
  { slug: "budynok-u-vyshnevomu-kyivska-c0e739", title: "Будинок у Вишневому, 140 м² з ремонтом", deal: "sell", type: "house", kind: "single", price: 205000, cur: "USD", area: 140, rooms: 4, storey: null, storeys: 2, spot: "vyshneve", street: "вул. Київська", house: "63", days: 26, agent: A2, text: "Будинок з євроремонтом і меблями, ділянка 6 соток з альтанкою. Недалеко школа, садок, кілька торгових центрів. До Києва 15 хвилин.", lot: 6 },
  { slug: "budynok-u-kozyni-soniachna-7d51a2", title: "Будинок у Козині, вул. Сонячна, 170 м²", deal: "sell", type: "house", kind: "single", price: 230000, cur: "USD", area: 170, rooms: 5, storey: null, storeys: 2, spot: "kozyn", street: "вул. Сонячна", house: "14", days: 33, agent: A1, text: "Просторий будинок біля Дніпра: камін, дві тераси, сауна. Територія огороджена, є відеоспостереження. Пляж і клуб — за 10 хвилин пішки.", lot: 10 },
  { slug: "budynok-u-feofanii-akademika-zabolotnoho-9e4b60", title: "Будинок у Феофанії, 220 м² біля парку", deal: "sell", type: "house", kind: "single", price: 380000, cur: "USD", area: 220, rooms: 6, storey: null, storeys: 3, spot: "feofaniia", street: "вул. Академіка Заболотного", house: "9", days: 44, agent: A1, text: "Сучасний будинок на трьох рівнях із цокольним поверхом, гаражем на два авто та ландшафтним двором. Поруч парк «Феофанія» і лікарня.", lot: 12 },
  { slug: "budynok-v-irpeni-nezalezhnosti-d83f15", title: "Будинок в Ірпені, 200 м², вул. Незалежності", deal: "sell", type: "house", kind: "single", price: 400000, cur: "USD", area: 200, rooms: 6, storey: null, storeys: 2, spot: "irpin", street: "вул. Незалежності", house: "52", days: 48, agent: A5, text: "Будинок класу «комфорт+»: теплі підлоги, рекуперація, окрема кімната для гостей. Ділянка 12 соток, відкрита тераса і зона барбекю.", lot: 12 },
  { slug: "chastyna-budynku-v-buchi-vyshneva-26c9d4", title: "Частина будинку в Бучі, вул. Вишнева", deal: "sell", type: "house", kind: "part", price: 75000, cur: "USD", area: 78, rooms: 3, storey: null, storeys: 1, spot: "bucha", street: "вул. Вишнева", house: "11", days: 15, agent: A4, text: "Окремий вхід, власне подвір'я, три кімнати. Гаряча вода та газ підключені, косметичний ремонт. Поруч станція електрички та школа.", lot: 3 },
  { slug: "budynok-u-vyshnevomu-shkilna-4a6f08", title: "Невеликий будинок у Вишневому, вул. Шкільна", deal: "sell", type: "house", kind: "single", price: 80000, cur: "USD", area: 85, rooms: 3, storey: null, storeys: 1, spot: "vyshneve", street: "вул. Шкільна", house: "27", days: 52, agent: A2, text: "Одноповерховий будинок з гарним садом та літньою кухнею. Є колодязь і централізована вода. Зручно для приїзду на вихідні або постійного проживання.", lot: 6 },
  { slug: "budynok-v-irpeni-mokrenka-e57b93", title: "Будинок в Ірпені, вул. Мокренка, 95 м²", deal: "sell", type: "house", kind: "single", price: 95000, cur: "USD", area: 95, rooms: 3, storey: null, storeys: 2, spot: "irpin", street: "вул. Мокренка", house: "3", days: 58, agent: A5, text: "Будинок з мансардою на спокійній вулиці. Є газ, вода й каналізація, дах оновлено. Ділянка 5 соток із паркуванням на дві машини.", lot: 5 },
  { slug: "budynok-v-buchi-kyrylivska-1c8d27", title: "Будинок у Бучі, вул. Кирилівська, 105 м²", deal: "sell", type: "house", kind: "single", price: 100000, cur: "USD", area: 105, rooms: 4, storey: null, storeys: 2, spot: "bucha", street: "вул. Кирилівська", house: "16", days: 60, agent: A4, text: "Будинок із цегли, чотири кімнати, ремонт у вітальні й кухні. Ділянка 6 соток, газ та електрика 10 кВт. Поруч парк Бучанського лісу.", lot: 6 },

  // Sale, plots.
  { slug: "dilianka-12-sotok-hostomel-b2e6a8", title: "Ділянка 12 соток у Гостомелі під будівництво", deal: "sell", type: "plot", kind: "private_house_building", price: 80000, cur: "USD", area: 0, rooms: null, storey: null, storeys: null, spot: "hostomel", street: "вул. Свято-Михайлівська", house: "8", days: 21, agent: A4, text: "Рівна ділянка правильної форми, цільове призначення: будівництво житлового будинку. Світло на межі, газ поруч, асфальтований під'їзд.", lot: 12 },
  { slug: "dilianka-8-sotok-bucha-yablunska-7a31c5", title: "Ділянка 8 соток у Бучі, вул. Яблунська", deal: "sell", type: "plot", kind: "private_house_building", price: 90000, cur: "USD", area: 0, rooms: null, storey: null, storeys: null, spot: "bucha", street: "вул. Яблунська", house: "21", days: 31, agent: A5, text: "Ділянка у тихій частині Бучі, поруч сосновий ліс. Комунікації на межі, сусіди вже будуються. Документи оформлені, право власності зареєстровано.", lot: 8 },
  { slug: "dilianka-10-sotok-irpin-hlinky-d09e46", title: "Ділянка 10 соток в Ірпені, вул. Глінки", deal: "sell", type: "plot", kind: "private_house_building", price: 100000, cur: "USD", area: 0, rooms: null, storey: null, storeys: null, spot: "irpin", street: "вул. Глінки", house: "12", days: 40, agent: A2, text: "Рівна ділянка поруч із річкою Ірпінь. Підведені газ, світло, вода. Зручний під'їзд і розвинена інфраструктура поруч.", lot: 10 },
  { slug: "dilianka-15-sotok-kozyn-bereziva-3f87b2", title: "Ділянка 15 соток у Козині, вул. Березова", deal: "sell", type: "plot", kind: "private_house_building", price: 130000, cur: "USD", area: 0, rooms: null, storey: null, storeys: null, spot: "kozyn", street: "вул. Березова", house: "4", days: 46, agent: A1, text: "Велика ділянка в закритому селищі біля Дніпра. Охорона, асфальтовані дороги, усі комунікації. Можна будувати будинок до 400 м².", lot: 15 },
  { slug: "dilianka-20-sotok-irpin-lisova-a4c71d", title: "Ділянка 20 соток в Ірпені біля лісу", deal: "sell", type: "plot", kind: "private_house_building", price: 150000, cur: "USD", area: 0, rooms: null, storey: null, storeys: null, spot: "irpin", street: "вул. Лісова", house: "30", days: 53, agent: A5, text: "Ділянка на краю лісу з видом на природу. Рівний рельєф, є дозвіл на підключення комунікацій. Підійде для великого будинку з садом.", lot: 20 },
  { slug: "dachna-dilianka-vyshneve-sadova-5b02e9", title: "Дачна ділянка 6 соток у Вишневому", deal: "sell", type: "plot", kind: "dacha", price: 12500, cur: "USD", area: 0, rooms: null, storey: null, storeys: null, spot: "vyshneve", street: "вул. Садова", house: "2", days: 27, agent: A4, text: "Невелика ділянка у дачному кооперативі, світло на межі. Можна використовувати для відпочинку чи садівництва. Поруч озеро.", lot: 6 },
  { slug: "dilianka-7-sotok-hatne-poliova-c6e83a", title: "Ділянка 7 соток у Гатному, вул. Польова", deal: "sell", type: "plot", kind: "agricultural_purposes", price: 13500, cur: "USD", area: 0, rooms: null, storey: null, storeys: null, spot: "hatne", street: "вул. Польова", house: "1", days: 35, agent: A2, text: "Ділянка біля лісосмуги, зручний під'їзд з траси. Цільове призначення: ведення особистого селянського господарства.", lot: 7 },
  { slug: "dilianka-6-sotok-sofiivska-borshchahivka-d17a50", title: "Ділянка 6 соток у Софіївській Борщагівці", deal: "sell", type: "plot", kind: "private_house_building", price: 600000, cur: "UAH", area: 0, rooms: null, storey: null, storeys: null, spot: "borshchahivka", street: "вул. Вишнева", house: "19", days: 49, agent: A5, text: "Ділянка з правом забудови в районі приватних будинків. Поруч магазини, школа та маршрутка до метро.", lot: 6 },
  { slug: "dilianka-8-sotok-kriukivshchyna-e8f2b4", title: "Ділянка 8 соток у Крюківщині", deal: "sell", type: "plot", kind: "private_house_building", price: 700000, cur: "UAH", area: 0, rooms: null, storey: null, storeys: null, spot: "kriukivshchyna", street: "вул. Київська", house: "40", days: 55, agent: A4, text: "Рівна ділянка в розвиненому селі біля Києва. Газ і світло по вулиці, дорога із твердим покриттям.", lot: 8 },

  // Daily rent.
  { slug: "studiia-podobovo-pecherskyi-lesi-ukrainky-1b9c64", title: "Студія подобово на Печерську, бульв. Лесі Українки", deal: "rent_day", type: FLAT, kind: "studio", price: 1600, cur: "UAH", area: 28, rooms: 1, storey: 8, storeys: 18, spot: "pecherskyi", street: "бульв. Лесі Українки", house: "30", days: 7, agent: A1, text: "Охайна студія з видом на Дніпро. Двоспальне ліжко, кухонна зона, Wi-Fi, постільна білизна та рушники. Метро «Кловська» за 5 хвилин." },
  { slug: "1-kimnatna-kvartyra-podobovo-obolon-3d57a9", title: "1-кімнатна квартира подобово на Оболоні", deal: "rent_day", type: FLAT, kind: "isolated", price: 1900, cur: "UAH", area: 38, rooms: 1, storey: 9, storeys: 16, spot: "obolonskyi", street: "просп. Володимира Івасюка", house: "8", days: 10, agent: A4, text: "Квартира з окремою спальнею та балконом, пральна машина, кондиціонер. Зручно для відряджень: поруч метро «Героїв Дніпра» і торговий центр." },
  { slug: "1-kimnatna-kvartyra-podobovo-pozniaky-6f10e3", title: "1-кімнатна квартира подобово на Позняках", deal: "rent_day", type: FLAT, kind: "isolated", price: 2100, cur: "UAH", area: 42, rooms: 1, storey: 12, storeys: 24, spot: "darnytskyi", street: "вул. Милославська", house: "2", days: 16, agent: A5, text: "Нова квартира в сучасному комплексі з охоронюваним двором. Є все для проживання: техніка, посуд, білизна, швидкий інтернет." },
  { slug: "2-kimnatna-kvartyra-podobovo-holosiiv-4e8a21", title: "2-кімнатна квартира подобово біля Голосіївського парку", deal: "rent_day", type: FLAT, kind: "isolated", price: 2600, cur: "UAH", area: 60, rooms: 2, storey: 5, storeys: 9, spot: "holosiivskyi", street: "вул. Васильківська", house: "13", days: 24, agent: A2, text: "Дві спальні, вітальня з диваном, кухня з усім необхідним. Розрахована на 5 гостей. Поруч парк, ресторани і метро «Голосіївська»." },
  { slug: "studiia-podobovo-podil-sahaidachnoho-9a2d73", title: "Студія подобово на Подолі, вул. Сагайдачного", deal: "rent_day", type: FLAT, kind: "studio", price: 1400, cur: "UAH", area: 25, rooms: 1, storey: 3, storeys: 5, spot: "podilskyi", street: "вул. Петра Сагайдачного", house: "20", days: 5, agent: A4, text: "Компактна студія в самому серці Подолу. Є все для короткого проживання, поруч кафе, галереї й набережна." },
];

const FLAT_PHOTOS: readonly SeedPhotoFile[] = ["flat-living-1", "flat-living-2", "flat-living-3", "flat-kitchen-1", "flat-bedroom-1", "flat-bathroom-1"];
const HOUSE_INTERIOR: readonly SeedPhotoFile[] = ["flat-living-2", "flat-kitchen-1", "flat-bedroom-1", "flat-living-3", "flat-bathroom-1"];
const COMMERCIAL_SETS: readonly (readonly SeedPhotoFile[])[] = [
  ["office-interior-1", "building-facade-1", "flat-kitchen-1"],
  ["building-facade-1", "office-interior-1", "flat-living-3"],
  ["office-interior-1", "flat-living-2", "building-facade-1", "flat-kitchen-1"],
];
const PLOT_SETS: readonly (readonly SeedPhotoFile[])[] = [
  ["plot-landscape-1", "house-exterior-2"],
  ["plot-landscape-1", "house-exterior-1"],
];

/** Rotating windows over the placeholder pool so neighbouring listings differ in photo order and count (3–6). */
const rotate = <T,>(pool: readonly T[], start: number, count: number): T[] =>
  Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);

const photosFor = (row: Row, index: number): SeedPhotoFile[] => {
  switch (row.type) {
    case "flat":
      return rotate(FLAT_PHOTOS, index, 3 + (index % 4));
    case "house":
      return [index % 2 === 0 ? "house-exterior-1" : "house-exterior-2", ...rotate(HOUSE_INTERIOR, index, 2 + (index % 3))];
    case "commercial":
      return [...COMMERCIAL_SETS[index % COMMERCIAL_SETS.length]];
    default:
      return [...PLOT_SETS[index % PLOT_SETS.length]];
  }
};

const REPAIRS: NonNullable<PropertyRow["repair"]>[] = ["evro", "cosmetic", "major", "evro"];
const WALLS: NonNullable<PropertyRow["wall_material"]>[] = ["brick", "panel", "monolit_carcas", "brick", "gas_block"];

const toSeed = (row: Row, index: number): SeedProperty => {
  const spot = SPOTS[row.spot];
  const isPlot = row.type === "plot";
  const isFlat = row.type === "flat";
  // Small deterministic offset so markers of one district don't stack.
  const lat = Number((spot.lat + (((index * 7) % 11) - 5) * 0.0011).toFixed(4));
  const lng = Number((spot.lng + (((index * 5) % 13) - 6) * 0.0013).toFixed(4));
  return {
    source: "admin",
    external_id: null,
    status: "published",
    deal: row.deal,
    property_type: row.type,
    prop_kind: row.kind,
    price_amount: row.price,
    currency: row.cur,
    area_total: isPlot ? null : row.area,
    area_life: isFlat || row.type === "house" ? Math.round(row.area * 0.6) : null,
    area_kitchen: isFlat && row.kind !== "studio" && row.kind !== "gostinka" ? 9 : null,
    area_lot: row.lot ?? null,
    room_count: row.rooms,
    storey: row.storey,
    storeys: row.storeys,
    repair: isPlot ? null : REPAIRS[index % REPAIRS.length],
    wall_material: isPlot || row.type === "commercial" ? null : WALLS[index % WALLS.length],
    housing_class: isFlat && row.price > 200000 ? "business" : null,
    is_newbuilding: false,
    locality: spot.locality,
    district: spot.district,
    street: row.street,
    house: row.house,
    lat,
    lng,
    title: row.title,
    description: row.text,
    slug: row.slug,
    agent: row.agent,
    raw: null,
    publishedDaysAgo: row.days,
    seo_title: null,
    seo_description: null,
    hiddenDaysAgo: null,
  };
};

export const EXTRA_SEED_PROPERTIES: SeedProperty[] = ROWS.map(toSeed);

/** Photo sets of the extra listings (same shape as `SEED_PHOTO_SETS`). */
export const EXTRA_PHOTO_SETS: Record<string, readonly SeedPhotoFile[]> = Object.fromEntries(
  ROWS.map((row, index) => [row.slug, photosFor(row, index)]),
);
