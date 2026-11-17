# Railway Mission Reporting App: Prototype Architecture Proposal

Written for: the project lead and developers reviewing the design before Phase 1 is built.

Status: **proposal, awaiting approval.** No application code has been written.

All data in this prototype is **synthetic**. No real personal, safeguarding, health or incident data is to be used.

---

## 1. Requirements analysis

### 1.1 What the existing forms tell us

The public forms page (https://www.railwaymission.org/forms/) lists seven items:

| Item | Type | Likely purpose (from name only) |
|---|---|---|
| All Lines Pass Travel Record | Microsoft Forms | Travel record (not in brief) |
| Support Interaction Form (SIF) | Site page | Welfare / pastoral interaction |
| BTP Visits Log | Site page | Visits to British Transport Police |
| Stories of Support | SharePoint page | Probably not a form |
| Network Rail Visits Log | Site page | Network Rail visits |
| TOC Visits Log | Site page | Train operating company visits (not in brief) |
| Accident Report Form | Microsoft Forms | Accidents at work (not in brief) |

Gaps:

- **The page does not show any form fields.** The field list for each form has to come from the actual forms, which we need access to before the Phase 1 data model is final.
- The page contains **no safeguarding or emergency guidance** and no telephone number, only an office email address. The urgent-help content must be supplied by Railway Mission.
- Two items in the existing set (**Accident Report Form**, **TOC Visits Log**, and possibly **All Lines Pass**) are outside the brief. They are listed in section 9 as clarifications.

### 1.2 Functional requirements (from brief)

| ID | Requirement | Notes |
|---|---|---|
| F1 | Mobile-first dashboard with 5 entry points | Report incident, welfare, railway visit, drafts/sync queue, submitted reports |
| F2 | Persistent network status: ONLINE / OFFLINE / SYNCING / SYNC FAILED | Mapped to real signals, see 3.3 |
| F3 | Guided incident workflow, category first | 10 categories; questions change by category |
| F4 | Urgent guidance shown **before** completing high-risk reports | Safeguarding, suicide, fatality, assault |
| F5 | Simplified Network Rail visit workflow | 9 fields |
| F6 | Welfare / pastoral interaction workflow | Not specified in detail in the brief; see 9 |
| F7 | Railway visit workflow | Not specified in detail; see 9 |
| F8 | Full offline create/save/draft | Must work with no connectivity at all |
| F9 | Each report has a client UUID | Used for idempotency |
| F10 | Sync queue with automatic sync on reconnect | Plus manual "send now" |
| F11 | Three distinct states: Saved locally / Waiting to sync / Submitted | "Submitted" only after server acknowledgement |
| F12 | Survives app close and device restart | IndexedDB, not memory |
| F13 | Retry failed syncs safely; no duplicates | Idempotent server contract |
| F14 | Synthetic test data only | Seeded fixtures clearly labelled |

### 1.3 Non-functional requirements

- **Offline first.** Every write goes to local storage first. The network is an optimisation.
- **Speed under stress.** Common path (a straightforward report) in roughly 6 taps plus typing. Large touch targets (minimum 48 px, primary actions 56 px).
- **Accessibility.** WCAG 2.2 AA. Status is never conveyed by colour alone (icon + text + colour). Live-region announcements for sync changes. Respect `prefers-reduced-motion` and text scaling up to 200%.
- **Installable PWA.** Web app manifest, service worker, install prompt where supported.
- **Privacy by design.** Minimal fields, no unnecessary identifiers, no sensitive content in URLs, logs or analytics.
- **Honest status.** The UI must never imply a report is submitted, emergency services have been contacted, or a safeguarding referral has been made, unless the server has confirmed it.

---

## 2. Architecture

### 2.1 Layers

The brief asks for clear separation between authentication, data and UI. The proposed layering:

```
┌──────────────────────────────────────────────────────────┐
│ UI layer        screens, wizard steps, components        │  React, no direct DB or network calls
├──────────────────────────────────────────────────────────┤
│ Feature layer   workflows, category config, validation   │  pure TS, testable without a browser
├──────────────────────────────────────────────────────────┤
│ Domain layer    types, Zod schemas, state machine        │  no framework imports
├──────────────────────────────────────────────────────────┤
│ Data layer      Dexie DB, repositories, outbox           │  owns IndexedDB, nothing else touches it
├──────────────────────────────────────────────────────────┤
│ Sync layer      sync engine, backoff, locks, transport   │  talks to the API via an interface only
├──────────────────────────────────────────────────────────┤
│ Auth layer      session provider, token handling (stub)  │  prototype: synthetic chaplain profiles
├──────────────────────────────────────────────────────────┤
│ API contract    typed client interface                   │  prototype: simulated backend; prod: HTTPS
└──────────────────────────────────────────────────────────┘
```

Rules:

1. Components never import Dexie or `fetch`. They call feature hooks.
2. The sync layer depends on a `SyncTransport` **interface**, not on a URL. The prototype uses `SimulatedTransport`; production swaps in `HttpTransport`.
3. The auth layer exposes a `Session` object. Nothing else reads credentials.
4. Narrative text is never passed to logging functions. A single `safeLog` wrapper strips fields tagged as sensitive, and a lint rule blocks `console.*` in `src/`.

### 2.2 Technology choices

| Concern | Choice | Reason |
|---|---|---|
| Build | Vite | Fast, simple PWA plugin ecosystem |
| UI | React 18 + TypeScript (strict) | Requested |
| PWA | `vite-plugin-pwa` (Workbox) | Precaching the app shell; standard tooling |
| Local DB | Dexie.js over IndexedDB | Requested; typed tables, transactions |
| Validation | Zod | One schema per report type, used for form, DB and API |
| Routing | React Router | Standard, supports nested wizard routes |
| Tests | Vitest + Testing Library; Playwright later | Unit tests for sync logic are the priority |
| Dates | `date-fns` + `date-fns-tz` | Europe/London wall-clock handling |
| IDs | `crypto.randomUUID()` | Built into modern browsers; UUIDv4 |

Deliberately **not** included: Redux or other global state libraries (Dexie + `useLiveQuery` covers reactive data), any analytics or error-tracking SDK (privacy risk), any UI component kit that brings external fonts or CDN assets (keeps the prototype self-contained and avoids third-party requests).

### 2.3 Folder structure

```
railway-mission-reporting-app/
├─ docs/
│  ├─ ARCHITECTURE.md              (this document)
│  ├─ DATA-MODEL.md                (to be extracted from src/domain)
│  └─ SECURITY-PRODUCTION.md       (production requirements checklist)
├─ public/
│  ├─ icons/                       placeholder icons (no official branding)
│  └─ robots.txt                   disallow indexing of the prototype
├─ src/
│  ├─ app/                         bootstrap, router, providers, PWA registration
│  ├─ ui/                          presentational components only
│  │  ├─ primitives/               Button, Chip, ProgressBar, Field, Dialog
│  │  ├─ layout/                   AppShell, TopBar, BottomNav, Wizard frame
│  │  └─ status/                   NetworkBadge, ReportStatusChip, SyncBanner
│  ├─ screens/
│  │  ├─ dashboard/
│  │  ├─ incident/                 category picker, guidance, wizard steps
│  │  ├─ welfare/
│  │  ├─ railway-visit/
│  │  ├─ network-rail-visit/
│  │  ├─ drafts-queue/
│  │  ├─ submitted/
│  │  └─ settings/
│  ├─ features/                    workflow logic per report type
│  │  ├─ incident/
│  │  │  ├─ categoryConfig.ts      category → questions, guidance, flags
│  │  │  ├─ wizardSteps.ts         ordered steps, visibility rules
│  │  │  └─ useIncidentDraft.ts
│  │  ├─ welfare/
│  │  ├─ railway-visit/
│  │  ├─ network-rail-visit/
│  │  └─ reports/                  shared list, filter, status-label logic
│  ├─ domain/
│  │  ├─ types.ts                  entity types (see section 3)
│  │  ├─ schemas.ts                Zod schemas
│  │  ├─ reportStateMachine.ts     pure transition rules
│  │  ├─ labels.ts                 user-facing wording for every state
│  │  └─ ids.ts                    UUID helpers
│  ├─ data/
│  │  ├─ db.ts                     Dexie schema + versioning
│  │  ├─ repositories/             reportRepo, outboxRepo, auditRepo, referenceRepo
│  │  ├─ seed/                     synthetic fixtures (clearly labelled)
│  │  └─ persistence.ts            navigator.storage.persist() request
│  ├─ sync/
│  │  ├─ syncEngine.ts             orchestrates the outbox
│  │  ├─ backoff.ts                retry schedule with jitter
│  │  ├─ triggers.ts               online, visibility, timer, manual
│  │  ├─ lock.ts                   Web Locks wrapper (one runner across tabs)
│  │  ├─ connectivity.ts           derives ONLINE/OFFLINE/SYNCING/FAILED
│  │  ├─ transport/
│  │  │  ├─ SyncTransport.ts       interface
│  │  │  ├─ SimulatedTransport.ts  prototype backend (latency, failures, idempotency)
│  │  │  └─ HttpTransport.ts       stub; not used in prototype
│  │  └─ channel.ts                BroadcastChannel between tabs
│  ├─ auth/
│  │  ├─ SessionProvider.tsx
│  │  ├─ syntheticUsers.ts         fake chaplain profiles, prototype only
│  │  └─ sessionPolicy.ts          offline-window rules (documented, not enforced yet)
│  ├─ lib/
│  │  ├─ safeLog.ts                logging wrapper that refuses sensitive fields
│  │  ├─ sanitise.ts               text normalisation, length limits
│  │  └─ time.ts
│  └─ styles/                      design tokens (CSS variables), global styles
├─ tests/
│  ├─ unit/                        domain, state machine, sync engine, backoff
│  ├─ integration/                 Dexie repositories against fake-indexeddb
│  └─ e2e/                         Playwright: offline → save → reconnect → ack
├─ .env.example                    no secrets; only feature flags
├─ vite.config.ts
├─ tsconfig.json
└─ README.md
```

---

## 3. Data model (TypeScript)

Design principles:

- **One status source of truth.** A report's *sync* status lives only in the `SyncRecord`. The report itself has only `draft | completed`. This avoids the two drifting apart.
- **Reference data is separate** (locations, organisations, categories) and referenced by ID, not copied into every report.
- **Narrative is isolated.** Free-text fields are typed as `Narrative` so they can be excluded from logs, lists and search by type.
- **Minimal identity.** Reports refer to the chaplain by an internal ID. No passenger, member of staff or member of the public is named.
- **Immutable after submission.** Corrections create an amendment record (`Addendum`), never an in-place edit.

### 3.1 Shared primitives

```ts
// src/domain/types.ts

export type UUID = string;            // crypto.randomUUID(), v4
export type ISODate = string;         // 'YYYY-MM-DD' (Europe/London)
export type TimeOfDay = string;       // 'HH:mm' (Europe/London), optional
export type ISOInstant = string;      // full UTC timestamp, for audit and sync

/** Free text entered by a chaplain. Never logged, never shown in lists. */
export type Narrative = { readonly __brand: 'narrative'; text: string };

export type ReportKind = 'incident' | 'welfare' | 'railway_visit' | 'network_rail_visit';

export type ReportDraftState = 'draft' | 'completed';

export interface ReportBase {
  id: UUID;                 // client-generated; the idempotency key for the whole lifecycle
  kind: ReportKind;
  schemaVersion: number;    // for future migrations of the payload
  revision: number;         // incremented on every local edit
  state: ReportDraftState;
  reporterId: UUID;         // internal chaplain ID, never a name
  createdAt: ISOInstant;
  updatedAt: ISOInstant;
  completedAt?: ISOInstant;
}
```

### 3.2 Reference data

```ts
export interface Location {
  id: UUID;
  name: string;                           // synthetic in prototype
  type: 'station' | 'depot' | 'train' | 'staff_area' | 'signal_box' | 'other';
  stationCode?: string;                   // e.g. 3-letter code; synthetic values only
  region?: string;
  active: boolean;
  refVersion: number;
}

export interface Organisation {
  id: UUID;
  code: OrganisationCode;                 // e.g. 'BTP', 'NR', 'TOC', 'EMERGENCY', 'OTHER'
  name: string;
  refVersion: number;
}

export type OrganisationCode =
  | 'BTP' | 'NETWORK_RAIL' | 'TOC' | 'AMBULANCE' | 'POLICE_999' | 'SAMARITANS'
  | 'MEDICAL' | 'EMPLOYER' | 'OTHER';

export type IncidentCategoryCode =
  | 'welfare_interaction'
  | 'safeguarding_concern'
  | 'suicide_or_attempt'
  | 'fatality'
  | 'btp_related'
  | 'assault_or_threat'
  | 'staff_trauma'
  | 'public_distress'
  | 'network_rail_visit'   // redirects to NR workflow; see clarification C2
  | 'other';

export type UrgencyLevel = 'standard' | 'urgent_guidance' | 'emergency_first';
```

### 3.3 Report types

```ts
export interface Incident extends ReportBase {
  kind: 'incident';
  category: IncidentCategoryCode;
  urgency: UrgencyLevel;                  // derived from category config, stored for audit
  occurredOn: ISODate;
  approxTime?: TimeOfDay;                 // optional; many reports are approximate
  locationId?: UUID;                      // preferred
  locationText?: string;                  // fallback if not in reference list
  description: Narrative;                 // brief description, max 1,000 chars
  actionsTaken: ActionTakenCode[];
  actionNotes?: Narrative;
  referralIds: UUID[];                    // -> Referral[]
  followUp: FollowUp;
  notes?: Narrative;
  urgentGuidanceAcknowledged?: ISOInstant;// timestamp shown before completion
}

export type ActionTakenCode =
  | 'listened' | 'signposted' | 'accompanied' | 'first_aid'
  | 'called_emergency' | 'called_btp' | 'contacted_employer'
  | 'referred_on' | 'no_action' | 'other';

export interface Welfare extends ReportBase {
  kind: 'welfare';
  occurredOn: ISODate;
  locationId?: UUID;
  locationText?: string;
  interactionType: 'conversation' | 'practical_support' | 'signposting' | 'other';
  numberOfPeople: 1 | 2 | 3 | 4 | 5 | 'more_than_5';   // counts only, no identities
  themes: WelfareThemeCode[];
  supportProvided: Narrative;             // free text, optional
  followUp: FollowUp;
  notes?: Narrative;
}

export type WelfareThemeCode =
  | 'workload' | 'bereavement' | 'health' | 'housing' | 'money'
  | 'relationships' | 'work_pressure' | 'other';  // themes only, never diagnoses

export interface RailwayVisit extends ReportBase {
  kind: 'railway_visit';
  date: ISODate;
  locationId?: UUID;
  locationText?: string;
  visitPurpose: 'station_presence' | 'train_journey' | 'staff_area' | 'other';
  durationMinutes?: number;
  numberOfEngagements?: number;           // counts only
  notes?: Narrative;
}

export interface NetworkRailVisit extends ReportBase {
  kind: 'network_rail_visit';
  chaplainId: UUID;                       // the reporter; kept explicit for the NR form
  date: ISODate;
  locationId?: UUID;
  locationText?: string;
  visitType: 'site_visit' | 'meeting' | 'briefing' | 'training' | 'other';
  numberOfEngagements: number;
  generalThemes: WelfareThemeCode[];
  supportProvided: SupportCode[];
  followUp: FollowUp;
  notes?: Narrative;
}

export type SupportCode = 'listening' | 'signposting' | 'practical' | 'referral' | 'other';

export type Report = Incident | Welfare | RailwayVisit | NetworkRailVisit;
```

### 3.4 Sub-entities

```ts
export interface Referral {
  id: UUID;
  reportId: UUID;                         // back-link
  organisation: OrganisationCode;
  contactedAt?: TimeOfDay;
  outcome?: 'contacted' | 'no_answer' | 'referred_on' | 'unknown';
  // Deliberately no contact name, number or email: not needed for this report.
}

export interface FollowUp {
  required: boolean;
  ownerRole?: 'reporting_chaplain' | 'chaplaincy_lead' | 'safeguarding_lead' | 'other';
  ownerNote?: string;                     // role-level text only, no personal names
  dueBy?: ISODate;
  status: 'open' | 'closed' | 'not_required';
}

export interface Attachment {
  // Modelled for the production design; NOT implemented in the prototype.
  id: UUID;
  reportId: UUID;
  mimeType: string;
  byteSize: number;
  sha256: string;
  storageRef: string;                     // server-side reference; never a public URL
  status: 'pending_upload' | 'uploaded' | 'rejected';
}
```

Attachments are excluded from the prototype because photographs and documents are a major source of accidental personal data. They should only be added after a production decision on retention and redaction.

### 3.5 Sync and audit

```ts
export type SyncState =
  | 'saved_locally'      // draft or completed but not queued (not yet submitted)
  | 'waiting_to_sync'    // queued; no attempt yet, or waiting for backoff/connectivity
  | 'sending'            // request in flight
  | 'retry_scheduled'    // last attempt failed for a retryable reason
  | 'needs_attention'    // server rejected it permanently (validation etc.)
  | 'submitted';         // server acknowledged with a receipt. The ONLY "submitted" state.

export interface SyncRecord {
  clientId: UUID;                         // == report.id; primary key; unique
  reportId: UUID;
  revision: number;                       // the revision this record was queued for
  payloadHash: string;                    // SHA-256 of the canonical payload at queue time
  state: SyncState;
  attempts: number;
  nextAttemptAt?: ISOInstant;
  lastAttemptAt?: ISOInstant;
  lastErrorCode?: SyncErrorCode;          // enumerated codes only, no messages from server
  serverReceiptId?: string;               // issued by server on acknowledgement
  acknowledgedAt?: ISOInstant;
  createdAt: ISOInstant;
}

export type SyncErrorCode =
  | 'NETWORK' | 'TIMEOUT' | 'SERVER_5XX' | 'RATE_LIMITED'
  | 'AUTH_EXPIRED' | 'VALIDATION_REJECTED' | 'CONFLICT' | 'UNKNOWN';

export interface AuditEvent {
  // Local, device-side only. The server holds the authoritative audit trail.
  id: UUID;
  at: ISOInstant;
  reporterId: UUID;
  reportId?: UUID;
  action:
    | 'draft_created' | 'draft_saved' | 'report_completed' | 'queued'
    | 'send_attempted' | 'acknowledged' | 'send_failed' | 'marked_needs_attention'
    | 'local_narrative_purged';
  detail?: { code?: string; attempt?: number };  // NEVER narrative text
}
```

### 3.6 Dexie schema (sketch)

```ts
// src/data/db.ts
this.version(1).stores({
  reports:     'id, kind, state, reporterId, occurredOn, updatedAt',
  referrals:   'id, reportId, organisation',
  locations:   'id, type, active',
  organisations: 'id, code',
  syncRecords: 'clientId, reportId, state, nextAttemptAt',  // outbox
  auditEvents: 'id, at, reportId',
});
```

Notes on the schema:

- `syncRecords.clientId` is the outbox primary key. Queuing the same report twice is a no-op at the database level.
- Report writes and outbox writes happen in **one Dexie transaction**, so the device can never hold a queued item without its report, or the reverse.

---

## 4. Offline and sync design

### 4.1 Core principle

> A report is only **submitted** when the server has returned a receipt for its `clientId`. Everything before that is **saved on this device**, including items queued for sending.

### 4.2 Lifecycle

```
           create             complete (Save & send)
  [new] ──────────► draft ─────────────────────────► queued (waiting_to_sync)
                      ▲                                   │
                      │ edit (revision++)                 │ engine picks up
                      │                                   ▼
                      │                              sending (in flight)
                      │                             ┌─────┴────────────┐
                      │                     2xx + receipt          retryable error
                      │                             │                  │
                      │                             ▼                  ▼
                      │                       submitted           retry_scheduled ──┐
                      │                        (final)                 ▲            │ backoff elapses
                      │                                                └────────────┘
                      │                     4xx validation
                      │                             │
                      │                             ▼
                      └──────────── (user edits) needs_attention
```

Rules:

1. **Editing a report that is queued or in retry** does not change the queued payload. It creates a new `revision`, and the user must "send again" for the change to be queued. This prevents a half-edited record being sent by accident.
2. **Editing a `needs_attention` report** resets it to `waiting_to_sync` with a new revision.
3. **`submitted` is final.** Corrections create an `Addendum` that is queued as its own record.

### 4.3 Idempotency contract (client ↔ server)

Every write request carries:

```
POST /api/v1/reports
Idempotency-Key: <clientId>            # the report UUID
Content-Type: application/json

{
  "clientId": "<uuid>",
  "kind": "incident",
  "revision": 3,
  "schemaVersion": 1,
  "payloadHash": "<sha256>",
  "payload": { ... }
}
```

Server behaviour the client depends on:

| Case | Server returns | Client does |
|---|---|---|
| New `clientId` | `201` + `receiptId` | → `submitted`, store receipt |
| Same `clientId`, same `payloadHash` (retry after lost response) | `200` + original `receiptId` | → `submitted` (not a duplicate) |
| Same `clientId`, **different** `payloadHash` | `409 CONFLICT` | → `needs_attention` with `CONFLICT`; never overwrite |
| Invalid payload | `422` with field codes | → `needs_attention` with `VALIDATION_REJECTED` |
| Network timeout / no response | none | → `retry_scheduled`; **same** `clientId` on retry |
| `5xx`, `429` | error | → `retry_scheduled` with backoff |
| `401/403` | error | → pause sync; prompt re-authentication; keep queue intact |

Why the client sends the same `clientId` on retry: if the first request reached the server but the response was lost, a retry with the same key returns the existing receipt rather than creating a second report.

Duplicate protection layers:

1. UI disables the submit button after the first tap.
2. Outbox primary key on `clientId` (one queue entry per report).
3. Server idempotency on `clientId` (unique constraint).
4. Payload hash comparison to detect a changed body under an old key.

### 4.4 Sync engine

```ts
// Simplified contract
interface SyncEngine {
  start(): void;                          // attach triggers
  stop(): void;
  runOnce(reason: SyncTriggerReason): Promise<void>;
  status$: Observable<EngineStatus>;      // drives the UI badge
}

type SyncTriggerReason = 'app_start' | 'came_online' | 'visible' | 'timer' | 'after_save' | 'manual';
```

Engine behaviour:

1. **Single runner.** `navigator.locks.request('rm-sync', ...)` ensures only one tab sends at a time. Where Web Locks is unavailable, fall back to a localStorage lease with an expiry (no report data in storage, only a timestamp token).
2. **Process in creation order** (`createdAt`), one at a time. Simple and predictable; ordering matters for amendments.
3. **Atomic claim.** Before sending, the engine transitions `waiting_to_sync → sending` in a Dexie transaction. If the app dies mid-send, a stale `sending` record older than a timeout is returned to `retry_scheduled` on next start. Because of the idempotency key, re-sending is safe.
4. **Backoff** with full jitter: `delay = random(0, min(cap, base × 2^attempts))`, with `base = 5 s`, `cap = 10 min`. Retryable errors retry indefinitely; the queue never silently gives up.
5. **Stop on auth failure.** `401/403` halts the whole queue. Nothing is discarded.
6. **Never drop data.** There is no automatic delete of queued reports. Only the user can discard a draft, and only if it is not queued.

### 4.5 Triggers

| Trigger | Source | Notes |
|---|---|---|
| App start | Engine boot | Recovers reports left after close or restart |
| Came online | `window` `online` event | Treated as a *hint* only |
| Visible | `visibilitychange` | Catches phones waking up |
| Timer | 30 s while queue non-empty and online | Stops when queue empty |
| After save | Repository write hook | Sends immediately if online |
| Manual | "Send now" button | Resets backoff for that item only |

Background Sync API is **not** relied upon: it is not supported in Safari/iOS.

### 4.6 Connectivity: deriving the four indicators

`navigator.onLine` is unreliable. It reports `true` on a connected-but-dead network, such as a train Wi-Fi captive portal. The indicator is derived from several signals:

```
if (!navigator.onLine)                          → OFFLINE
else if (engine.isSending)                      → SYNCING
else if (queueHasItem && lastOutcome=failed)    → SYNC FAILED
else if (lastHeartbeatOk || lastOutcome=ok)     → ONLINE
else                                            → OFFLINE   (browser says online, nothing works)
```

- The heartbeat is a small `GET /api/v1/health` with a 5 s timeout, run every 60 s, and immediately after any `online` event. It returns no data and is not cached.
- In the prototype, `SimulatedTransport` can be set to "online", "offline", "flaky" or "failing" from Settings so the states can be demonstrated.

### 4.7 Wording: what the user sees

| Internal state | Badge text | Icon | Where it appears |
|---|---|---|---|
| `saved_locally` (draft) | Saved on this device | Device | Drafts |
| `saved_locally` (completed, not queued) | Saved on this device | Device | Drafts |
| `waiting_to_sync` | Waiting to send | Clock | Queue |
| `sending` | Sending… | Arrows | Queue |
| `retry_scheduled` | Not sent yet. Will retry | Warning | Queue |
| `needs_attention` | Needs attention | Alert | Queue, dashboard badge |
| `submitted` | Submitted. Confirmed by server at [time] | Tick | Submitted list |

The dashboard shows a count of unsent reports ("3 reports not yet sent") whenever the count is above zero, whatever the network state.

### 4.8 Persistence and device restart

- Dexie writes to IndexedDB, which survives app close and device restart.
- `navigator.storage.persist()` is requested on first use to reduce eviction risk. It may be refused, and the UI must not depend on it.
- The app reads the outbox on boot and resumes automatically.
- **Known limitation to test on real devices:** Safari/iOS can delete website storage for sites not visited for an extended period, and stored data can be evicted under storage pressure. Mitigation: install prompt, a visible "unsent reports" count, and advice to sync before the device is put away. This must be verified on target devices before anything is said to Railway Mission about reliability.

### 4.9 Multi-tab and conflict handling

- Dexie `liveQuery` keeps all open screens in sync within a tab.
- A `BroadcastChannel('rm-sync')` notifies other tabs of changes.
- Because only one runner sends at a time and reports are single-author, true data conflicts are rare. The server still returns `409` for a changed payload under an existing key, and the client surfaces it as `needs_attention`.
- Reference data (locations, organisations) carries a `refVersion`. Each report stores the version it used, so later reference changes do not silently alter old reports.

### 4.10 Local data retention (prototype and production)

Proposed rule (clarification C6):

- **Before acknowledgement:** full local copy kept (required for offline safety).
- **After `submitted`:** the narrative fields are removed from the local copy, leaving only a summary (kind, date, category, state, receipt ID). This limits the local exposure on a lost device.
- Prototype: this rule is implemented behind a setting so it can be demonstrated either way.

---

## 5. Screens and navigation

### 5.1 Navigation model

- **Bottom navigation** on the main screens: Home · Unsent · Submitted · Settings.
- **Full-screen wizards** with no bottom navigation, to reduce distraction and accidental exits. They have a top bar with **Close** (to draft-saving prompt) and a progress indicator.
- **Persistent Urgent help** entry on Home and in the top bar of every wizard. It opens the emergency guidance and is never hidden behind a menu.

Route map:

```
/                         Home (dashboard)
/incident/new             Category picker
/incident/:id/guidance    Urgent guidance (shown when category requires it)
/incident/:id/step/:n     Wizard steps (1–6)
/incident/:id/review      Review and complete
/welfare/new              Welfare wizard (single short flow)
/railway-visit/new        Railway visit wizard
/nr-visit/new             Network Rail visit (single screen, 9 fields)
/:kind/:id                Draft editor (resumes at last step)
/unsent                   Drafts and sync queue
/submitted                Submitted reports (read-only)
/submitted/:id            Read-only detail with receipt
/settings                 Sync status, storage, demo mode, sign-out
/help/urgent              Urgent guidance (always reachable)
```

### 5.2 Screen specifications

**S1 Home (dashboard)**

- Top: network badge (ONLINE / OFFLINE / SYNCING / SYNC FAILED) with icon and text, and a line such as "3 reports not yet sent".
- Five large tiles in the requested order: Report an incident · Record a welfare interaction · Record a railway visit · My drafts / waiting to send · Submitted reports.
- Network Rail visit is reachable from the railway-visit tile as a choice, or as a sixth tile (clarification C3).
- Persistent "Urgent help" button at the top, always visible.
- A small banner: "DEMO: synthetic data only" (removed in production).

**S2 Category picker**

- 10 large buttons in a single column, each with a plain label and one-line description.
- Categories marked urgent carry a small icon and text "Guidance first".
- Selecting a category leads to guidance (if required) or directly to step 1.

**S3 Urgent guidance (interstitial)**

- Shown before any form for: safeguarding concern, suicide or attempted suicide, fatality, assault or threat.
- Content comes from a `guidance.ts` reference file that Railway Mission must approve. Placeholders only until then.
- Standard text, to be confirmed: "If someone is in immediate danger, or you think they might be, call 999 now. If you are at a railway station or on a train, tell the nearest member of railway staff or British Transport Police." Telephone numbers for BTP and the Railway Mission escalation contact are **placeholders until supplied**.
- Button: "I have read this" (records `urgentGuidanceAcknowledged`). A separate "Back" button.
- Text states: "This form does not replace calling emergency services, British Transport Police or the Railway Mission escalation contact."

**S4 Incident wizard (six steps)**

Progress bar with "Step 2 of 6" and a label. Back, Next and Save draft always visible in a fixed footer.

| Step | Content | Conditional logic |
|---|---|---|
| 1 When and where | Date (default today), approximate time (optional), location search from reference list, or "Other location" text | Station shown only for station-type locations |
| 2 What happened | Brief description (max 1,000 chars); character counter appears near limit | Heading and prompt text vary by category |
| 3 What was done | Action chips (multi-select); action notes | "Called emergency" or "Called BTP" reveals a time field |
| 4 Who was contacted | Organisation chips; per-organisation time and outcome | Only organisations relevant to the category are shown first, "Other" expands |
| 5 Follow-up | Yes / No / Not sure; owner role; due date | Owner and due date only if Yes |
| 6 Review and complete | Read-only summary; "Save and send" and "Save as draft" | Narrative shown here only, with sensitivity note |

Fields **not collected** in any step: names of passengers, members of the public or staff; addresses; contact details; dates of birth; health diagnoses; train or vehicle identifiers. (To be confirmed in clarification C4.)

**S5 Welfare interaction (single flow, three short steps)**

1. Date, location, interaction type, number of people (count bands only).
2. Themes (multi-select), support provided (brief).
3. Follow-up and review.

**S6 Railway visit**

Single screen plus follow-up: date, location, purpose, duration, number of engagements, notes.

**S7 Network Rail visit (single screen, nine fields)**

Chaplain (pre-filled, read-only) · Date · Location · Type of visit · Number of engagements (stepper) · General themes (chips) · Support provided (chips) · Follow-up required (toggle) · Notes (optional).

Save button is at the bottom, large, with the status line "Saved on this device" changing to "Waiting to send" once queued.

**S8 Unsent (drafts and sync queue)**

- Sections: Drafts · Waiting to send · Not sent yet · Needs attention.
- Each card: type, date, category, status chip, and time last changed. **No narrative text in the card.**
- Actions per card: Open, Send now (if queued or retry), Discard (drafts only, with confirmation).
- Top: sync summary and a "Send all now" button when online.

**S9 Submitted**

- Read-only list: type, date, category, "Submitted", and server receipt time.
- Detail page shows the receipt ID and confirmation time. Narrative shown here only, with an explicit "Show details" tap.

**S10 Settings**

- Network and sync status, last successful contact time, number of unsent reports.
- Demo mode: simulate online, offline, flaky, failing (prototype only).
- Storage: whether persistent storage was granted.
- Local retention setting (clarification C6).
- Sign out. If unsent reports exist, the user is warned that signing out will not delete them, and that they will be sent after the next sign-in.
- Version number and "Synthetic data only" notice.

### 5.3 Accessibility and stress-use details

- Primary action per screen is one large button. Secondary actions are plain text buttons, never adjacent in the same visual weight.
- Errors appear beside the field and in a summary at the top of the screen, with focus moved to the summary.
- Save confirmations use a live region: "Saved on this device".
- Dates use a native picker with a text fallback. Times use 24-hour `HH:mm`.
- No time-outs on forms. Drafts autosave every 3 seconds after the last keystroke.
- No modal dialogs on the path of a time-critical action; the urgent guidance is a full page, not a popup.

---

## 6. MVP scope

### 6.1 In the MVP (Phase 1 to Phase 3)

**Phase 1 (on approval): foundations**
- Vite + React + TypeScript + PWA shell, installable, offline app-shell load.
- Mobile navigation, dashboard (S1), Unsent screen skeleton (S8).
- Dexie database with the schema in section 3; repositories; synthetic seed data (locations, organisations, example reports, all labelled "SYNTHETIC").
- Offline indicator (derived status, section 4.6).
- Draft saving with autosave; drafts persist across reload and restart.

**Phase 2: reporting workflows**
- Incident wizard (S2–S4, S3 guidance) with category config for all 10 categories.
- Network Rail visit (S7).
- Welfare and railway-visit flows (S5, S6), using provisional fields until confirmed.
- Validation with Zod; review screen.

**Phase 3: sync**
- Outbox, state machine, sync engine, backoff, triggers, Web Locks.
- `SimulatedTransport` with idempotency semantics, and demo controls in Settings.
- Submitted list (S9) driven only by acknowledged receipts.
- Unit tests for state machine, backoff and duplicate prevention; integration tests for interrupted send.

### 6.2 Explicitly out of the MVP

- Real backend, database, hosting or authentication.
- Real user accounts, passwords, or any production identity provider.
- Attachments and photographs.
- Encryption of local database beyond browser defaults (see section 7).
- Analytics, crash reporting, third-party scripts or fonts.
- Export to PDF, email or the existing forms.
- Admin, reporting dashboards, or any cross-chaplain view.
- Push notifications.
- Accident Report Form, TOC Visits Log, All Lines Pass (pending C1).

---

## 7. Security and privacy

Honest framing for the prototype: **browser storage is not a security boundary.** Anything in IndexedDB can be read by anyone with access to the unlocked device or browser profile. The prototype is therefore restricted to synthetic data, and the UI carries a visible "DEMO: synthetic data only" notice.

### 7.1 Risks in the prototype (and the mitigation chosen)

| # | Risk | Likelihood / impact | Prototype mitigation | Production requirement |
|---|---|---|---|---|
| R1 | Real personal or safeguarding data entered by mistake | High / High | Synthetic banner; no real-data use agreed; warning text in narrative fields | Data handling policy; training; DPIA before live use |
| R2 | Narrative text leaks via logs, errors or analytics | Medium / High | `safeLog` wrapper; lint rule banning `console.*` in `src/`; no analytics SDK | Central logging policy with field-level redaction; log retention limits |
| R3 | Sensitive content in URLs, history or referrer | Medium / High | IDs only in routes; no query strings with content | Same; plus strict referrer policy |
| R4 | Lost or stolen device exposes unsent reports | Medium / High | Not solved in prototype; documented | Managed devices, full-disk encryption, app lock (PIN or biometric), remote wipe |
| R5 | Shared or unlocked device | Medium / High | Sign-out clears session, not data | Idle timeout; re-authentication for opening narrative |
| R6 | Local copies persist after submission | High / Medium | Retention rule (C6) implemented behind a setting | Retention schedule enforced in both client and server |
| R7 | Third-party scripts or CDNs leak data | Low / High | No third-party requests; fonts self-hosted | Content Security Policy; subresource integrity; supply-chain review |
| R8 | XSS through narrative rendering | Low / High | React escaping; no `dangerouslySetInnerHTML`; text length limits | Strict CSP; output encoding review; penetration test |
| R9 | Service worker caches personal data | Medium / High | Workbox config precaches the **app shell only**; `/api/*` is `NetworkOnly` and never cached | Same; plus cache-clear on sign-out |
| R10 | Duplicate or lost reports | Medium / Medium | Idempotency design (section 4.3); no auto-discard | Server-side audit trail and reconciliation report |
| R11 | Stale credentials cause silent data loss | Medium / High | Auth failure pauses queue; nothing deleted | Defined offline session window (see 7.3) |
| R12 | Dependency vulnerabilities | Medium / Medium | Small dependency list; lockfile committed; `npm audit` in CI | Dependency policy, SBOM, automated updates |
| R13 | Misleading status ("submitted" before server confirms) | Medium / High (safeguarding) | Only server receipt yields "Submitted" (section 4.1) | Same; plus UI tests asserting no false success |
| R14 | Urgent guidance missing or wrong | Medium / High | Interstitial before form; placeholder content flagged | Content approved by Railway Mission safeguarding lead; version-controlled |
| R15 | Wrong emergency numbers | Low / High | Numbers not hard-coded until supplied | Verified contacts; review date |
| R16 | Data sovereignty and processor status | — | Not applicable (no backend) | UK-hosted processing; Art. 28 processor contract |

### 7.2 Input handling

- Zod schemas validate every form on the client and are re-validated on the server.
- Text is trimmed, control characters removed, Unicode normalised, and length limited per field.
- Numbers are bounded (e.g., engagements 0–999).
- Dates must be real calendar dates, not in the far future, and checked against the occurrence rule.
- IDs are v4 UUIDs; route parameters are validated before any lookup.

### 7.3 Authentication (prototype and production)

Prototype: a switcher between three synthetic chaplain profiles. No password, no token. Clearly labelled as demo.

Production (to be designed, not built now):

- Railway Mission identity provider (for example Microsoft Entra ID, if it is their tenant; to be confirmed).
- OIDC authorisation code flow with PKCE. No tokens in `localStorage`.
- Session held in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie via a backend-for-frontend, or a short-lived access token in memory.
- Offline window: a cached session may be used to **save** reports for a defined period (proposed: 12 hours) after last successful re-authentication. Sending requires a valid session. Expiry blocks sending, never deletes.

### 7.4 Production security checklist (for later)

Recorded here so it is not forgotten; none of this is in the prototype.

- Data protection impact assessment (DPIA) completed before any live data.
- Confirmed lawful basis and special-category condition under UK GDPR Art. 9 for health and welfare data, and Art. 10 handling where criminal offence data may arise (for example BTP-related incidents).
- Data processor agreement, UK data residency.
- Role-based access control: chaplain, chaplaincy lead, safeguarding lead, administrator, auditor.
- Encryption at rest on the server; TLS 1.2+ in transit.
- Field-level encryption for narrative fields, with key management outside the application.
- Server-side audit log of every create, view, amend, export and delete.
- Retention schedule and automated deletion, agreed with Railway Mission.
- Subject access and rectification process.
- Managed devices with encryption, app lock and remote wipe.
- Content Security Policy, HSTS, strict referrer policy.
- Penetration test and threat model before pilot.
- Incident response plan, including what to do if a device with unsent reports is lost.
- Accessibility audit against WCAG 2.2 AA with users.

### 7.5 Things the app must never do

- Imply that submitting the form replaces a 999 call, a BTP report, or the escalation contact.
- Show "Submitted" without a server receipt.
- Delete a queued report automatically.
- Send narrative in a URL, query string, log line or analytics event.
- Store credentials or API keys in frontend code.

---

## 8. Phase 1 deliverables (on approval)

To be built only after approval of this document:

1. Vite + React + TypeScript + `vite-plugin-pwa` project, strict TypeScript, ESLint with the `console` rule, Prettier.
2. Installable PWA manifest with placeholder icons (no official branding).
3. App shell offline test: load once online, then reload offline.
4. Bottom navigation and screens S1, S2 (shell), S8 (skeleton), S10 (basic).
5. Dexie database v1 with the schema in 3.6.
6. Repositories for reports and outbox (create, read, autosave update).
7. Synthetic seed: 5 locations, 7 organisations, 3 draft reports, 2 submitted reports, all tagged `synthetic: true`.
8. Network badge reading derived state (section 4.6), using only browser signals for now.
9. Autosaving draft for one incident step to prove the pattern.
10. Unit tests: Dexie repository round trip; status derivation.

---

## 9. Clarifications needed

Ordered by how much they change the design.

| # | Question | Why it matters | Our assumption until answered |
|---|---|---|---|
| C1 | Which forms are in scope? The current forms list also includes **Accident Report Form**, **TOC Visits Log**, **All Lines Pass Travel Record**, **BTP Visits Log** and **Support Interaction Form**. | Changes the data model and category list | Accident Report, TOC and All Lines out of scope; SIF = welfare; BTP Visits Log treated as a railway visit variant |
| C2 | Is "Network Rail visit" an incident category, a separate report type, or both? | Two places to record the same thing | Separate report type; the incident category redirects to it |
| C3 | Should Network Rail visits sit on the dashboard as a separate tile? | Five tiles versus six | Reached from the railway-visit tile as a choice |
| C4 | Please provide the **actual field lists** for SIF, BTP Visits Log and Network Rail Visits Log. The public page shows none. | Field-level design of all workflows | Fields in the brief used as the baseline |
| C5 | What **urgent guidance text** and **emergency / escalation contacts** should appear? Who approves them? | Safety-critical content | Placeholders; no numbers invented |
| C6 | How long should a **completed report be kept on the device** after the server confirms it? Keep the narrative, or remove it? | Largest privacy decision on a shared or lost device | Remove narrative after confirmation; keep a summary |
| C7 | Will chaplains use **personal or Railway Mission-managed** devices? | Determines device controls, app lock and wipe | Assumed managed devices in production |
| C8 | Is there an existing backend or preferred platform (for example Microsoft 365 / Power Platform / Azure)? Where will the data be hosted? | Shapes the Phase 4 transport and security design | Not decided; prototype has no backend |
| C9 | Who are the **users of follow-up** (roles) and should they see reports? | Access-control model | Chaplain, chaplaincy lead, safeguarding lead |
| C10 | Brand assets, colours and fonts: can Railway Mission provide the confirmed set? | Branding must not be invented | Neutral placeholder palette, labelled as such |
| C11 | Acceptable **offline session window** and idle-timeout values. | Security versus usability on trains | 12 h offline; 5 min idle lock for narrative views |
| C12 | Is the prototype to be shown on **iOS**, **Android**, or both? | Storage eviction and install behaviour differ | Test on both before the demo |
| C13 | Is a **local retention** change (C6) acceptable for the demo, or should the full narrative stay on the device? | Affects what the demo shows | Setting available; default = remove after confirmation |

---

## 10. Next step

Please confirm or amend:

1. The architecture in section 2 and the folder structure in 2.3.
2. The data model in section 3, particularly the separation of `SyncRecord` from `ReportBase`.
3. The sync design in section 4, especially: "Submitted" only after server receipt, and the idempotency contract.
4. The screens in section 5.
5. The MVP scope in section 6.
6. Answers to C1, C4, C5, C6 and C12 in particular. The rest can use the assumptions shown.

On approval, Phase 1 begins with the deliverables in section 8.
