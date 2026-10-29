-- Demo dataset for local development (runs after migrations on `supabase db reset`).
-- Fictional listings, phones and addresses: nobody real is dialed (+380 67 000 00 0X, @lyndrik.example).
-- Photos are Unsplash placeholders from public/placeholders (see its README).
-- Rates (UAH / EUR per 1 USD) come from the settings row: price_usd = round(amount / rate).
-- Plots: area_lot is stored in sotky (1 sotka = 100 m2), the unit Plektan uses for land.

-- settings: the row exists (inserted by the migration); only set the rates ------------------------
update public.settings
set exchange_rates = '{"UAH": 41.5, "EUR": 0.92}'::jsonb
where id;

-- agents ----------------------------------------------------------------------------------------
insert into public.agents (id, source, external_id, name, phones, email, photo_url, is_active) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin', null, 'Олена Коваленко',
    array['+380 67 000 00 01'], 'o.kovalenko@lyndrik.example', null, true),
  ('00000000-0000-4000-8000-0000000000a2', 'admin', null, 'Андрій Мельник',
    array['+380 67 000 00 02', '+380 67 000 00 12'], 'a.melnyk@lyndrik.example', null, true),
  ('00000000-0000-4000-8000-0000000000a3', 'admin', null, 'Ірина Савченко',
    array['+380 67 000 00 03'], 'i.savchenko@lyndrik.example', null, false);

-- properties ------------------------------------------------------------------------------------
-- price_usd and price_per_m2 are filled by the updates below.
insert into public.properties (
  source, external_id, status, deal, property_type, prop_kind,
  price_amount, currency,
  area_total, area_life, area_kitchen, area_lot,
  room_count, storey, storeys, repair, wall_material, housing_class, is_newbuilding,
  locality, district, street, house, lat, lng,
  title, description, slug, agent_id, raw, published_at
) values
-- ===== Flats: sale =====
('admin', null, 'published', 'sell', 'flat', 'isolated',
  78000, 'USD', 62, 36, 11, null,
  2, 5, 16, 'cosmetic', 'panel', 'econom', false,
  'Київ', 'Оболонський', 'просп. Володимира Івасюка', '14', 50.5058, 30.4984,
  '2-кімнатна квартира на Оболоні, просп. Володимира Івасюка',
  E'Світла двокімнатна квартира на 5 поверсі 16-поверхового панельного будинку. Кімнати роздільні, кухня 11 м² з виходом на засклений балкон, санвузол роздільний.\n\nВ квартирі зроблено косметичний ремонт кілька років тому: ламінат, пластикові вікна, нова сантехніка. Меблі та побутова техніка на кухні залишаються за домовленістю.\n\nПоруч школа, дитячий садок, супермаркет і велодоріжка до набережної Оболоні. До метро близько 10 хвилин пішки.',
  '2-kimnatna-kvartyra-na-oboloni-3f9a1c', '00000000-0000-4000-8000-0000000000a1', null, now() - interval '3 days'),

('admin', null, 'published', 'sell', 'flat', 'studio',
  64000, 'USD', 28, 17, null, null,
  1, 9, 24, 'without_finishing', 'monolit_carcas', 'business', true,
  'Київ', 'Печерський', 'вул. Лесі Українки', '7', 50.4312, 30.5391,
  'Студія в новобудові на Печерську, 28 м²',
  E'Студія з панорамними вікнами у сучасному житловому комплексі бізнес-класу. Квартира здається без оздоблення (чистова підготовка), тож нові власники можуть зробити планування й ремонт під себе.\n\nУ будинку закрита територія, підземний паркінг, консьєрж і цілодобова охорона. Будинок здано в експлуатацію, можна оформити право власності.',
  'studiia-v-novobudovi-na-pechersku-b27d40', '00000000-0000-4000-8000-0000000000a1', null, now() - interval '9 days'),

('admin', null, 'published', 'sell', 'flat', 'isolated',
  2650000, 'UAH', 54, 31, 9, null,
  2, 7, 9, 'major', 'brick', 'econom', false,
  'Київ', 'Деснянський', 'вул. Милославська', '12', 50.5214, 30.6142,
  '2-кімнатна квартира на Лісовому масиві, вул. Милославська',
  E'Двокімнатна квартира в цегляному будинку біля метро «Лісова». Зроблено капітальний ремонт: нова електрика, труби, вікна з енергозберігаючими склопакетами, підлога з інженерної дошки.\n\nКухня 9 м² з вбудованою технікою. Планування практичне, обидві кімнати ізольовані. Тихий двір, поруч ринок, поліклініка та парк.',
  '2-kimnatna-kvartyra-lisovyi-masyv-c81e5a', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '14 days'),

('admin', null, 'published', 'sell', 'flat', 'penthouse',
  380000, 'USD', 135, 88, 22, null,
  4, 24, 25, 'evro', 'monolit_carcas', 'elit', true,
  'Київ', 'Голосіївський', 'вул. Антоновича', '102', 50.4189, 30.5217,
  'Пентхаус з терасою та двома рівнями в клубному будинку на Голосіїві — 4 кімнати, паркомісця в підземному паркінгу, панорамний вид на місто',
  E'Двоповерховий пентхаус у клубному житловому комплексі на Голосіївському. Верхній рівень займає простора вітальня-студія з кухнею, вихід на терасу 30 м² з видом на місто та Голосіївський ліс. На нижньому рівні розташовані три спальні, дві ванні кімнати і гардеробна.\n\nКвартира здається з якісним ремонтом: підлога з масивної дошки, мармур у санвузлах, системи «розумний дім» і підлогове опалення. Вікна від підлоги до стелі, висота стель 3,2 м. Кухня обладнана технікою Bosch та Miele, меблі виготовлені на замовлення.\n\nУ ціну входять два паркомісця в підземному паркінгу та комора. На території закритий двір без машин, дитячий майданчик, зона відпочинку, консьєрж і цілодобова охорона. Будинок підключений до двох незалежних ліній електропостачання, є власний генератор на випадок відключень.\n\nПоруч метро «Голосіївська», торговий центр, школа та декілька парків для прогулянок. Пентхаус підійде для великої родини, яка цінує простір, тишу і зручну інфраструктуру в межах міста. Покази проводимо за попередньою домовленістю, включно з вихідними.

Юридична частина: квартира у власності одного власника, без обтяжень і боргів за комунальними послугами. Угоду супроводжує наш юрист: перевірка документів, договір, розрахунок через банківську комірку або акредитив за вибором покупця. Можливий торг після особистого огляду. Ми також допоможемо підібрати надійних майстрів і дизайнера, якщо ви захочете змінити меблювання чи оздоблення терас.',
  'pentkhaus-z-terasoiu-holosiiv-7d02ef', '00000000-0000-4000-8000-0000000000a1', null, now() - interval '21 days'),

('admin', null, 'published', 'sell', 'flat', 'gostinka',
  890000, 'UAH', 18, 14, null, null,
  1, 3, 5, null, 'brick', null, false,
  'Київ', 'Святошинський', 'бульв. Академіка Вернадського', '14', 50.4639, 30.3552,
  'Гостинка біля метро «Академмістечко»',
  'Гостинка 18 м² на третьому поверсі цегляного будинку. Окремий санвузол з душовою кабіною, кухонна зона, кондиціонер. Підійде для першого житла або під оренду.',
  'hostynka-bilia-metro-akademmistechko-1be683', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '28 days'),

('admin', null, 'published', 'sell', 'flat', 'isolated',
  265000, 'EUR', 112, 70, 16, null,
  3, 4, 6, 'evro', 'brick', 'business', false,
  'Київ', 'Шевченківський', 'вул. Богдана Хмельницького', '52', 50.4448, 30.5086,
  '3-кімнатна квартира в історичному будинку на Богдана Хмельницького',
  E'Простора трикімнатна квартира у цегляному будинку початку XX століття, висота стель 3,4 м. Збережено автентичні елементи: ліпнину, паркет, високі вікна, які виходять у зелений двір.\n\nУ квартирі зроблено сучасний євроремонт, інженерні мережі замінено. Окрема велика кухня-їдальня, дві ванні кімнати, гардеробна. Поруч театри, ресторани та метро «Театральна».',
  '3-kimnatna-kvartyra-bohdana-khmelnytskoho-e4a9b6', '00000000-0000-4000-8000-0000000000a3', null, now() - interval '35 days'),

('plektan', '48213907', 'published', 'sell', 'flat', 'isolated',
  142000, 'USD', 61, 38, 10, null,
  2, 3, 5, 'evro', 'brick', 'business', false,
  'Київ', 'Подільський', 'вул. Сагайдачного', '25', 50.4651, 30.5189,
  '2-кімнатна квартира на Подолі, вул. Сагайдачного',
  E'Затишна двокімнатна квартира в самому серці Подолу, у ста метрах від метро «Контрактова площа». Цегляний будинок із закритим двором, нова проводка, ремонт 2023 року.\n\nПланування: вітальня, спальня, кухня 10 м², санвузол. Квартира підійде і для проживання, і для інвестицій у довгострокову оренду.',
  '2-kimnatna-kvartyra-na-podoli-52c7d8', null,
  '{"adid": 48213907, "state": "actual", "price": {"value": "142 000 $", "kind": "total", "currency_id": 1}, "deal": {"value": "sell"}, "date_mod": "2026-10-02 11:40"}'::jsonb,
  now() - interval '42 days'),

('plektan', '48377120', 'published', 'sell', 'flat', 'isolated',
  52000, 'USD', 41, 19, 8, null,
  1, 3, 9, 'cosmetic', 'panel', 'econom', false,
  'Київ', 'Дніпровський', 'вул. Березняківська', '19', 50.4412, 30.6076,
  '1-кімнатна квартира на Березняках',
  'Однокімнатна квартира біля метро «Березняки», 3 поверх 9-поверхового панельного будинку. Косметичний ремонт, пластикові вікна, засклений балкон. Поруч школа, торговий центр і набережна Дніпра.',
  '1-kimnatna-kvartyra-na-berezniakakh-9a5d02', null,
  '{"adid": 48377120, "state": "actual", "price": {"value": "52 000 $", "kind": "total", "currency_id": 1}, "deal": {"value": "sell"}, "date_mod": "2026-10-11 09:15"}'::jsonb,
  now() - interval '49 days'),

-- ===== Flats: long rent =====
('admin', null, 'published', 'rent_long', 'flat', 'isolated',
  22000, 'UAH', 42, 22, 9, null,
  1, 5, 9, 'evro', 'brick', null, false,
  'Київ', 'Шевченківський', 'вул. Саксаганського', '41', 50.4378, 30.5124,
  '1-кімнатна квартира в оренду на Саксаганського',
  E'Здається на довгий термін однокімнатна квартира з новим ремонтом та меблями. Є пральна машина, холодильник, посудомийна машина, кондиціонер, швидкісний інтернет.\n\nОплата: 22 000 грн на місяць плюс комунальні послуги. Застава в розмірі однієї місячної оплати. Можна з невеликою дитиною, домашні тварини обговорюються.',
  '1-kimnatna-kvartyra-v-orendu-saksahanskoho-0a6b93', '00000000-0000-4000-8000-0000000000a1', null, now() - interval '6 days'),

('admin', null, 'published', 'rent_long', 'flat', 'isolated',
  28000, 'UAH', 58, 34, 10, null,
  2, 12, 16, 'evro', 'monolit_carcas', 'business', true,
  'Київ', 'Дарницький', 'вул. Ревуцького', '5', 50.4052, 30.6637,
  '2-кімнатна квартира в оренду на Харківському масиві',
  'Нова двокімнатна квартира у будинку 2022 року, меблі та техніка повністю залишаються. Окрема спальня, вітальня-кухня, велика лоджія. Поруч метро «Харківська», торговий центр і парк.',
  '2-kimnatna-kvartyra-orenda-kharkivskyi-masyv-9c3e17', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '12 days'),

('admin', null, 'published', 'rent_long', 'flat', 'isolated',
  900, 'USD', 78, 48, 12, null,
  3, 8, 14, 'evro', 'brick', 'business', false,
  'Київ', 'Голосіївський', 'просп. Голосіївський', '62', 50.3975, 30.5311,
  '3-кімнатна квартира в оренду на Голосіївському проспекті',
  'Трикімнатна квартира з сучасним ремонтом, дві спальні та вітальня. Кухня з технікою, дві лоджії, окрема пральня. Здається родині на термін від року. Оплата 900 $ на місяць, комунальні окремо.',
  '3-kimnatna-kvartyra-orenda-holosiivskyi-prospekt-d15f28', '00000000-0000-4000-8000-0000000000a1', null, now() - interval '19 days'),

-- ===== Flats: daily rent =====
('admin', null, 'published', 'rent_day', 'flat', 'isolated',
  1800, 'UAH', 38, 20, 8, null,
  1, 4, 6, 'evro', 'brick', null, false,
  'Київ', 'Шевченківський', 'вул. Прорізна', '10', 50.4476, 30.5183,
  '1-кімнатна квартира подобово на Прорізній',
  'Чиста та затишна квартира в центрі міста, п''ять хвилин пішки до Золотих воріт та Хрещатика. Двоспальне ліжко, кухня з усім необхідним, Wi-Fi, кондиціонер. Видаємо звітні документи для відряджень. Заселення з 14:00, виселення до 12:00.',
  '1-kimnatna-kvartyra-podobovo-prorizna-6e84a0', '00000000-0000-4000-8000-0000000000a1', null, now() - interval '2 days'),

('admin', null, 'published', 'rent_day', 'flat', 'isolated',
  2400, 'UAH', 52, 30, 9, null,
  2, 2, 5, 'evro', 'brick', null, false,
  'Київ', 'Подільський', 'вул. Костянтинівська', '21', 50.4669, 30.5149,
  '2-кімнатна квартира подобово на Костянтинівській, Поділ',
  'Двокімнатна квартира для компанії або родини до 5 осіб: спальня з двоспальним ліжком, вітальня з розкладним диваном, кухня, пральна машина. Поруч кафе, набережна і Андріївський узвіз.',
  '2-kimnatna-kvartyra-podobovo-kostiantynivska-ab20d4', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '5 days'),

('admin', null, 'published', 'rent_day', 'flat', 'studio',
  1500, 'UAH', 30, 18, null, null,
  1, 10, 16, 'evro', 'monolit_carcas', null, true,
  'Київ', 'Солом''янський', 'просп. Повітрофлотський', '25', 50.4421, 30.4766,
  'Студія подобово біля Повітрофлотського проспекту',
  'Сучасна студія у новобудові. Зручно для приїжджих на кілька днів: поруч вокзал і метро «Вокзальна». Є кухонна зона, душова кабіна, швидкісний інтернет.',
  'studiia-podobovo-povitroflotskyi-prospekt-f3b7c5', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '1 day'),

-- ===== Houses =====
('admin', null, 'published', 'sell', 'house', 'single',
  215000, 'USD', 160, 95, 18, 8,
  5, null, 2, 'evro', 'brick', null, false,
  'Ірпінь', null, 'вул. Достоєвського', '14', 50.5183, 30.2498,
  'Будинок з ділянкою в Ірпені, 160 м²',
  E'Цегляний двоповерховий будинок 2018 року побудови на ділянці 8 соток. На першому поверсі вітальня з кухнею, санвузол і кабінет, на другому три спальні та дві ванні кімнати.\n\nІнженерні комунікації: газ, вода, каналізація, електрика 15 кВт. Автономне опалення, гараж на одне авто, закритий двір з альтернативним входом. До зупинки маршрутки 5 хвилин, до центру Ірпеня 10 хвилин на авто.',
  'budynok-z-diliankoiu-v-irpeni-1d4c8e', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '17 days'),

('admin', null, 'published', 'sell', 'house', 'single',
  420000, 'USD', 240, 150, 24, 12,
  6, null, 2, 'evro', 'brick', 'elit', false,
  'Козин', null, 'вул. Шкільна', '23', 50.2771, 30.6524,
  'Просторий будинок 240 м² у Козині з ландшафтним садом, камінною залою, гаражем на два авто та окремою гостьовою кімнатою',
  E'Продається чудовий будинок у Козині, в організованому селищі з охороною та асфальтованими вулицями. Загальна площа 240 м², ділянка 12 соток з ландшафтним дизайном: газон, хвойні дерева, тераса для відпочинку та мангальна зона.\n\nНа першому поверсі розташовані кухня-вітальня з каміном, їдальня, санвузол, гостьова кімната з окремим входом і гараж на два автомобілі. На другому поверсі три спальні, кожна з власною ванною кімнатою, та простора гардеробна. Вікна панорамні, вихід на балкон із виглядом на сад.\n\nБудинок утеплений, стіни з газоблока з фасадною цеглою, дах із металочерепиці. Опалення газове, підлогове на першому поверсі, є резервна дров''яна піч-камін. Свердловина і центральний водогін, септик, електрика 20 кВт, оптичний інтернет.\n\nДо Дніпра 10 хвилин на авто, поруч приватна школа, дитячий садок, кілька магазинів і ресторан. До Києва 25 хвилин без заторів. Документи в порядку, право власності зареєстроване, обтяжень немає. Можливий розгляд обміну на квартиру в Києві з доплатою.

Про район. Козин поступово перетворився на повноцінне селище з розвиненою інфраструктурою: тут є аптеки, кав''ярні, студія йоги, дитячі гуртки та спортивний комплекс. Узимку дороги прибирають вчасно, влітку на набережній гуляє пів селища. Сусіди переважно постійні мешканці, а не дачники, тому тут тихо і безпечно протягом усього року. Покупцю ми допоможемо з переоформленням договорів на комунальні послуги, а за потреби порекомендуємо перевірених будівельників для додаткових робіт на ділянці, наприклад, під літню кухню чи басейн.',
  'prostorii-budynok-u-kozyni-8a52b6', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '24 days'),

('admin', null, 'published', 'sell', 'house', 'town_house',
  330000, 'USD', 150, 95, 20, 3,
  4, null, 3, 'evro', 'brick', 'business', true,
  'Київ', 'Голосіївський', 'вул. Академіка Заболотного', '88', 50.3412, 30.4933,
  'Таунхаус у Феофанії, 150 м²',
  'Триповерховий таунхаус у закритому котеджному містечку. На першому поверсі кухня-вітальня і гараж, на другому дві спальні, на третьому майстер-спальня з терасою. Облаштована ділянка 3 сотки, охорона, власна дитяча зона.',
  'taunkhaus-u-feofanii-2f97d3', '00000000-0000-4000-8000-0000000000a1', null, now() - interval '31 days'),

('admin', null, 'published', 'sell', 'house', 'part',
  3600000, 'UAH', 90, 55, 12, 4,
  3, null, 1, 'cosmetic', 'brick', null, false,
  'Буча', null, 'вул. Яблунська', '77', 50.5448, 30.2182,
  'Частина будинку в Бучі, 90 м²',
  'Окрема половина будинку на дві сім''ї з власним входом і ділянкою 4 сотки. Три кімнати, кухня, санвузол, пічне й газове опалення. Тиха вулиця, 10 хвилин пішки до залізничної станції.',
  'chastyna-budynku-v-buchi-c6e01a', null, null, now() - interval '38 days'),

('admin', null, 'published', 'rent_long', 'house', 'single',
  45000, 'UAH', 120, 80, 14, 6,
  4, null, 2, 'evro', 'gas_block', null, false,
  'Вишневе', null, 'вул. Святоюріївська', '34', 50.3921, 30.3705,
  'Будинок в оренду у Вишневому',
  'Будинок після ремонту з меблями: чотири кімнати, кухня-вітальня, дві ванні. Опалення газове, є гараж і мангальна зона. Здається на термін від півроку. 45 000 грн на місяць, комунальні окремо.',
  'budynok-v-orendu-u-vyshnevomu-74b3f9', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '11 days'),

('admin', null, 'published', 'sell', 'house', 'unfinished',
  2800000, 'UAH', 180, null, null, 7,
  null, null, 2, 'without_repair', 'gas_block', null, false,
  'Вишневе', null, 'вул. Тополева', '9', 50.3874, 30.3822,
  'Будинок у стані «під оздоблення» у Вишневому: коробка з дахом, вікнами та всіма комунікаціями на ділянці 7 соток',
  'Двоповерховий будинок з газоблока: дах, вікна, вхідні двері і розведені комунікації вже є, внутрішнього оздоблення немає. Можна зробити планування під себе. Ділянка 7 соток, правильної форми, огороджена.',
  'budynok-pid-ozdoblennia-vyshneve-e90d62', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '46 days'),

-- ===== Commercial =====
('plektan', '47905514', 'published', 'sell', 'commercial', 'office_center',
  260000, 'USD', 112, null, null, null,
  null, 2, 7, 'evro', null, 'business', false,
  'Київ', 'Печерський', 'вул. Шовковична', '42-44', 50.4358, 30.5276,
  'Офіс 112 м² у діловому центрі на Шовковичній: окремий вхід, відремонтовані приміщення, два паркомісця, поруч метро «Кловська»',
  E'Офіс на другому поверсі бізнес-центру класу B+. Відкрите планування на 12 робочих місць, два окремі кабінети, переговорна кімната і кухня для персоналу. Приміщення відремонтоване, кондиціонування та вентиляція працюють, кабельні мережі підведені.\n\nУ ціну входять два паркомісця на закритій території. Будівля має охорону і пропускну систему, окремий вхід з вулиці. Орендарі в будівлі: юридичні та IT-компанії.',
  'ofis-na-shovkovychnii-b4a8d7', '00000000-0000-4000-8000-0000000000a1',
  '{"adid": 47905514, "state": "actual", "price": {"value": "260 000 $", "kind": "total", "currency_id": 1}, "prop_kind": {"value": "office_center"}, "date_mod": "2026-09-29 15:05"}'::jsonb,
  now() - interval '26 days'),

('admin', null, 'published', 'rent_long', 'commercial', 'shop',
  2200, 'USD', 64, null, null, null,
  null, 1, 9, 'cosmetic', null, null, false,
  'Київ', 'Подільський', 'вул. Ярославська', '11', 50.4663, 30.5106,
  'Торгове приміщення на Ярославській, Поділ',
  'Перший поверх житлового будинку з вітринними вікнами на жваву пішохідну вулицю. 64 м², санвузол, окремий вхід, електрика 15 кВт. Підійде під магазин, кав''ярню чи студію краси. Оренда 2 200 $ на місяць.',
  'torhove-prymishchennia-yaroslavskii-5a1f63', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '15 days'),

('admin', null, 'published', 'sell', 'commercial', 'storehouse',
  null, null, 600, null, null, null,
  null, 1, 1, 'without_repair', 'brick', null, false,
  'Київ', 'Дарницький', 'вул. Колекторна', '9', 50.4021, 30.6903,
  'Складський комплекс на Колекторній, 600 м²',
  'Утеплений склад з височиною стель 6 м, рампою для вантажівок і офісом 40 м². Асфальтована територія, огорожа, відео-спостереження. Ціна договірна: залишіть заявку, і менеджер надішле умови.',
  'skladskyi-kompleks-kolektornii-0e7c42', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '33 days'),

('admin', null, 'published', 'sell', 'commercial', 'restaurant',
  330000, 'EUR', 140, null, null, null,
  null, 1, 4, 'major', null, null, false,
  'Київ', 'Шевченківський', 'вул. Ярославів Вал', '15', 50.4513, 30.5111,
  'Ресторан на Ярославовому Валу, 140 м²',
  'Діючий ресторан в історичному будинку у центрі. Зал на 60 посадочних місць, повністю обладнана кухня, літня тераса, окремий вхід. Продається приміщення разом з обладнанням.',
  'restoran-yaroslavovomu-valu-d83b19', '00000000-0000-4000-8000-0000000000a1', null, now() - interval '40 days'),

('admin', null, 'hidden', 'rent_long', 'commercial', 'office_free',
  60000, 'UAH', 85, null, null, null,
  null, 3, 12, 'evro', null, 'business', false,
  'Київ', 'Оболонський', 'просп. Степана Бандери', '16', 50.5037, 30.4915,
  'Офіс на Оболоні у бізнес-центрі, 85 м²',
  'Офіс у бізнес-центрі, відкрите планування, два кабінети, панорамні вікна. Приміщення віддано в оренду, оголошення приховане.',
  'ofis-na-oboloni-biznes-tsentr-2c49e5', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '52 days'),

-- ===== Plots (area_lot in sotky) =====
('plektan', '47110826', 'published', 'sell', 'plot', 'private_house_building',
  85000, 'USD', null, null, null, 10,
  null, null, null, null, null, null, false,
  'Ірпінь', null, 'вул. Мінеральна', '28', 50.5214, 30.2403,
  'Ділянка 10 соток в Ірпені під забудову',
  'Рівна ділянка правильної форми 10 соток під індивідуальне житлове будівництво. Цільове призначення: для будівництва і обслуговування житлового будинку. Поруч проходять газ, світло і вода, під''їзд асфальтований.',
  'dilianka-10-sotok-v-irpeni-f12a77', '00000000-0000-4000-8000-0000000000a2',
  '{"adid": 47110826, "state": "actual", "price": {"value": "85 000 $", "kind": "total", "value_are": "8 500 $", "currency_id": 1}, "area_lot": "10"}'::jsonb,
  now() - interval '8 days'),

('admin', null, 'published', 'sell', 'plot', 'private_house_building',
  140000, 'USD', null, null, null, 15,
  null, null, null, null, null, null, false,
  'Козин', null, 'вул. Лісова', '4', 50.2819, 30.6477,
  'Ділянка 15 соток у Козині',
  E'Ділянка 15 соток у закритому котеджному селищі, до Дніпра 700 метрів. Комунікації підведені до межі: газ, електрика, центральний водогін. Є проєкт забудови, який передається покупцю безкоштовно.\n\nСусідні ділянки вже забудовані, тож інфраструктура працює: охорона, освітлення, асфальт.',
  'dilianka-15-sotok-u-kozyni-83d6b0', '00000000-0000-4000-8000-0000000000a1', null, now() - interval '23 days'),

('admin', null, 'published', 'sell', 'plot', 'agricultural_purposes',
  4800000, 'UAH', null, null, null, 120,
  null, null, null, null, null, null, false,
  'Буча', null, 'вул. Польова', null, 50.5601, 30.2054,
  'Земельна ділянка 120 соток біля Бучі',
  'Земля сільськогосподарського призначення, 1,2 га, одним масивом. Рівний рельєф, під''їзд ґрунтовою дорогою. Підійде для господарства або як інвестиція в землю.',
  'zemelna-dilianka-120-sotok-bucha-4be958', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '44 days'),

('admin', null, 'hidden', 'sell', 'plot', 'construction_non_residential',
  310000, 'USD', null, null, null, 25,
  null, null, null, null, null, null, false,
  'Київ', 'Святошинський', 'вул. Жмеринська', null, 50.4527, 30.3318,
  'Ділянка 25 соток для комерційної забудови, Святошинський район',
  'Ділянка під комерційну забудову поруч з транспортною розв''язкою. Оголошення приховане: власник вирішує питання з документами.',
  'dilianka-25-sotok-dlia-komertsiinoi-zabudovy-6a03c1', '00000000-0000-4000-8000-0000000000a2', null, now() - interval '57 days'),

('admin', null, 'published', 'sell', 'plot', 'dacha',
  650000, 'UAH', null, null, null, 6,
  null, null, null, null, null, null, false,
  'Вишневе', null, 'вул. Садова', '17', null, null,
  'Дачна ділянка 6 соток у Вишневому',
  'Дачна ділянка 6 соток з невеликим садовим будиночком. Є світло, колодязь, фруктові дерева. Тихий дачний кооператив, до траси 5 хвилин.',
  'dachna-dilianka-6-sotok-vyshneve-a97e24', '00000000-0000-4000-8000-0000000000a3', null, now() - interval '30 days'),

-- Draft (spec 008): hidden and never published, so it is visible only in the admin.
('admin', null, 'hidden', 'sell', 'flat', 'isolated',
  null, null, 48, null, null, null,
  2, null, null, null, null, null, false,
  'Київ', null, null, null, null, null,
  '2-кімнатна квартира, Київ',
  null,
  '2-kimnatna-kvartyra-kyiv-d7a001', null, null, null);

-- Derived prices: USD-normalized amount (rates from settings) and price per m2 in the listing currency.
update public.properties p
set price_usd = case p.currency
  when 'USD' then p.price_amount
  else round(p.price_amount / (s.exchange_rates ->> p.currency::text)::numeric)
end
from public.settings s
where p.price_amount is not null;

update public.properties
set price_per_m2 = round(price_amount / area_total)
where price_amount is not null and area_total > 0;

-- A few listings with custom SEO fields (others fall back to the title).
update public.properties set
  seo_title = '2-кімнатна квартира на Оболоні — Lyndrik',
  seo_description = 'Продаж 2-кімнатної квартири 62 м² на Оболоні: роздільні кімнати, засклений балкон, поруч метро.'
where slug = '2-kimnatna-kvartyra-na-oboloni-3f9a1c';

update public.properties set
  seo_title = 'Пентхаус на Голосіїві з терасою — Lyndrik',
  seo_description = 'Двоповерховий пентхаус 135 м² у клубному будинку на Голосіївському: тераса 30 м², два паркомісця.'
where slug = 'pentkhaus-z-terasoiu-holosiiv-7d02ef';

update public.properties set
  seo_title = 'Будинок у Козині 240 м² — Lyndrik',
  seo_description = 'Продаж будинку 240 м² з ділянкою 12 соток у Козині: камін, гараж на два авто, гостьова кімната.'
where slug = 'prostorii-budynok-u-kozyni-8a52b6';

-- property_photos -------------------------------------------------------------------------------
-- Files and real sizes (w x h) of public/placeholders/*.webp. Listings not mentioned here have no photos.
with seed_files (file, width, height) as (values
  ('flat-living-1', 1280, 1129), ('flat-living-2', 1280, 853), ('flat-living-3', 1280, 854),
  ('flat-kitchen-1', 1280, 767), ('flat-bedroom-1', 1000, 667), ('flat-bathroom-1', 1280, 853),
  ('house-exterior-1', 1280, 849), ('house-exterior-2', 1100, 733), ('office-interior-1', 1280, 854),
  ('building-facade-1', 1100, 733), ('plot-landscape-1', 1280, 720)
),

seed_photo_sets (slug, files) as (values
  ('2-kimnatna-kvartyra-na-oboloni-3f9a1c', array['flat-living-2', 'flat-kitchen-1', 'flat-bedroom-1', 'flat-bathroom-1']),
  ('studiia-v-novobudovi-na-pechersku-b27d40', array['flat-living-3', 'flat-bathroom-1']),
  ('2-kimnatna-kvartyra-lisovyi-masyv-c81e5a', array['flat-living-1', 'flat-kitchen-1', 'flat-bedroom-1']),
  ('pentkhaus-z-terasoiu-holosiiv-7d02ef', array['flat-living-2', 'flat-living-1', 'flat-kitchen-1', 'flat-bedroom-1', 'flat-bathroom-1']),
  ('3-kimnatna-kvartyra-bohdana-khmelnytskoho-e4a9b6', array['flat-living-2', 'flat-kitchen-1', 'flat-bedroom-1']),
  ('2-kimnatna-kvartyra-na-podoli-52c7d8', array['flat-living-3', 'flat-kitchen-1', 'flat-bedroom-1', 'flat-bathroom-1']),
  ('1-kimnatna-kvartyra-na-berezniakakh-9a5d02', array['flat-living-1']),
  ('1-kimnatna-kvartyra-v-orendu-saksahanskoho-0a6b93', array['flat-living-3', 'flat-kitchen-1', 'flat-bathroom-1']),
  ('3-kimnatna-kvartyra-orenda-holosiivskyi-prospekt-d15f28', array['flat-living-2', 'flat-bedroom-1', 'flat-kitchen-1']),
  ('1-kimnatna-kvartyra-podobovo-prorizna-6e84a0', array['flat-living-3', 'flat-bedroom-1']),
  ('2-kimnatna-kvartyra-podobovo-kostiantynivska-ab20d4', array['flat-living-1', 'flat-kitchen-1', 'flat-bedroom-1', 'flat-bathroom-1']),
  ('budynok-z-diliankoiu-v-irpeni-1d4c8e', array['house-exterior-2', 'flat-living-2', 'flat-kitchen-1']),
  ('prostorii-budynok-u-kozyni-8a52b6', array['house-exterior-1', 'house-exterior-2', 'flat-living-2', 'flat-kitchen-1', 'flat-bedroom-1']),
  ('taunkhaus-u-feofanii-2f97d3', array['house-exterior-2', 'flat-living-1']),
  ('chastyna-budynku-v-buchi-c6e01a', array['house-exterior-1']),
  ('budynok-v-orendu-u-vyshnevomu-74b3f9', array['house-exterior-2', 'flat-living-3', 'flat-bedroom-1']),
  ('ofis-na-shovkovychnii-b4a8d7', array['office-interior-1', 'building-facade-1']),
  ('torhove-prymishchennia-yaroslavskii-5a1f63', array['office-interior-1']),
  ('restoran-yaroslavovomu-valu-d83b19', array['office-interior-1', 'building-facade-1', 'flat-kitchen-1']),
  ('ofis-na-oboloni-biznes-tsentr-2c49e5', array['office-interior-1', 'building-facade-1']),
  ('dilianka-10-sotok-v-irpeni-f12a77', array['plot-landscape-1']),
  ('dilianka-15-sotok-u-kozyni-83d6b0', array['plot-landscape-1']),
  ('zemelna-dilianka-120-sotok-bucha-4be958', array['plot-landscape-1'])
)
insert into public.property_photos (property_id, position, r2_key, width, height, sizes, source_url)
select p.id, f.ord - 1, 'placeholders/' || f.file || '.webp', sf.width, sf.height, null, null
from seed_photo_sets s
join public.properties p on p.slug = s.slug
cross join lateral unnest(s.files) with ordinality as f(file, ord)
join seed_files sf on sf.file = f.file;

-- pages -----------------------------------------------------------------------------------------
insert into public.pages (slug, title, body, seo_title, seo_description) values
  ('home', 'Нерухомість у Києві та передмісті',
   E'## Допоможемо купити, продати чи зняти нерухомість\n\nLyndrik — агентство нерухомості в Києві. Працюємо з квартирами, будинками, комерційними приміщеннями та земельними ділянками.\n\nМи супроводжуємо угоду від першого перегляду до підписання договору: перевіряємо документи, домовляємося з власниками, допомагаємо з оформленням.\n\nОберіть об''єкт у каталозі або залиште заявку, і менеджер підбере варіанти під ваш бюджет.',
   'Lyndrik — нерухомість у Києві: купівля, продаж, оренда',
   'Агентство нерухомості Lyndrik: квартири, будинки, комерційні приміщення та ділянки в Києві та області. Підбір, перегляди й супровід угоди.'),
  ('about', 'Про агентство',
   E'## Про Lyndrik\n\nМи невелика команда ріелторів, яка працює з нерухомістю Києва та найближчих міст: Ірпеня, Бучі, Вишневого, Козина.\n\n### Як ми працюємо\n\n- Показуємо тільки перевірені об''єкти з актуальною ціною.\n- Пояснюємо кожен крок угоди простою мовою.\n- Домовляємося про комісію наперед, без прихованих доплат.\n\n### Наша команда\n\nКонтакти ріелторів ви знайдете на сторінці «Контакти». Напишіть або зателефонуйте, і ми підберемо варіанти під ваші потреби.',
   'Про агентство Lyndrik',
   'Команда ріелторів Lyndrik працює з нерухомістю в Києві та області. Як ми працюємо і чому нам довіряють клієнти.'),
  ('contacts', 'Контакти',
   E'## Зв''яжіться з нами\n\nПідберемо квартиру, будинок, комерційне приміщення чи ділянку під ваш бюджет. Покази організуємо в зручний для вас час, зокрема у вихідні.\n\nЗателефонуйте або напишіть у месенджер — менеджер відповість протягом робочого дня.',
   'Контакти Lyndrik',
   'Телефон, email і адреса офісу агентства нерухомості Lyndrik у Києві. Графік роботи, месенджери та контакти ріелторів.'),
  ('privacy', 'Політика конфіденційності',
   E'## 1. Хто обробляє ваші дані\n\nВолоділець персональних даних — агентство нерухомості Lyndrik (далі — «Агентство»).\n\n- Телефон: +380 67 000 00 01\n- Email: office@lyndrik.example\n- Адреса: м. Київ, вул. Хрещатик, 10\n\n## 2. Які дані ми збираємо\n\n- ім''я;\n- номер телефону;\n- адреса електронної пошти;\n- текст вашого повідомлення чи запиту;\n- сторінка сайту, з якої ви надіслали запит, та UTM-мітки рекламних переходів;\n- технічні дані, потрібні для роботи сайту: тип пристрою й браузера, IP-адреса, файли cookie (наприклад, вибір світлої чи темної теми).\n\n## 3. Навіщо ми обробляємо дані\n\n- щоб відповісти на ваш запит і зв''язатися з вами;\n- щоб підібрати нерухомість під ваші потреби;\n- щоб передати запит у CRM-систему Агентства та відповідальному менеджеру;\n- щоб забезпечувати стабільну роботу й безпеку сайту.\n\n## 4. Правова підстава\n\nМи обробляємо персональні дані на підставі вашої згоди, яку ви надаєте, надсилаючи форму на сайті, відповідно до Закону України «Про захист персональних даних». Технічні дані, потрібні для роботи сайту, обробляються на підставі нашого законного інтересу забезпечувати його працездатність.\n\n## 5. Скільки ми зберігаємо дані\n\nДані із заявок зберігаються доти, доки це потрібно для досягнення мети обробки, але не довше трьох років після останнього контакту з вами, якщо інший строк не вимагає закон. Після цього дані видаляються або знеособлюються.\n\n## 6. Кому ми передаємо дані\n\nМи не продаємо персональні дані. Дані можуть опрацьовувати лише ті сторонні сервіси, які потрібні для роботи сайту й Агентства, і тільки в необхідному обсязі:\n\n- хостинг і база даних, у яких працює сайт;\n- CRM-система Агентства, куди потрапляють заявки;\n- сервіси сповіщень, через які менеджер отримує повідомлення про заявку.\n\nТакож ми можемо передати дані, якщо цього вимагає закон.\n\n## 7. Ваші права\n\nВи маєте право:\n\n- дізнатися, які ваші дані ми обробляємо, і отримати доступ до них;\n- вимагати виправити неточні дані;\n- вимагати видалити ваші дані;\n- відкликати згоду на обробку;\n- звернутися зі скаргою до Уповноваженого Верховної Ради України з прав людини.\n\n## 8. Як скористатися правами\n\nНапишіть нам на office@lyndrik.example із темою «Персональні дані» та вкажіть ім''я й телефон, які ви залишали на сайті. Ми відповімо протягом 30 днів.\n\n## 9. Зміни до політики\n\nМи можемо оновлювати цю політику. Актуальна версія завжди доступна на цій сторінці. Продовжуючи користуватися сайтом після змін, ви погоджуєтеся з оновленою версією.',
   'Політика конфіденційності — Lyndrik',
   'Як агентство нерухомості Lyndrik обробляє та захищає персональні дані відвідувачів сайту.');

-- ===== LOCAL ONLY: demo admin users (spec 007). Never run this against production. ==============
-- admin@lyndrik.local / admin12345 is an admin; user@lyndrik.local / user12345 is signed up but NOT an admin.
-- All token columns are '' (not null) or GoTrue fails to sign in.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated',
    'admin@lyndrik.local', crypt('admin12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated',
    'user@lyndrik.local', crypt('user12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '');

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b1',
    '{"sub":"00000000-0000-4000-8000-0000000000b1","email":"admin@lyndrik.local","email_verified":true}', 'email', now(), now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2',
    '{"sub":"00000000-0000-4000-8000-0000000000b2","email":"user@lyndrik.local","email_verified":true}', 'email', now(), now(), now());

insert into public.admins (user_id, email) values
  ('00000000-0000-4000-8000-0000000000b1', 'admin@lyndrik.local');

-- ===== LOCAL ONLY: demo leads (30, ~40 days, mixed kinds and delivery statuses) ================
-- Fictional people; phones are +380 67 000 00 xx style fakes. Row 0 has a very long name and message.
insert into public.leads (
  kind, property_id, name, phone, email, message, consent_at, client_request_id, page_url,
  plektan_status, plektan_error, plektan_attempts, telegram_status, telegram_error, telegram_attempts, created_at
)
select
  case when i % 3 = 0 then 'general' when i % 7 = 6 then 'ai' else 'property_request' end::public.lead_kind,
  case when i % 3 = 0 or i % 7 = 6 then null
       else (select id from public.properties order by slug limit 1 offset (i % 5)) end,
  case when i = 0 then 'Олександр-Михайло Святославович Верховинський-Підгірянський з родиною та представниками компанії'
       else (array['Олена Шевченко','Андрій Бондаренко','Марія Ткаченко','Іван Коваль','Наталія Лисенко',
                   'Петро Мороз','Юлія Кравченко','Дмитро Поліщук','Ірина Гриценко','Сергій Олійник'])[i % 10 + 1] end,
  '+38067000' || lpad((10 + i)::text, 4, '0'),
  case when i % 2 = 0 then 'client' || i || '@example.com' else null end,
  case when i = 0 then repeat('Шукаємо просторий будинок поблизу Києва з ділянкою, гаражем і можливістю оформити іпотеку. ', 12)
       when i % 4 = 0 then null
       else (array['Доброго дня! Хочу оглянути цей об''єкт цього тижня.','Підкажіть, чи можливий торг?',
                   'Цікавить ця квартира, зателефонуйте після 18:00.','Потрібна консультація щодо покупки.'])[i % 4 + 1] end,
  now() - (i * interval '32 hours') - interval '5 minutes',
  gen_random_uuid(),
  '/catalog',
  (array['sent','failed','skipped','pending','failed','sent'])[i % 6 + 1]::public.delivery_status,
  (array[null,'timeout',null,null,'http 500',null])[i % 6 + 1],
  (array[1,5,0,0,3,1])[i % 6 + 1],
  (array['sent','sent','skipped','pending','failed','failed'])[i % 6 + 1]::public.delivery_status,
  (array[null,null,null,null,'http 502','timeout'])[i % 6 + 1],
  (array[1,1,0,0,2,4])[i % 6 + 1],
  now() - (i * interval '32 hours')
from generate_series(0, 29) as i;
