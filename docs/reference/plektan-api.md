# Plektan API — довідник для розробки

Джерело: https://plektan.crunch.help/uk/plektan-api/dokumientatsiia-api-sistiemi-plektan (перевірено 2026-10-27).
Це конспект: коли сумніваєшся, звіряйся з оригіналом. Код партнерської кнопки та повні приклади — тільки в оригіналі.

## Загальне
- Запити: `POST http(s)://re.plektan.com/{lang}/{section}/{command}`, де `lang` = `uk` або `ru`. Відповіді в JSON.
- Авторизація: заголовок `x-auth-token: <API key>` (ключ видає Plektan). Параметр `version=1.1` передається в кожному запиті.
- Старий метод (`company`, `access_key`, `access_password`) лишився лише для наявних інтеграцій.
- Ліміти частоти запитів у документації не вказані.

## Команди
| Команда | Для чого | Ключові параметри |
|---|---|---|
| `API_serp/search` (за параметрами) | Список об'єктів | `currentPage`; `rowsPerPage` (≤20, за замовч. 15); `sorter[field]` (`price` або `area`); `sorter[direction]`; `sorter[prevent_media]`; `deal`* (`sell`, `rent_long`, `rent_day`); `property`*; `prop_kind[]`*; `price[value_from/value_to/currency_id/kind]`; `area_total[...]`; `area_lot[...]`; `storey[...]`; `storey_dop`; `room_count[]` (`1`–`4`, `more`); `housing_class[]`; `repair[]`; `wall_material[]`; `is_newbuilding`; `red_line`; `country_id`*; `region_id`*; `locality_id`*; `geo_search_by`* (`city` або `region`); `districts_id[]`; `subway_station[]`; `regions_id[]`; `localities_id[]`; `without_fee`; `after_date` (`'YYYY-MM-DD HH:MM'`); `site_id` (обмежує вибірку оголошеннями одного співробітника) |
| `API_serp/search` (за номером) | Пошук за номером | `deal=by_number`; `regnumber` (рядок або масив); `price[currency_id]`; `show_all` (deprecated) |
| `API_view/view` | Картка об'єкта | `adid`*; `currency_id`* (якщо масив — приходить `prices_list`); `site_id` |
| `API_view/addAdvert` | Лід у базу неперевірених з позначкою «З сайту компанії» | Спільні: `property`*, `prop_kind`*, `client_name`*, `client_email`, `phones[1]`*, `phones[2]`, `advert_info`, `pay_willingness`, `site_id` |
| ↳ продам / здам | | `deal` (`sell`, `rent_long`, `rent_day`); `price[value/currency_id/kind]`; `room_count`; `area_total`; `area_lot`; `repair`; `storey`; `storeys`; `red_line`; `geo_type`; `district_id`; `street_id`; `locality_id`; `region_id`; `media` |
| ↳ куплю / зніму | | `deal` (`buy`, `hire_long`, `hire_day`); діапазони `price`, `area_total`, `storey`, `storeys`; `room_count[]`; `repair[]`; `geo_type`; `districts_id[]` / `regions_id[]` / `localities_id[]`; `autosends[by_email]`, `autosends[by_viber]` — автоматична розсилка схожих пропозицій клієнту |
| ↳ швидка заявка | «Цікавить об'єкт №…» | `like_advert`*, `client_name`*, `client_email`*, `phones[1]`*, `autosends[...]` |
| `API_view/uploadAdvertPhoto` | Фото перед `addAdvert` | `photoUpload[i]` (завжди масив) → `media_id`, `src` |
| `API_geo/findCity`, `findStreet` | Автодоповнення | `locality_id`, `region_id`, `searchStr`; до 16 результатів |
| `API_geo/getDistricts`, `getSubway`, `getSuburb`, `getRegion` | Довідники географії | Формат `value`/`caption`, дерево у 2 рівні. Кешувати |
| `API_user/getContactPersons` | Співробітники з позначкою «на сайті» | — → `user_id`, `name`, `greeting`, `phones[]`, `email`, `url_small`, `site_id` |
| `API_user/getMasters` | «Майстри якості» | Формат той самий |
| `API_user/getPublicInfo` | Профіль ріелтора | `user_id` або `site_id` → `name`, `greeting`, `phones`, `email`, `media`, `about_self` |
| `API_user/sendMessage` | Лист співробітнику | `user_id`, `title`, `message`, `email`, `sendToEmail=1`. Потрібна активація з боку Plektan і SMTP агентства |

## Відповіді
- `search` → `{ data: [...], totalRows }`. Якщо ввімкнено статистику, додатково приходить `stat` (min/max ціни й площі), а фільтри за ціною та площею тоді ігноруються.
- `addAdvert` → `{ result: ADDED | PARSE_ERROR | ..., item_id, message }`.

## Поля оголошення у списку (головні)
`adid`, `date_add`, `date_mod`, `deferred_to`, `deal`/`deal.value`, `property`/`.value`, `prop_kind`/`.value`, `media{src_small, src_middle, src_small_2, ...}`, `state` (`actual`, `non_actual`, `deferred`, `closed`), `is_mls` (партнерський), `price{value, value_obj, value_m2, value_are, kind, currency_id}` — **текстом**, `base_price`, `discount`, `housing_class`, `is_newbuilding`, `storey`, `storeys`, `area_total`, `area_life`, `area_kitchen`, `area_lot`, `room_count`, `repair`, `wall_material`, `gas`, `water`, `heating`, `canalization`, `locality`, `district`, `street`, `subway_station`, `buyer_not_pay`

## Картка (`view`) — додатково
`advert_id`, `media[{src, title}]`, `an_fee`, `promo_text`, `housestr`, `orient`, `year_built`, `developer`, `ceiling_height`, `bedroom_count`, `bathroom_count`, `balcony_count`, `room_explication` (HTML); стан оздоблення (`floors`, `walls`, `windows`... у форматі `{rating, values}`); комунікації; інфраструктура (`transport`, `education`, `parking`...); `users[{user_id, name, phones, email, url_small, site, status}]`; `similar_adverts` (якщо ввімкнено)

## Довідники
- `property`: `flat`, `house`, `commercial`, `plot`
- `prop_kind` для `flat`: `isolated`, `apartments`, `penthouse`, `studio`, `gostinka`, `another_sleeping`, `unfinished_new_build`
- `prop_kind` для `house`: `single`, `part`, `town_house`, `palace`, `holiday_home`, `unfinished`
- `prop_kind` для `plot`: `dilapidated_house`, `dacha`, `construction_residential`, `construction_non_residential`, `private_house_building`, `agricultural_purposes`, `island`
- `prop_kind` для `commercial` (лише кінцеві значення): `office_in_house`, `office_center`, `office_free`, `office_premise`, `pavilion`, `pharmacy`, `shop`, `supermarket`, `mart`, `trade_premise`, `restaurant`, `cafe`, `bar`, `pizzeria`, `restaurant-fastfood`, `catering_object`, `dry_cleaners`, `beauty_parlor`, `hairdressing_saloon`, `dental_office`, `clinic`, `car_service`, `fitness_center`, `service_object`, `club`, `theatre`, `cinema`, `bowling`, `night_club`, `culture_object`, `storehouse`, `production_area`, `industrial_complex`, `garage`, `hotel`, `hostel`, `agricultural object`, `other_infrastructure`, `unfinished_object`
- `repair`: `without_repair`, `no_internal_works`, `without_finishing`, `cosmetic`, `partial`, `major`, `evro`, `architectural_design`
- `housing_class`: `econom`, `business`, `elit`
- `wall_material`: `panel`, `brick`, `gas_block`, `cinder_block`, `monolit_carcas`, `foam_concrete`, `keramzit_concrete`, `poroterm`, `rakushnik_brick`, `wood_brick`, `wood`
- `pay_willingness`: `willing_to_pay`, `not_know_willing_to_pay`, `not_willing_to_pay`

## Нюанси для синку
- `search` не віддає неактуальні оголошення (застарілі, відкладені, в угоді, закриті). Тому синк ховає на сайті ті, що зникли зі списку.
- Координат немає, лише місто, район, вулиця та `housestr`. Їх треба геокодувати.
- Ціни приходять текстом з HTML-ентіті (`&asymp;`), їх треба парсити.
- Фото лежать на домені Plektan, тому копіюємо їх у R2.
- `is_mls` = true — партнерський об'єкт, на сайті фільтруємо.
- Партнерська кнопка «Ми працюємо з Plektan» обов'язкова на кожній сторінці (футер).
