# lil sweet treat — Fulfillment & Order Exception Tracker

A small internal tool for the fulfillment and ecommerce team to track:

- **Stock log** — Camille logs OOS / Low / High stock after physically checking the fulfillment room.
- **Order exceptions + outreach** — one record per affected order line item. Camille and Mary can both log
  and edit exceptions (a reship/damaged/address issue Mary heard about from a customer, or an OOS item
  Camille found that needs outreach), so both sides stay in sync regardless of who created it.
- **Reship/tracking** — tracking numbers for replacement shipments, tied back to the original order.
- **Comments** — a per-exception discussion thread for tracking updates, replacement requests, or anything
  else worth recording between Camille and Mary.
- **Resolution confirmation** — a final admin sign-off, separate from "outreach sent" or "customer responded."
- **In-app notifications** — a bell icon that alerts the right person when responsibility hands off (e.g.
  Camille gets notified the moment Mary records a customer response that's ready to fulfill).
- **Dashboard + archive** — what's open, what's waiting on whom, and a searchable history. Exceptions on
  the same order are grouped together so multiple issues on one order don't read as separate orders.

Everything is entered manually. This intentionally does **not** sync with Shopify or ShipStation — it's a
log for issues that those platforms don't track (OOS substitutions, reships, customer choices), not a
mirror of order data.

## How the workflow moves

Each exception moves through a fixed sequence, and only the last step counts as "crossed off":

```
LOGGED → OUTREACH_SENT → CUSTOMER_RESPONDED → FULFILLED → CONFIRMED_RESOLVED
                      ↘ CLOSED_NO_RESPONSE (customer never replies)
```

The guided buttons (mark outreach sent, record customer response, mark fulfilled, close no-response) capture
the right fields for each transition, but any of the three roles can also jump the stage directly via the
stage editor on an exception's detail page — useful when reality doesn't fit the guided flow (e.g. Mary
already knows the customer's choice when she logs a reship exception). `CONFIRMED_RESOLVED` is the one
exception: it's only reachable through the dedicated admin confirm action (or the full admin override panel),
never the direct stage editor.

If the customer chooses a refund instead of a replacement, `FULFILLED` is skipped — an admin can confirm
resolution directly once the refund is issued.

**Address updates work differently.** There's no customer choice to gather — Mary already has the
corrected address when she logs it — so this type skips outreach/customer-response entirely:
`LOGGED → FULFILLED (address corrected) → CONFIRMED_RESOLVED`. The detail page swaps in a single
"corrected address" field and hides the outreach section for this type.

**Damaged/lost exceptions get an extra, independent checkbox** for whether a claim's been filed with the
carrier (UPS/FedEx/etc.) — this tracks cost recovery from the carrier, which is unrelated to whether the
customer's been made whole, so it doesn't block or get blocked by the main resolution flow.

## Roles

| Role | Can do |
|---|---|
| **Fulfillment** (Camille) | Add/edit stock levels; create/edit any exception, including stage |
| **Outreach** (Mary) | Create/edit any exception, including stage. Read-only on stock. |
| **Admin** (Emilie) | Everything above, plus confirming final resolution, the full field/stage override panel, and managing user accounts |
| **Viewer** | Read-only across the whole app — dashboard, exceptions, stock, archive. No create/edit buttons, forms, or stage controls anywhere. For sharing progress with leadership. |

Every record shows a timestamp and who last touched it. Anything sitting in a non-final stage for more than
2 days gets a yellow aging flag; 5+ days turns red, so nothing silently falls through the cracks.

## Notifications

In-app only (no email/SMS) — a bell icon in the header shows unread count and links to `/notifications`.
Notifications fire when responsibility hands off:

- New exception logged → everyone else is notified.
- Customer response recorded, resolution is a reship → Fulfillment is notified it's ready to ship.
- Customer response recorded, resolution is a refund/other → Admin is notified it's ready to confirm.
- Marked fulfilled → Admin is notified it's ready to confirm.
- New comment → everyone else is notified.

Since there's no email/push service wired up, this only surfaces next time someone is in the app (page
load/navigation) — not a phone alert while they're away from the computer.

## Tech stack

- **Next.js 16** (App Router, Server Actions) + React 19 + TypeScript
- **Postgres** via **Prisma 6**
- **Tailwind CSS 4** for styling — brand palette (mint background, cream header, navy text/buttons) is
  defined once in `src/app/globals.css` by overriding the `zinc-50`/`zinc-900` theme shades, so it applies
  app-wide without touching individual components; cards stay white
- Auth: email/password (bcrypt) + signed session cookie (jose), no third-party auth provider

## Local development

Prerequisites: Node 20+, a local Postgres instance.

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and SESSION_SECRET
npx prisma migrate dev    # creates tables
npm run db:seed           # creates the 3 initial accounts (see below)
npm run dev
```

Visit `http://localhost:3000/login`.

### Seeding accounts

`npm run db:seed` creates one Fulfillment, one Outreach, and one Admin account. Passwords come from
environment variables (`SEED_CAMILLE_PASSWORD`, `SEED_MARY_PASSWORD`, `SEED_EMILIE_PASSWORD`) if set,
otherwise a random password is generated and printed once to the terminal — write it down, it isn't stored
anywhere and won't be shown again. Everyone should change their password from the **Account** page after
first login. An admin can add more accounts (including a **Viewer** account for leadership) or reset
passwords from the **Users** page in the app.

## Deploying on Railway

1. Push this repo to GitHub, then in Railway: **New Project → Deploy from GitHub repo**.
2. Add a **Postgres** database to the project (Railway plugin) — it sets `DATABASE_URL` automatically for
   linked services.
3. On the app service, set environment variables:
   - `SESSION_SECRET` — a long random string (e.g. `openssl rand -base64 32`). **Required.**
   - `DATABASE_URL` — reference the Postgres plugin's variable if it isn't linked automatically.
4. Railway picks up `railway.json` in this repo, which runs `npx prisma migrate deploy` before `next start`
   on every deploy, so schema changes apply automatically.
5. After the first deploy, run the seed script once against the production database (Railway's "Run
   Command" in the service, or `railway run npm run db:seed` from the CLI with the right env vars set) to
   create the 3 accounts.

No other configuration is required — there's no external API integration to wire up, since this tool is
intentionally manual-entry only.

## Project structure

```
prisma/schema.prisma          Data model (Users, StockCheck, Exception, ExceptionEvent,
                               ExceptionComment, Notification)
prisma/seed.ts                 Creates the 3 initial accounts
src/lib/                       DB client, auth/session, permission helpers, notifications, shared constants
src/proxy.ts                   Route protection (redirects unauthenticated requests to /login)
src/app/actions/                Server Actions — all writes go through here with role checks
src/app/(app)/                  Authenticated pages: dashboard, exceptions, stock, archive, users,
                                 account, notifications
src/app/login/                  Login page
src/app/api/export/             CSV export of the exceptions archive
```
