# Canteen Tracker

A fast, offline-first Progressive Web App for tracking what you eat in the office canteen and what it costs. Built for the workflow: **eat → select food → quantity → payment method → save**, in about 5–10 seconds.

**Version 1 stores all data locally in the browser (LocalStorage). Data does not automatically sync between devices or to the cloud.** There is no login, no backend, and no external database — everything stays on the device.

## Features

- **Home dashboard** — today's spend, this week, this month, average/day, and recent expenses at a glance.
- **Add expense** — tap food items (favorites and recently-used items surface first), adjust quantity with `− / +`, pick a payment method, add an optional note, save.
- **Price history is preserved** — every expense stores a snapshot of the price at the time it was bought, so a later price change never rewrites old expenses.
- **History** — expenses grouped by day with running daily totals, filters (date range, payment method), and search.
- **Analytics** — monthly total, average daily spend, highest spending day, most purchased item, payment breakdown, and food breakdown, with a month switcher.
- **Settings** — manage canteen items (add/edit/deactivate/delete/favorite), manage payment methods, light/dark/system theme, export/import a JSON backup, and clear all data.
- **PWA** — installable, works offline after the first load, responsive from a 320px phone up through a desktop layout with a sidebar.

## Technology

Vanilla HTML5, CSS3, and ES6+ JavaScript — no build step, no frameworks, no dependencies. A Service Worker caches the app shell for offline use, and a Web App Manifest makes it installable.

## Architecture

```
index.html            App shell: header, sidebar, bottom nav, and the view container
manifest.json          Web App Manifest
service-worker.js      Caches the app shell for offline use (never touches LocalStorage)
css/styles.css          All styling: design tokens, components, responsive breakpoints, themes
js/
  utils.js              Stateless helpers: dates, currency formatting, DOM helpers
  storage.js             StorageService — the ONLY module that touches window.localStorage
  state.js                AppState — in-memory state kept in sync with StorageService, pub/sub
  calculations.js          Calc — every derived number (daily/weekly/monthly totals, breakdowns)
  ui.js                     Screen renderers, toasts, and modal/sheet dialogs
  router.js                  Hash-based router (#/home, #/add, #/history, #/analytics, #/settings)
  app.js                      Bootstraps the app and registers the service worker
assets/icons/           App icons (192, 512, and a maskable 512 variant)
```

The UI never calls `localStorage` directly — it goes through `StorageService` (LocalStorage read/write) and `AppState` (in-memory cache + change notifications). This keeps the data layer in one place and makes the storage model easy to change later if needed.

## LocalStorage data model

Each collection is stored under its own key, wrapped with a version number for future migrations:

```
canteen_user              { id, name, createdAt, updatedAt }
canteen_items              [{ id, name, price, category, active, favorite, createdAt, updatedAt }]
canteen_expenses             [{ id, date, createdAt, items: [{ itemId, itemName, quantity, unitPrice, total }], subtotal, total, paymentMethod, note }]
canteen_settings               { theme, lastPaymentMethod, onboarded }
canteen_payment_methods           [{ id, name, active }]
```

Every value is wrapped as `{ version, data }`, so a future release can add a migration step without losing existing data. `storage.js` also wraps every read/write in error handling, so a corrupted value or a full storage quota never crashes the app.

## Running locally

No build step is required. Because the app uses a Service Worker (which most browsers only run over `http(s)`, not `file://`), serve it with any static file server, for example:

```bash
cd canteen-tracker
python3 -m http.server 8080
# then open http://localhost:8080
```

or, with Node installed:

```bash
npx serve .
```

## Deploying to GitHub Pages

1. Push the contents of this folder to a GitHub repository (the files can live at the repo root, or under `/docs` if you prefer).
2. In the repo, go to **Settings → Pages**, and set the source to the branch/folder you pushed to.
3. Your app will be available at `https://<username>.github.io/<repository-name>/`.

Every path in this project is relative (`./css/styles.css`, `./js/app.js`, etc.), and the Service Worker resolves its cache list against its own registration scope — so the app works correctly whether it's hosted at a domain root or under a repository subpath. No configuration changes are needed for GitHub Pages.

## Installing as a PWA

Open the deployed URL in Chrome, Edge, or Safari on desktop or mobile, and use the browser's "Install app" / "Add to Home Screen" option. Once installed, the app opens in its own window and continues to work offline.

## Backing up and restoring your data

Because Version 1 has no cloud sync, use **Settings → Data → Export data** regularly. This downloads a `canteen-tracker-backup.json` file containing your profile, items, expenses, settings, and payment methods.

To restore, use **Settings → Data → Import data** and select a backup file. You'll be asked to confirm before it replaces the data currently on the device — nothing is overwritten silently.

## Limitations of local-only storage

- Data lives in one browser on one device. Switching browsers, clearing site data, or using a different device starts you with a blank slate unless you import a backup.
- Private/incognito browsing may clear LocalStorage when the session ends.
- There's no account recovery — the exported JSON file is your only backup mechanism.

## Not in Version 1 (by design)

No login, no cloud database, no analytics or tracking, no external API calls for storing data. This keeps the app fast, private, and fully functional offline.
