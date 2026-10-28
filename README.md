# Nestora — Property Rental App

Nestora is a full-stack web app for **long-term home rentals**. Renters can browse Los Angeles listings, search and filter them, and save and compare homes. They can ask the listing agent questions and book an in-person or video viewing. Listing agents answer inquiries and manage viewings from a small queue.

It's built from the Nestora Figma design (file *ziahdesign*, page "Nestora — Property Rental App", node `274-5177`) with Next.js, TypeScript, Tailwind CSS and Supabase (Postgres, Auth, Row Level Security and Storage).

![Nestora cover — Search Results Map, Discover and Property Details screens](docs/cover.jpg)

> **Status — what's real and what isn't**
>
> - **Sample data:** every listing, agent, price, address and reference (`NST-INQ-…`, `NST-VW-…`) is illustrative sample data from the design, labelled in the app.
> - **No messages leave the app:** no email, SMS or push messages are sent. Inquiries and viewings appear in the agent's Nestora queue, and notifications appear inside the app.
> - **No money is handled:** there are no payments, deposits or leases. Nestora shows the rental terms the agent has shared and never fills in missing ones ("Not specified").
> - **Maps are illustrative:** they're drawings with approximate positions, not a map SDK. Exact addresses aren't plotted.
> - **Local only:** it runs against a local Supabase stack and hasn't been deployed.

## Contents

- [Screens](#screens)
- [Features](#features)
- [Run it locally](#run-it-locally)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Inquiry and viewing workflow](#inquiry-and-viewing-workflow)
- [Security](#security)
- [Testing](#testing)
- [Deployment (Vercel + Supabase)](#deployment-vercel--supabase)
- [Design notes and limitations](#design-notes-and-limitations)

## Screens

These are the Figma screens from `Nestora_Portfolio_Export.zip` (64 screens exported at 3×; 22 are shown here). The app implements them. These images are the design exports, not screenshots of the running app.

| Discover | Search | Results | Map |
| :---: | :---: | :---: | :---: |
| ![Discover](docs/screens/discover-default.jpg) | ![Search](docs/screens/search-default.jpg) | ![Search results](docs/screens/search-results-default.jpg) | ![Results on the map](docs/screens/search-results-map.jpg) |
| **Filters & sort** | **Property details** | **Gallery** | **Saved homes** |
| ![Filters](docs/screens/filters-default.jpg) | ![Property details](docs/screens/property-details-default.jpg) | ![Gallery](docs/screens/property-gallery-image-2-of-5.jpg) | ![Saved homes](docs/screens/saved-properties-default.jpg) |
| **Compare** | **Recently viewed** | **Contact agent** | **Inquiry sent** |
| ![Compare homes](docs/screens/comparison-three-homes.jpg) | ![Recently viewed](docs/screens/recently-viewed-default.jpg) | ![Contact agent](docs/screens/contact-agent-default.jpg) | ![Inquiry sent](docs/screens/inquiry-sent.jpg) |
| **My inquiries** | **Inquiry details** | **Schedule viewing** | **Viewing booked** |
| ![My inquiries](docs/screens/my-inquiries-default.jpg) | ![Inquiry details](docs/screens/inquiry-details-responded.jpg) | ![Schedule viewing](docs/screens/schedule-viewing-default.jpg) | ![Viewing booked](docs/screens/appointment-confirmed.jpg) |
| **Viewing details** | **My viewings** | **Notifications** | **Profile** |
| ![Viewing details](docs/screens/appointment-details.jpg) | ![My viewings](docs/screens/my-viewings-default.jpg) | ![Notifications](docs/screens/notifications-default.jpg) | ![Profile](docs/screens/profile-default.jpg) |
| **Settings** | **Sign in** | | |
| ![Settings](docs/screens/settings-default.jpg) | ![Sign in](docs/screens/sign-in-default.jpg) | | |

## Features

| Area | What works | Route |
| --- | --- | --- |
| Discover | <ul><li>Greeting and search entry.</li><li>Type chips.</li><li>Featured homes.</li><li>Neighborhoods with real home counts.</li><li>Recently added.</li></ul> | `/` |
| Search | <ul><li>Keyword search (neighborhood, address, ZIP).</li><li>Recent searches, saved per account.</li><li>Suggested neighborhoods.</li><li>Popular presets.</li></ul> | `/search` |
| Results | <ul><li>Filters for type, rent range, bedrooms, furnished, pet-friendly, parking and "available by".</li><li>Four sort orders.</li><li>Live "Show N homes" count.</li><li>List and illustrative map views.</li><li>Pagination, plus loading, empty and error states.</li></ul> All filters run as one database query, and the URL holds the filters. | `/homes` |
| Property details | <ul><li>Photos and gallery.</li><li>Specs, description and amenities.</li><li>Rental terms ("Not specified" when the agent hasn't shared one).</li><li>Approximate location.</li><li>Agent card and similar homes.</li><li>Share, save and compare.</li></ul> | `/homes/[slug]` |
| Saved & compare | <ul><li>Save or remove (with confirm).</li><li>Type tabs.</li><li>Compare up to 3 homes side by side, with "Best" marking a single lowest rent or largest size.</li><li>"Compare is full" dialog.</li><li>Recently viewed (7 days) with clear history.</li></ul> | `/saved`, `/compare`, `/recently-viewed` |
| Inquiries | <ul><li>Contact agent with topics, validation, sending, retry on failure and idempotent submit.</li><li>Sent confirmation.</li><li>List with All, Active and Closed.</li><li>Details with status timeline and conversation.</li><li>Reply and withdraw (with confirm).</li></ul> | `/homes/[slug]/contact`, `/inquiries` |
| Viewings | <ul><li>In-person or video viewing.</li><li>Week of days with the agent's open times; unavailable days and taken times are marked.</li><li>Booking and booked confirmation.</li><li>`.ics` calendar file.</li><li>Details, reschedule and cancel.</li><li>Upcoming and past lists.</li></ul> | `/homes/[slug]/schedule`, `/viewings` |
| Notifications | <ul><li>Agent replies, viewing changes and price changes on saved homes, stored in Postgres.</li><li>Unread state and mark all read.</li><li>Details page.</li></ul> | `/notifications` |
| Profile & settings | <ul><li>Completeness bar.</li><li>Edit profile, with photo upload to Supabase Storage.</li><li>Notification toggles.</li><li>Contact preferences.</li><li>Download my data (JSON).</li><li>Sign out.</li></ul> | `/profile`, `/settings` |
| Help | <ul><li>Searchable FAQ.</li><li>Support tiles that honestly say there's no support team in this sample.</li></ul> | `/help` |
| Accounts | <ul><li>Sign in and create account (including the "email taken" state).</li><li>Forgot and reset password, using Supabase Auth email links.</li></ul> | `/login`, `/register` |
| Agent queue | <ul><li>A listing agent's open inquiries (reply or close) and upcoming viewings (cancel).</li></ul> This page isn't in the Figma design; it exists so the renter-side states can actually happen. | `/agent` |

## Run it locally

**Requirements:** Node 20+, Docker (for the local Supabase stack). The Supabase CLI is a dev dependency.

```bash
npm install
npm run db:start          # local Supabase on ports 573xx (API http://127.0.0.1:57321)
cp .env.example .env.local
npx supabase status       # copy API_URL and PUBLISHABLE_KEY into .env.local
npm run dev -- -p 3004    # http://localhost:3004
```

Running `npm run db:start` (or `npm run db:reset`) applies `supabase/migrations/*` and `supabase/seed.sql`. Seed dates are relative to the day you reset.

**Sample accounts** (local seed only):

| Role | Email | Password |
| --- | --- | --- |
| Renter (Ziah Makmur) | `demo@nestora.test` | `nestora-demo` |
| Agent (Maya Chen — Silver Lake, Echo Park) | `maya@nestora.test` | `nestora-agent` |
| Agent (Daniel Ortiz — Pasadena, Bel Air) | `daniel@nestora.test` | `nestora-agent` |
| Agent (Lena Park — Venice, Downtown, one draft) | `lena@nestora.test` | `nestora-agent` |

Auth emails (sign-up confirmation, password reset) go to the local Mailpit inbox at http://127.0.0.1:57324.

**Environment variables:**

| Variable | Used for | Where it comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | All data and auth | `supabase status` → `API_URL`, or Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `…_ANON_KEY`) | Browser and server client; RLS applies | `supabase status` → `PUBLISHABLE_KEY`, or Dashboard → API Keys |
| `NEXT_PUBLIC_SITE_URL` | Links in auth emails | Your site origin; it must be in Auth → Redirect URLs |

No service-role key is used anywhere. If the Supabase variables are missing, the app shows `/setup` instead of failing.

**Scripts:**

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server. |
| `npm run lint` | Runs ESLint. |
| `npm run typecheck` | Runs `tsc --noEmit`. |
| `npm test` | Runs the unit and database tests (Vitest + PGlite). |
| `npm run test:e2e` | Runs the Playwright tests against a running stack. |
| `npm run build` | Builds for production. |
| `npm run db:reset` | Re-applies the migrations and the seed. |
| `npm run db:types` | Regenerates `src/types/database.generated.ts`. |

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    UI["React client components<br/>forms, sheets, toggles"]
  end
  subgraph Next["Next.js 16 (App Router)"]
    RSC["Server Components<br/>pages read data"]
    SA["Server Actions<br/>zod validation"]
    RH["Route handlers<br/>/viewings/[id]/ics, /account/export, /auth/*"]
    PX["proxy.ts<br/>session refresh + private-route redirects"]
    DS["lib/services/data.ts<br/>read queries"]
  end
  subgraph Supabase
    AUTH["Auth<br/>email + password"]
    PG[("Postgres<br/>RLS on every table")]
    FN["Workflow functions<br/>send_inquiry, request_viewing, …"]
    ST["Storage<br/>avatars bucket"]
  end
  UI -- "navigation" --> RSC
  UI -- "mutations" --> SA
  RSC --> DS --> PG
  SA -- "rpc()" --> FN --> PG
  SA -- "favorites, compare, profile" --> PG
  SA --> ST
  PX --> AUTH
  RH --> DS
```

- **Every query runs as the visitor.** The server creates a Supabase client from the request's auth cookies (`@supabase/ssr`), and Postgres RLS decides which rows are visible. Pages also check ownership and return 404 for other people's records.
- **Reads** happen in Server Components through `src/lib/services/data.ts` (typed with the generated `Database` types).
- **Writes** are Server Actions (`src/app/actions/*`):
  - Each one validates its input with the zod schemas in `src/lib/validations`, which the client forms also use.
  - Simple owner rows (saved homes, compare, history, profile, settings) are written directly under RLS.
  - Inquiries and viewings go through security-definer Postgres functions, so the state rules live in one transaction in the database.
- **Errors:** database errors raise stable message keys (for example `slot_taken` or `inquiry_exists`). `lib/action-result.ts` maps these keys to the copy shown to renters; other errors are logged without row data and shown as a generic message.
- **Domain rules shared by the UI and the tests** live in `src/lib/domain/*`: formatting in Los Angeles time, availability labels, rental terms, the inquiry timeline, compare "Best", and search-URL parsing.
- **UI:** design tokens are CSS variables in `src/app/globals.css` (colors, `t-*` type styles from the Figma text styles, DM Sans). The shared components are in `src/components/ui.tsx`.

```text
src/
  app/
    (tabs)/          Home, Explore (/homes), Saved, Inquiries, Profile — with the floating tab bar
    (flow)/          details, contact, schedule, viewings, compare, notifications, settings, help, agent
    actions/         server actions (auth, lists, rentals, account, search)
    login, register, forgot-password, auth/*, account/export, setup
  components/        UI primitives, cards, sheets/dialogs, slot picker, forms
  lib/
    domain/          pure rules + unit tests
    services/data.ts read queries
    supabase/        server client, proxy session handling, env
    validations/     zod schemas
  proxy.ts           Next.js proxy (formerly middleware)
  types/             generated database types + aliases
supabase/
  migrations/        schema + RLS, rental workflow functions, storage bucket
  seed.sql           development sample data
tests/
  db/                PGlite harness + database tests
  e2e/               Playwright journeys
docs/                cover and Figma screen exports used in this README
```

## Data model

Prices are `numeric(10,2)` USD per month. Rental terms the agent hasn't shared are `NULL` and shown as "Not specified".

```mermaid
erDiagram
  profiles ||--o{ favorites : saves
  profiles ||--o{ compare_items : compares
  profiles ||--o{ recently_viewed : views
  profiles ||--o{ recent_searches : searches
  profiles ||--o{ inquiries : sends
  profiles ||--o{ viewings : books
  profiles ||--o{ notifications : receives
  agents ||--o{ properties : lists
  agents ||--o{ agent_hours : offers
  agents ||--o{ agent_time_off : blocks
  neighborhoods ||--o{ properties : contains
  properties ||--o{ property_images : has
  properties ||--o{ property_amenities : has
  amenities ||--o{ property_amenities : tags
  properties ||--o{ inquiries : about
  properties ||--o{ viewings : at
  inquiries ||--o{ inquiry_events : timeline
  inquiries ||--o{ viewings : links

  profiles {
    uuid id PK
    text full_name
    text contact_email
    text phone
    text avatar_path
    date preferred_move_in
    contact_method preferred_contact
    boolean share_phone
    boolean notify_inquiry_replies
    boolean notify_viewing_updates
    boolean notify_price_updates
  }
  agents {
    uuid id PK
    uuid user_id FK
    text full_name
    text agency
    text phone
    text email
    boolean verified
  }
  properties {
    uuid id PK
    text slug UK
    uuid agent_id FK
    uuid neighborhood_id FK
    property_type property_type
    listing_status status
    int bedrooms
    numeric bathrooms
    int area_sqft
    numeric monthly_rent
    numeric security_deposit
    pets_policy pets
    int lease_months
    furnishing furnishing
    date available_from
    text search_text
  }
  inquiries {
    uuid id PK
    text reference UK
    uuid user_id FK
    uuid property_id FK
    uuid agent_id FK
    text_array topics
    text message
    inquiry_status status
    text property_title_snapshot
    numeric monthly_rent_snapshot
    uuid idempotency_key
  }
  viewings {
    uuid id PK
    text reference UK
    uuid user_id FK
    uuid property_id FK
    uuid agent_id FK
    uuid inquiry_id FK
    viewing_type viewing_type
    timestamptz starts_at
    timestamptz ends_at
    viewing_status status
    uuid idempotency_key
  }
  notifications {
    uuid id PK
    uuid user_id FK
    notification_kind kind
    text title
    text body
    timestamptz read_at
  }
```

**Key constraints:**

- Listing status is one of `draft`, `available`, `coming_soon` or `leased`.
  - Drafts are hidden from the public.
  - Leased homes stay readable (for saved homes and past inquiries) but can't be contacted.
- Inquiry rules:
  - A renter can have **one open inquiry per home** (a unique partial index).
  - The message must be 20–500 characters.
  - Topics come from a fixed set.
- Viewing rules:
  - An agent can't have two active viewings at the same start time (`viewings_agent_slot`).
  - A renter can have one active viewing per home.
- **Compare holds at most 3 homes.** A trigger checks this under a per-user advisory lock.
- **Recent searches keep the 10 newest** per user; a trigger removes older ones.
- **Inquiries store the title and rent the renter saw**, so later listing changes don't rewrite history.

## Inquiry and viewing workflow

```mermaid
stateDiagram-v2
  [*] --> awaiting_response: send_inquiry
  awaiting_response --> responded: agent replies
  awaiting_response --> viewing_scheduled: request_viewing
  responded --> viewing_scheduled: request_viewing
  viewing_scheduled --> responded: viewing cancelled (agent had replied)
  viewing_scheduled --> awaiting_response: viewing cancelled (no reply yet)
  awaiting_response --> withdrawn: withdraw_inquiry
  responded --> withdrawn: withdraw_inquiry
  viewing_scheduled --> withdrawn: withdraw_inquiry (cancels the viewing)
  awaiting_response --> closed: close_inquiry (agent)
  responded --> closed: close_inquiry (agent)
  viewing_scheduled --> closed: close_inquiry (agent)
```

**Viewing slots:**

- Each agent publishes weekly start times (`agent_hours`, in Los Angeles local time) and days off (`agent_time_off`).
- `viewing_slots(property, from, days)` returns every slot for the week, each marked available or with a reason: `too_soon` (under 2 hours away), `too_far` (over 60 days), `booked`, or a day marked `agent_unavailable`.
- The picker only offers available slots, but the server decides.

```mermaid
sequenceDiagram
  participant R as Renter (browser)
  participant A as Server action bookViewing
  participant F as request_viewing()
  participant DB as Postgres
  R->>A: property, type, startsAt, phone, guests, note, idempotency key
  A->>A: zod validation
  A->>F: supabase.rpc (as the renter)
  F->>DB: same key already used? return that viewing
  F->>DB: listing available / coming soon?
  F->>DB: advisory lock on the agent's calendar
  F->>DB: slot in agent hours, not a day off, 2 h – 60 d ahead, not taken?
  F->>DB: insert viewing (confirmed) + link the open inquiry → viewing_scheduled
  DB-->>A: viewing id (or slot_taken / slot_unavailable / viewing_exists …)
  A-->>R: /viewings/[id]/confirmed, or the error message
```

**Booking rules:**

- Bookings are instant (the design shows "Viewing booked · Confirmed").
- Rescheduling re-runs the same slot checks and ignores the viewing being moved.
- Either the renter or the agent can cancel before the viewing starts.
  - Cancelling frees the slot and returns the linked inquiry to its previous state.
  - An agent's cancellation creates a notification for the renter.
- In-person viewings last 30 minutes and video tours 20 minutes.

**Notifications:**

- Notifications are created in the database for agent replies, inquiry closures, agent cancellations, and rent changes on saved homes (a trigger on `properties.monthly_rent`).
- Each kind respects the renter's toggle in Settings.
- **Viewing reminders aren't generated automatically:** there's no scheduler. The seed includes one reminder to show the design state.

## Security

| Table | Who can read | Who can write |
| --- | --- | --- |
| `properties`, `property_images`, `property_amenities` | Everyone: non-draft listings; an agent also sees their own drafts | Nobody from the app. Listings are managed in SQL and the seed. |
| `agents`, `agent_hours`, `agent_time_off`, `neighborhoods`, `amenities` | Everyone (column grant hides `agents.user_id`) | Nobody from the app |
| `profiles` | The owner | The owner, limited to the profile and settings columns |
| `favorites`, `compare_items`, `recently_viewed`, `recent_searches` | The owner | The owner, and only for homes they can see |
| `inquiries`, `inquiry_events` | The renter and the listing agent | Only through `send_inquiry`, `add_inquiry_message`, `withdraw_inquiry` and `close_inquiry` |
| `viewings` | The renter and the listing agent | Only through `request_viewing`, `reschedule_viewing` and `cancel_viewing` |
| `notifications` | The owner | Created by functions; the owner can only set `read_at` |
| Storage `avatars` | Public URL | The owner, only under `avatars/<user id>/`; JPEG, PNG or WebP up to 2 MB (checked by the bucket and the server action) |

**Further safeguards:**

- **The browser is never trusted** for user IDs, prices, statuses or ownership.
  - Functions take the user from `auth.uid()`.
  - Prices are read from the listing.
  - Status changes are checked against the current state.
- **Roles can't be granted from the app.** Agent accounts are linked in the database (`agents.user_id`), and no client can write that table.
- **Private routes** (saved homes, inquiries, viewings, profile, agent queue, and the contact and schedule pages) are checked three times:
  - The proxy redirects signed-out visitors to sign-in.
  - Pages re-check the user.
  - RLS is the final boundary.
- **No service-role key**, and no secrets in the client bundle. `.env*` files are git-ignored except `.env.example`.
- **Response headers:** `nosniff`, `DENY` framing, a strict referrer policy and a permissions policy.

**Known trade-off:** to show the design's "email already registered" error, sign-up reports when an email already has an account. Supabase hides this by default, so this reveals whether an email is registered.

## Testing

These tests were run during development on 29 Oct 2026 against the local stack:

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | passed, no warnings |
| Types | `npm run typecheck` | passed |
| Unit tests | `npm test` (`src/lib/domain/domain.test.ts`) | 20 passed: formatting in LA time, availability, "Not specified" terms, deposits, compare "Best", completeness, timeline, search-URL parsing, validation, slot-week navigation |
| Database tests | `npm test` (`tests/db/rentals.test.ts`) | 22 passed (see below) |
| End-to-end | `npm run db:reset && E2E_BASE_URL=http://localhost:3004 npm run test:e2e` | 6 passed (see below) |
| Production build | `npm run build` | passed |

**What the 22 database tests cover.** They apply the real migrations to PGlite (in-process Postgres) and run them as real users:

- draft visibility;
- the hidden `agents.user_id` column;
- blocked catalog writes;
- cross-user rules for saved homes and compare;
- the compare limit;
- trimming recent searches;
- inquiry snapshots and idempotency;
- one open inquiry per home;
- leased and draft homes refused;
- inquiry visibility for each renter and agent;
- agent replies and notification settings;
- withdraw cascading to the viewing;
- closing by agents only;
- slot reasons;
- invalid, past and too-far slots;
- double booking;
- rescheduling;
- cancelling and restoring the inquiry state;
- viewing isolation;
- profile column grants;
- price-change notifications;
- notifications that can only be marked read.

**What the 6 end-to-end tests cover:**

1. Public browsing, search, filters with the live count, the empty state, details, the sign-in redirect and a draft returning 404.
2. Save, compare, the "compare full" dialog, contact validation, inquiry sent, history and reload.
3. Booking with the no-time state, the `.ics` file, the inquiry moving to "viewing scheduled", reschedule, cancel and the past list.
4. An agent replies, and the renter sees the notification and the reply.
5. Another agent gets 404 on the renter's inquiry, and signed-out visitors are redirected.
6. Withdrawing an inquiry and removing a saved home.

**Not tested:**

- Avatar upload to Storage (the PGlite harness has no Storage). The bucket policies are in `20261029000300_storage.sql`.
- Auth email links (they need Mailpit and are checked by hand only).
- A hosted Supabase project.

## Deployment (Vercel + Supabase)

The app hasn't been deployed. To deploy it:

1. **Create a Supabase project**, then link it and push the migrations:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   Don't run `seed.sql` in production: it creates sample accounts with known passwords.
2. **Configure Auth** (Authentication → URL configuration):
   - Set the Site URL to your domain.
   - Add `https://<domain>/auth/confirm` to the Redirect URLs.
   - Set up SMTP for real emails. The built-in mailer is rate-limited.
3. **Check Storage:** the migration creates the `avatars` bucket and its policies. Check they exist after `db push`.
4. **Listings and agents:** add your own listings, agents (`agents.user_id` links an agent's account), agent hours and photos. Photos are served from `public/sample/` by `image_key`; for real listings you'd add an image upload or point at Storage.
5. **Create the Vercel project:**
   - Framework: Next.js.
   - Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL`.
   - Deploy.
6. **Smoke test:** sign up, confirm the email, then send an inquiry and book a viewing.

**Troubleshooting:**

| Problem | Fix |
| --- | --- |
| App shows `/setup` | The Supabase variables aren't set. |
| "permission denied for column user_id" | Select explicit agent columns (see `AGENT_COLS`), not `*`. |
| No times in Schedule viewing | The agent has no `agent_hours` for those weekdays, or every slot is under 2 hours away. |
| Sign-up says to check email but nothing arrives locally | Open Mailpit at http://127.0.0.1:57324. |

## Design notes and limitations

- **What was read from Figma:**
  - The node `274-5177` layer tree (page structure, components, text).
  - Screenshots of the cover, the foundations (color, type), the prototype flows and 13 screens.
  - The complete PNG export (`Nestora_Portfolio_Export.zip`: 64 screens, design system and presentation boards).

  The Figma MCP plan's call limit was reached partway through, so the rest of the screens were taken from the export. Exact spacing values beyond the documented spacing and radius tokens were matched by eye from the exports.
- **Rental model:** long-term monthly rentals with agent inquiries and viewings, as in the design. There are no nightly bookings, applications, deposits, payments or leases.
- **Photos:**
  - The listing photos are cropped from the Figma screen exports (the originals weren't available), so most are small: about 270 px for five homes, 1170 × 690 for the Silver Lake exterior and 805 × 1372 for its living room. They look soft on large detail images. Replace the files in `public/sample/` with the original photos.
  - Silver Lake has 2 photos; the other homes have 1 each. The design's "1 / 5" gallery isn't reproduced with invented images.
- **Approximations of the design:**
  - Map pins use stored approximate positions, and the "12" cluster bubble from the design isn't drawn.
  - The rent filter uses min and max inputs instead of the design's dual slider.
  - The location selector ("Los Angeles, CA") is a label, because only Los Angeles data exists.
  - "Language & region" is shown but can't be changed.
- **Not implemented:**
  - An agent self-service listing editor and photo upload for listings.
  - Scheduled viewing reminders.
  - Email, SMS or push delivery.
  - Live support chat.
  - Saved-search alerts (the "New homes for …" notification in the design isn't generated).
  - Account deletion.
- **Desktop:** the layout is mobile-first and centred on wider screens. Discover and the results use multi-column grids at desktop widths. There's no separate desktop design.
