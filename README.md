# Raajje Stay

Room and hotel booking for the Maldives, built for both locals and visitors.

- **Four stay types:** local island guesthouses, resorts, city hotels and short-term apartments
- **Two price modes:** resident rates in MVR (no Green Tax) and visitor rates in USD (Green Tax shown and paid at the property)
- **Transfers:** speedboats, public ferries, seaplanes, domestic flights, taxis and buses, bookable on their own or with a stay
- **Full flow:** search, filters, property pages, checkout, confirmation, My trips with cancellation and bank-slip upload, sign-in

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Deploy on GitHub Pages

1. Push this folder to a repository.
2. In the repo, go to **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site goes live at `https://<user>.github.io/<repo>/`.

## Project layout

```
index.html        page shell, header, footer, mobile tab bar
css/styles.css    design tokens (light + dark) and all styles
js/data.js        islands, properties, rooms, transfer routes (sample data)
js/art.js         seeded island illustrations used in place of photos
js/app.js         routing, pricing, search, checkout, trips, sign-in
```

## Pricing rules

Set in `quote()` in `js/app.js`:

| Line | Resident | Visitor |
|---|---|---|
| Service charge | 10% (tourist-registered) | 10% |
| Tax | T-GST 17% (tourist-registered) or GST 8% | T-GST 17% |
| Green Tax | Exempt | USD 12 per guest per night, or USD 6 at inhabited-island guesthouses with 50 rooms or fewer. Under-2s exempt |

## Demo limits

Listings, fares and timetables are samples. Bookings and sign-in are stored in the browser's localStorage, and no payment is taken. A production build needs a backend (bookings, accounts, availability), a payment gateway, and real property and operator data.
