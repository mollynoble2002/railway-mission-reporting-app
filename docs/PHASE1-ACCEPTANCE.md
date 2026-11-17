# Phase 1 acceptance: offline persistence

Status: **PASSED** (manual test, recorded by the project lead)

Scope: the Phase 1 offline-first reporting prototype. Synthetic data only. Not a production sign-off.

Test date: [to be entered by tester]
Device: Windows laptop, Google Chrome (desktop)
Build: production build served with `npm run preview` (http://127.0.0.1:4173)

---

## Manual test: the laptop loses its internet connection

| # | Acceptance criterion | Result |
|---|---|---|
| 1 | The application works while the laptop has no internet connection. | Passed |
| 2 | A report can be created while offline. | Passed |
| 3 | The report is stored locally and shown as **Waiting to send**. | Passed |
| 4 | The Chrome tab can be completely closed. | Passed |
| 5 | The application can be reopened while the laptop is still offline. | Passed |
| 6 | The report and its data remain available after reopening. | Passed |
| 7 | When connectivity is restored, the report synchronises. | Passed |
| 8 | The report moves to **Submitted** only after the simulated server receipt. | Passed |

Tester sign-off: [name and date to be entered by tester]

## Automated evidence

These checks are run by `npm run check` and `npx playwright test`. They cover the same behaviour
at a lower level. They do not replace the manual test above, which exercised a real laptop going offline
and a closed and reopened browser tab.

| Behaviour | Covered by |
|---|---|
| Report saved to IndexedDB and restored after a database reopen | `tests/integration/reports.test.ts` |
| Completed report is queued and not marked submitted | `tests/integration/reports.test.ts` |
| Nothing is marked submitted while offline | `tests/integration/sync.test.ts` |
| Interrupted send is recovered on restart and retried with the same key | `tests/integration/sync.test.ts` |
| Same report never creates a duplicate on the server (idempotency) | `tests/integration/sync.test.ts` |
| Submitted only after a receipt; validation failure goes to needs attention | `tests/integration/sync.test.ts` |
| Offline app shell loads from the service worker, queued report survives reload, submission only after reconnect | `tests/e2e/offline.spec.ts` |
| Server failure shows SYNC FAILED and keeps the report unsent | `tests/e2e/offline.spec.ts` |

## Known limits of this acceptance

- Tested on Windows and Chrome only. Android Chrome and iOS Safari are **not** covered. Offline behaviour must
  be tested on both before any production deployment.
- The "server" is a simulation in the browser. The receipt is not a real server acknowledgement.
- Browser storage is not a security boundary. Synthetic data only.
- Storage eviction by the browser was not tested.
