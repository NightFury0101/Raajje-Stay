# Raajje Stay

Room, hotel and transfer booking for the Maldives, for locals and visitors.

Three apps share one codebase:

| Page | Who it's for | What it does |
|---|---|---|
| `index.html` | Guests | Search, property pages, checkout, transfers, My trips, sign-in, "List your property", English and Dhivehi |
| `partner.html` | Guesthouses, hotels, resorts | Today's arrivals and departures, bookings with check-in/out, bank slip checks, availability calendar, rooms & rates, property page |
| `admin.html` | Raajje Stay staff | Property approvals, all bookings, refunds, transfer operators, tax rates |

## Two modes

**Demo mode** (default). Everything runs in the browser and is saved in localStorage, so the site, dashboard and admin panel share one sample database. Sign-in codes are `123456`. No payments are taken and no ID or passport numbers are stored.

**Live mode.** Fill in `js/config.js` with your Supabase project and the same pages use a real database, real sign-in codes, BML card payments, and booking emails and texts.

## Run it

No build step.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy on GitHub Pages

1. Push this folder to a repository.
2. **Settings → Pages → Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Live at `https://<user>.github.io/<repo>/`.

## Go live

### 1. Database (Supabase, free tier is enough to start)

1. Create a project at supabase.com.
2. In **SQL Editor**, run `supabase/schema.sql`, then `supabase/seed.sql`.
3. **Authentication → Providers**: turn on Email. For SMS codes, turn on Phone and connect an SMS provider (Twilio, MessageBird, Vonage or Textlocal).
4. **Authentication → URL Configuration**: set Site URL to your GitHub Pages address.
5. Copy **Project URL** and **anon public key** from **Settings → API** into `js/config.js`, and set `siteUrl` to your Pages address.
6. Make yourself admin: sign in once on the site, then in the SQL editor run
   `update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`
7. Give a property to its owner: after they sign in once, run
   `update properties set owner = (select id from auth.users where email = 'owner@example.com') where id = 'ocean-sand-inn';`
   New properties that apply through "List your property" are owned by the applicant automatically.

To regenerate `seed.sql` after editing `js/data.js`: `node supabase/make-seed.js > supabase/seed.sql`.

### 2. Payments (Bank of Maldives BML Connect)

1. Apply for a BML Connect merchant account and get an API key from the merchant portal. Ask for USD as well as MVR if visitors will pay by card.
2. Install the Supabase CLI, then from this folder:
   ```bash
   supabase link --project-ref <your-ref>
   supabase secrets set BML_API_KEY=... BML_API_BASE=https://api.merchants.bankofmaldives.com.mv/public
   supabase functions deploy bml-pay bml-verify bml-refund
   ```
3. Check `BML_API_BASE` and the request format in `supabase/functions/_shared/util.ts` against BML's current merchant documentation, and test with their sandbox key first.

How it works: checkout creates the booking (status *awaiting payment*), `bml-pay` creates the BML transaction for the amount stored in the database, and the guest pays on BML's page. When they return, `bml-verify` asks BML for the transaction state and confirms the booking only if BML says it's paid in full. Card details never touch this site.

Refunds: the admin panel marks the booking refunded and shows the amount and transaction to return in the BML merchant portal.

### 3. Emails and text messages

```bash
supabase secrets set RESEND_API_KEY=... MAIL_FROM="Raajje Stay <bookings@yourdomain.mv>" SITE_URL=https://<user>.github.io/<repo>/
# optional SMS through Dhiraagu, Ooredoo or another gateway:
supabase secrets set SMS_GATEWAY_URL=... SMS_GATEWAY_TOKEN=... SMS_SENDER=RaajjeStay
supabase functions deploy notify
```

Then **Database → Webhooks → Create**: table `bookings`, events Insert and Update, type Supabase Edge Function, function `notify`.

Guests get messages when a booking is confirmed, when a bank transfer is due, when a slip is rejected, and when a booking is cancelled or refunded. Property owners get an email for new bookings, cancellations and slips to check. The SMS request body in `notify/index.ts` is generic; adjust it to your provider's API.

## How pricing works

Same rules in `js/pricing.js` (browser) and `rs_quote` in `supabase/schema.sql` (server). The server's price is the one charged.

| Line | Resident | Visitor |
|---|---|---|
| Service charge | 10% at tourist-registered places | 10% |
| Tax | T-GST 17% (tourist-registered) or GST 8% | T-GST 17% |
| Green Tax | Exempt | USD 12 per guest per night, or USD 6 at inhabited-island guesthouses with 50 rooms or fewer. Under-2s exempt. Paid at the property |

Admins can change every rate in **Taxes & settings**; new bookings use the new rates immediately.

## Security (live mode)

- Row level security on every table: guests see only their bookings, owners only their property's, admins everything.
- Bookings are created only through `create_booking`, which checks availability (with a row lock against double-booking), recomputes the price and refuses visitor bookings at residents-only places.
- Only admins can change a listing's status or a user's role.
- Bank slips go to a private storage bucket readable only by the guest, the property and admins.

Tested against Postgres 16: pricing, overbooking, cross-guest privacy, self-promotion and status-change rules.

## Project layout

```
index.html  partner.html  admin.html
css/styles.css     design tokens (light + dark), public site, RTL rules
css/dash.css       dashboard and admin layout
js/config.js       Supabase keys (empty = demo mode)
js/data.js         islands, sample properties, transfer routes
js/pricing.js      price and tax rules
js/api.js          data layer: demo (localStorage) or live (Supabase)
js/i18n.js         English and Dhivehi interface text
js/art.js          island illustrations used in place of photos
js/app.js          public site
js/partner.js      property dashboard
js/admin.js        admin panel
supabase/          schema, seed, Edge Functions (bml-pay, bml-verify, bml-refund, notify)
```

## Still to do before launch

- Real property photos: add an image upload to the dashboard (Supabase Storage) to replace the illustrations.
- Real listings, rates and timetables from your partner properties and boat operators.
- Have a native speaker review the Dhivehi text in `js/i18n.js`.
- Terms, privacy policy and a business registration for the BML merchant account.
