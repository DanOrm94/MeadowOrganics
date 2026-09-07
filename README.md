# Meadow Organics

Professional Cloudflare-ready storefront for Meadow Organics, styled from the supplied leaflet and business information.

## Included

- Responsive Meadow Organics storefront with animated, premium editorial styling.
- Product categories, stock-aware basket and online checkout.
- Stripe Checkout integration through Cloudflare Pages Functions.
- D1 inventory/order database.
- Secure HTTP-only admin session for inventory management at `/admin.html`.
- Stripe webhook that confirms payment and decrements stock.
- Separate Cloudflare Worker with a nightly cron that emails **only paid orders going out the following day** to the business email.
- Contact details from the leaflet: `07507 196146` and `admin@meadoworganicsmcr.co.uk`.
- Instagram: https://www.instagram.com/meadow.organics.mcr/

## Cloudflare setup

### 1. Pages + D1

Create a Cloudflare D1 database called `meadow-organics`, then run `schema.sql` against it. Add the D1 binding as `DB` to the Pages project.

Deploy the repository as a Cloudflare Pages project. The `functions/` directory supplies the API endpoints automatically.

### 2. Secrets

Set these as Cloudflare secrets/environment variables for the Pages project:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ADMIN_EMAIL` = the business admin email
- `ADMIN_PASSWORD` = a strong unique password
- `ADMIN_SESSION_SECRET` = a long random secret

### 3. Stripe

Create a Stripe webhook pointing to:

`https://YOUR-DOMAIN/functions/api/stripe-webhook`

Subscribe to `checkout.session.completed` and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 4. Nightly email worker

Create a separate Cloudflare Worker from `worker.js` using `wrangler.toml`. Replace `REPLACE_WITH_D1_DATABASE_ID` with the D1 database ID and bind the same database as `DB`.

Set:

- `RESEND_API_KEY` as a Worker secret.
- `ADMIN_EMAIL` as the destination address.
- `RESEND_FROM` as a verified sender/domain in Resend.

The cron runs nightly at `19:00 UTC` and calculates the next calendar day in the `Europe/London` timezone before selecting paid orders. This means the email contains only orders due out the following day.

## Important production note

Do not put Stripe secrets, Resend keys or the admin password in browser JavaScript. They belong in Cloudflare secrets. The supplied frontend only calls the server-side API.
