# Railway Mission reporting app: Phase 1 prototype

An offline-first Progressive Web App prototype for simplifying Railway Mission reporting.

> **PROTOTYPE. SYNTHETIC DATA ONLY.** Do not enter real personal, welfare, safeguarding, health or incident
> information. Nothing is sent anywhere: the "server" is a simulation inside the browser.

- Design and decisions: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Forms are **placeholders** until Railway Mission supplies the real field lists.
- Urgent guidance and contacts are **placeholders** until Railway Mission approves them.

---

## Requirements

- Node.js 20 or later (developed on Node 24)
- npm
- For the end-to-end tests: Google Chrome installed (the tests use the installed browser, no download)

## Launch the app

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:5173** in Chrome or Edge.

`npm run dev` is for development. It does **not** register the offline service worker. To test offline
behaviour, use the production build:

```bash
npm run build
npm run preview
```

Open **http://127.0.0.1:4173**. Install it from the browser's install option (desktop Chrome or Edge, or
"Add to Home Screen" on Android Chrome and iOS Safari) to test it as an installed PWA.

## Checks

```bash
npm run typecheck   # TypeScript strict mode
npm run lint        # ESLint, incl. a ban on console.* in src/ and on dangerouslySetInnerHTML
npm test            # unit and integration tests (Vitest, fake-indexeddb)
npm run build       # typecheck, then production build and service worker
npm run test:e2e    # Playwright, offline scenarios in real Chrome (run `npm run build` first)
npm run check       # typecheck + lint + unit/integration tests
```

## Demonstrate the offline behaviour

1. Run `npm run build && npm run preview`, open http://127.0.0.1:4173 and wait a few seconds.
2. **Go offline.** Turn off Wi-Fi, or in Chrome DevTools (F12) open the Network tab and choose
   *Offline*. The header shows **OFFLINE**.
3. **Reload the page.** It still loads, because the app shell is cached by the service worker.
4. **Create a report.** Tap *Record a welfare interaction*, fill in the placeholder fields and press
   *Complete and queue for sending*. It is shown as **Waiting to send**, not submitted.
5. **Reload again while offline.** The queued report is still there. It is stored in IndexedDB.
6. **Reconnect.** Turn Wi-Fi back on, or set DevTools back to *Online*. The header moves to
   **SYNCING**, then **ONLINE**. The report moves to *Submitted*, with a server reference
   (`SIM-RCPT-…`).

To demonstrate the failure states without going offline, open **Settings → Connection simulation**:

- **No connection** shows OFFLINE, and reports stay queued.
- **Flaky connection** randomly fails some requests. Sometimes it loses the response after the server has
  stored the report. The retry then returns the same reference, so no duplicate appears.
- **Server failing** shows **SYNC FAILED** with the report marked *Not sent yet. Will retry*.
- **Online** clears the failure.

The Settings screen also shows the recent device activity log, which records codes only, never report content.

## What the status words mean

| Label | Meaning |
|---|---|
| **Saved on this device** | A draft. Only on this device. |
| **Waiting to send** | Completed and queued. Not yet confirmed by the server. |
| **Sending…** | A send request is in progress. |
| **Not sent yet. Will retry** | The last attempt failed. It will retry automatically. |
| **Needs attention** | The server could not accept it. A person must withdraw and fix it. |
| **Submitted** | The server has confirmed receipt and issued a reference. The only state that means submitted. |

## Project layout

```
src/
  app/         App shell, routing, runtime context (wires the pieces together)
  config/      Urgent guidance and contacts (PLACEHOLDER content, see file header)
  data/        Dexie database, repositories, synthetic seed data
  domain/      Types, form definitions (PLACEHOLDER fields), validation, status rules
  lib/         Sanitising, IDs, hashing, the single logging entry point
  screens/     Dashboard, editor, Unsent, Submitted, Settings, Urgent help
  styles/      Design tokens and global styles
  sync/        Outbox sync engine, backoff, simulated transport, status store
  ui/          Shared components and form fields
tests/
  unit/        Domain rules, sanitising, backoff, hashing, UI status components
  integration/ Repositories and sync engine against fake IndexedDB
  e2e/         Offline scenarios in a real browser (Playwright)
```

## Adding a form

Forms are data. To change a form, edit its entry in [src/domain/formDefinitions.ts](src/domain/formDefinitions.ts):
add or change fields. Bump `schemaVersion` when the approved fields arrive. Add a new `ReportKind` in
[src/domain/types.ts](src/domain/types.ts) and an entry in `FORM_DEFINITIONS` to add a workflow.
No screen code needs to change.

## Known limits (prototype)

- **No real backend, authentication or encryption.** Browser storage is not a security boundary.
  Do not use real data.
- The simulated server holds receipts in memory, so they are lost on reload. The device keeps its own
  record of each submission.
- Only one browser tab sends at a time (Web Locks). Other tabs show their own status, which can lag briefly.
- The app icon is a neutral placeholder. Add PNG icons (192 and 512 px) before any installation test.
- iOS Safari may clear website storage after a period of disuse. This must be tested on real devices
  before any reliability claim.
- Dependencies: production dependencies have no known vulnerabilities (`npm audit --omit=dev`). Three moderate advisories remain in build-time tooling (`workbox-build`, `glob`, `minimatch` via `vite-plugin-pwa`) with no non-breaking fix. They do not ship to users.
