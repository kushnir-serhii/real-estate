# UML diagrams

Class and sequence diagrams of Sofiacity, in [Mermaid](https://mermaid.js.org/) (rendered by GitHub and the VS Code Markdown preview). They describe the code as of spec 008. Product context: [product.md](product.md).

## Class diagram

### 1. Domain model (Supabase tables)

```mermaid
classDiagram
    direction LR

    class Agent {
        +uuid id
        +property_source source
        +text external_id
        +text name
        +text[] phones
        +bool is_active
        +timestamptz updated_at
    }

    class Property {
        +uuid id
        +property_source source
        +text external_id
        +property_status status
        +deal deal
        +property_type property_type
        +bigint price_amount
        +currency currency
        +bigint price_usd
        +numeric area_total
        +int room_count
        +text district
        +text street
        +double lat
        +double lng
        +text title
        +text slug
        +text seo_title
        +text seo_description
        +timestamptz source_updated_at
        +timestamptz published_at
        +timestamptz hidden_at
    }

    class PropertyPhoto {
        +uuid id
        +int position
        +text r2_key
        +jsonb sizes
        +int width
        +int height
        +text source_url
    }

    class Lead {
        +uuid id
        +lead_kind kind
        +text name
        +text phone
        +text email
        +text message
        +jsonb payload
        +jsonb utm
        +text page_url
        +timestamptz consent_at
        +uuid client_request_id
        +delivery_status plektan_status
        +int plektan_attempts
        +text plektan_item_id
        +delivery_status telegram_status
        +int telegram_attempts
    }

    class Page {
        +text slug
        +text title
        +text body
        +text seo_title
        +text seo_description
    }

    class Settings {
        +property_source properties_source
        +jsonb exchange_rates
        +timestamptz sync_cursor
    }

    class Admin {
        +uuid user_id
        +text email
    }

    class PropertySource {
        <<enumeration>>
        plektan
        admin
    }
    class PropertyStatus {
        <<enumeration>>
        published
        hidden
    }
    class Deal {
        <<enumeration>>
        sell
        rent_long
        rent_day
    }
    class PropertyType {
        <<enumeration>>
        flat
        house
        commercial
        plot
    }
    class LeadKind {
        <<enumeration>>
        property_request
        general
        ai
    }
    class DeliveryStatus {
        <<enumeration>>
        pending
        sent
        failed
        skipped
    }

    Agent "0..1" <-- "0..*" Property : agent_id (set null)
    Property "1" *-- "0..*" PropertyPhoto : cascade delete
    Property "0..1" <-- "0..*" Lead : property_id (set null)
    Property ..> PropertySource
    Property ..> PropertyStatus
    Property ..> Deal
    Property ..> PropertyType
    Lead ..> LeadKind
    Lead ..> DeliveryStatus
    Settings ..> PropertySource : decides who owns properties
    Admin ..> AuthUser : user_id

    class AuthUser {
        <<Supabase Auth>>
        +uuid id
    }
```

### 2. Application layers (`src/`)

```mermaid
classDiagram
    direction TB

    namespace app {
        class SitePages {
            <<Next.js routes>>
            / /catalog /catalog/slug /favorites
        }
        class AdminPages {
            <<Next.js routes>>
            /admin/leads /admin/properties /admin/settings
        }
        class CronRoutes {
            <<route handlers>>
            POST /api/cron/leads
            POST /api/cron/revalidate
        }
        class PhotosRoute {
            <<route handler>>
            POST /api/admin/photos
        }
    }

    namespace features {
        class LeadActions {
            <<server action>>
            +submitLead(prev, formData) LeadFormState
        }
        class SubmitLead {
            +processLeadSubmission(raw, ctx) LeadFormState
        }
        class DeliverLead {
            +deliverLead(id) DeliveryResult
            +retryLeadChannel(id, channel)
            +deliverLeadWith(deps, id)
        }
        class RetryLeads {
            +retryLeads()
        }
        class AdminPropertyActions {
            <<server actions>>
            +saveProperty()
            +reorderPhotos()
            +deletePhoto()
        }
        class AdminSettingsActions {
            <<server actions>>
            +switchSource()
            +saveRates()
        }
    }

    namespace lib_db {
        class LeadsRepo {
            +createLead(input)
            +getLeadForDelivery(id)
            +updateLeadDelivery(id, update)
        }
        class PropertiesRepo {
            <<public, RLS: published only>>
        }
        class AdminPropertiesRepo {
            +getAdminProperty(id)
            +appendPhoto(id, photo)
        }
        class SettingsRepo {
            +getSettings()
        }
        class PropertyPermissions {
            +canCreateProperty(mode) bool
            +canEditProperty(mode, source) PropertyPermissions
        }
    }

    namespace lib_integrations {
        class PlektanClient {
            +searchAll()
            +view(adid)
            +getContactPersons()
            +addAdvert(params)
        }
        class TelegramClient {
            +sendTelegramMessage(text)
        }
        class TurnstileVerifier {
            +verifyTurnstile(token, ip) bool
        }
        class GeocodeClient {
            +geocode(address)
        }
        class R2Client {
            +putObject(key, body, type)
            +deleteObjects(keys)
        }
        class SupabaseClients {
            +createAdminClient()
            +createServerClient()
            +createPublicClient()
        }
        class AdminSession {
            +getAdminSession()
            +requireAdmin()
        }
    }

    namespace lib_sync {
        class RunSync {
            +runSync(options) SyncResult
        }
        class SyncPhotos {
            +syncPropertyPhotos()
            +syncAgentPhotos()
        }
        class MapProperty {
            +mapProperty(item, card, rates)
        }
    }

    class FixtureMode {
        <<pattern>>
        every external client runs
        on fixtures without keys
    }

    SitePages --> PropertiesRepo
    SitePages --> LeadActions
    AdminPages --> AdminPropertiesRepo
    AdminPages --> AdminPropertyActions
    AdminPages --> AdminSettingsActions
    AdminPages --> AdminSession

    LeadActions --> SubmitLead
    SubmitLead --> TurnstileVerifier
    SubmitLead --> LeadsRepo
    SubmitLead --> DeliverLead : after()
    DeliverLead --> LeadsRepo
    DeliverLead --> PlektanClient
    DeliverLead --> TelegramClient
    RetryLeads --> DeliverLead
    CronRoutes --> RetryLeads
    CronRoutes --> RunSync

    AdminPropertyActions --> PropertyPermissions
    AdminPropertyActions --> AdminPropertiesRepo
    PhotosRoute --> AdminSession
    PhotosRoute --> PropertyPermissions
    PhotosRoute --> R2Client
    PhotosRoute --> AdminPropertiesRepo

    RunSync --> SettingsRepo
    RunSync --> PlektanClient
    RunSync --> MapProperty
    RunSync --> GeocodeClient
    RunSync --> SyncPhotos
    SyncPhotos --> R2Client

    LeadsRepo --> SupabaseClients
    PropertiesRepo --> SupabaseClients
    AdminPropertiesRepo --> SupabaseClients
    SettingsRepo --> SupabaseClients
    AdminSession --> SupabaseClients

    PlektanClient ..> FixtureMode
    TelegramClient ..> FixtureMode
    GeocodeClient ..> FixtureMode
```

## Sequence diagrams

### 1. Visitor submits a lead

The lead is saved **first**; Plektan and Telegram run after the response and never lose it.

```mermaid
sequenceDiagram
    actor Visitor
    participant Form as LeadForm (client)
    participant Action as submitLead (server action)
    participant Flow as processLeadSubmission
    participant CF as Cloudflare Turnstile
    participant DB as Supabase (leads)
    participant Deliver as deliverLead
    participant Plektan as Plektan addAdvert
    participant TG as Telegram Bot API

    Visitor->>Form: fills in contact, consent, solves Turnstile
    Form->>Action: FormData (client_request_id, fields, token)
    Action->>Flow: raw fields + remote IP

    alt honeypot filled
        Flow-->>Form: { status: ok } (silent)
    else validation fails
        Flow-->>Form: { status: invalid, fieldErrors }
    else
        Flow->>CF: verifyTurnstile(token, ip)
        CF-->>Flow: ok / fail
        alt Turnstile failed
            Flow-->>Form: { status: error }
        else
            Flow->>DB: property published? (property_request only)
            Flow->>DB: createLead (unique client_request_id)
            DB-->>Flow: { id, created }
            Flow-->>Form: { status: ok }
            Form-->>Visitor: success screen
            opt created = true
                Flow--)Deliver: after(): deliverLead(id)
            end
        end
    end

    par Plektan channel
        Deliver->>Plektan: addAdvert(lead)
        Plektan-->>Deliver: itemId / error
    and Telegram channel
        Deliver->>TG: sendMessage(text)
        TG-->>Deliver: ok / error
    end
    Deliver->>DB: update plektan_* / telegram_* (status, attempts, next_attempt_at)
```

### 2. Cron retries failed deliveries

```mermaid
sequenceDiagram
    participant Sched as Scheduled workflow
    participant Route as POST /api/cron/leads
    participant Retry as retryLeads
    participant DB as Supabase (leads)
    participant Deliver as deliverLead
    participant Ext as Plektan / Telegram

    Sched->>Route: POST + cron secret
    Route->>Route: isCronAuthorized?
    alt not authorized
        Route-->>Sched: 401
    else
        Route->>Retry: retryLeads()
        Retry->>DB: leads with failed channel and next_attempt_at <= now
        loop each due lead
            Retry->>Deliver: deliverLead(id)
            Deliver->>Ext: resend only pending/failed channels
            Ext-->>Deliver: ok / error
            Deliver->>DB: save status, attempts, backoff
        end
        Retry->>Retry: alert on channels that used MAX_DELIVERY_ATTEMPTS
        Retry-->>Route: summary
        Route-->>Sched: 200 summary
    end
```

### 3. Plektan sync (CRM mode)

```mermaid
sequenceDiagram
    participant Cron as Cron trigger
    participant Sync as runSync
    participant DB as Supabase
    participant P as Plektan API
    participant Geo as Geocoder
    participant R2 as Cloudflare R2
    participant Cache as Next.js cache tags

    Cron->>Sync: runSync({ mode })
    Sync->>DB: getSettings()
    alt properties_source != plektan
        Sync-->>Cron: skipped (admin is the source)
    else
        Sync->>P: getContactPersons()
        Sync->>P: searchAll(after_date = sync_cursor)
        Note over Sync,P: everything is read before the first write
        Sync->>DB: upsert agents
        Sync->>R2: agent photos
        Sync->>DB: load existing properties

        loop each item from search
            alt is_mls or state != actual
                Sync->>DB: hide if it was published
            else unchanged (same date_mod)
                Sync->>Sync: unchanged++
            else
                Sync->>P: view(adid)
                Sync->>Sync: mapProperty (parse price, rates)
                opt no coordinates
                    Sync->>Geo: geocode(address)
                end
                Sync->>DB: insert or update property (unique slug)
                Sync->>R2: copy photos (2-3 sizes)
                Sync->>DB: write property_photos
            end
        end

        Sync->>DB: hide vanished properties (guarded)
        Sync->>DB: advance sync_cursor
        Sync-->>Cron: done { summary, tags }
        Cron->>Cache: revalidate changed property tags
    end
```

### 4. Admin uploads a property photo

```mermaid
sequenceDiagram
    actor Admin
    participant UI as PhotoDropZone (browser)
    participant Route as POST /api/admin/photos
    participant Auth as requireAdmin
    participant DB as Supabase
    participant R2 as Cloudflare R2

    Admin->>UI: drops a file
    UI->>UI: check type/size, resize to 1-3 widths (WebP/JPEG)
    UI->>Route: multipart (property_id, ext, width, height, w<N> files)
    Route->>Auth: requireAdmin()
    alt not signed in / not an admin
        Route-->>UI: 401 / 403
    else
        Route->>DB: getAdminProperty + getSettings
        Route->>Route: canEditProperty(mode, source).photos?
        alt Plektan owns the catalog
            Route-->>UI: 403
        else limit reached
            Route-->>UI: 409
        else
            Route->>Route: check content type, size, magic bytes
            loop each size
                Route->>R2: putObject(key)
            end
            Route->>DB: appendPhoto(r2_key, sizes, width, height)
            alt DB fails
                Route->>R2: deleteObjects(keys) (rollback)
                Route-->>UI: error
            else
                Route-->>UI: { ok: true, photo }
                UI-->>Admin: tile appears in the grid
            end
        end
    end
```

### 5. Admin switches the properties source

```mermaid
sequenceDiagram
    actor Admin
    participant UI as SourceSwitch (settings page)
    participant Action as AdminSettingsActions
    participant Auth as requireAdmin
    participant DB as Supabase (settings, properties)
    participant Cache as Next.js cache tags

    Admin->>UI: chooses plektan or admin
    UI->>Admin: consequences dialog (counts of objects)
    Admin->>UI: confirms
    UI->>Action: switchSource(target)
    Action->>Auth: requireAdmin()
    Action->>DB: update settings.properties_source
    Note over Action,DB: from now on only one source writes properties,<br/>runSync is skipped when source = admin
    Action->>Cache: revalidate catalog tags
    Action-->>UI: result
    UI-->>Admin: new mode (fields editable or SEO-only)
```
