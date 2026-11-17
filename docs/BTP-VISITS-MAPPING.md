# BTP Visits Log: current form mapping and proposed mobile workflow

Written for: Railway Mission reviewers, and the developers who will later define the BTP Visits data model.

Status: **documentation only.** No application code, Phase 1 behaviour or form definitions have been changed. Phase 2 has not started.

Prototype status: **SYNTHETIC DATA ONLY.** Examples are invented. No real person's name, station visit or patient detail is used.

---

## 1. Purpose and scope

This document does three things:

1. Records the existing Railway Mission British Transport Police (BTP) Visits Log: its six questions, wording, validation and form-level instruction.
2. Records what the current form does **not** collect, so the mapping does not invent fields.
3. Describes a **proposed** mobile/offline workflow. The proposal is separate from the current form and needs Railway Mission approval before any implementation.

The current form is primarily a **daily activity and visit log**, not an incident report.

Out of scope: code changes, a real backend, authentication, analytics, station administration, map or GPS features, notifications, reporting dashboards, production reference data, and any Phase 2 application change.

## 2. Source and evidence

**Source:** the existing Microsoft Forms BTP Visits Log, as manually reviewed by the project lead. The form contains **six questions**, and the Microsoft Forms editing view shows "Add new question" directly beneath Question 6. No further questions exist in the current form.

**Limits of the evidence:**

- The supplied material shows wording, validation messages and one required marker. It does not show answer choices for Q2 to Q6, or any conditional logic.
- Only Q1 is confirmed as required. Required status for Q2 to Q6 is **To be confirmed**. No question is inferred to be mandatory.
- The form-level instruction is quoted exactly in section 3. It has not been interpreted.

## 3. CURRENT FORM

> **Form-level instruction (current, preserved exactly):**
>
> "If the number is zero, just leave that number blank"
>
> **Important:** the data model must **not** treat a blank numeric answer as equivalent to zero until Railway Mission confirms that blank and zero have exactly the same reporting meaning. See section 9.

### 3.1 Field mapping

| Q | Existing wording (as supplied) | Proposed field ID | Type | Validation (as supplied) | Required | Sensitivity | Notes |
|---|---|---|---|---|---|---|---|
| Q1 | "Date" | `visitDate` | Date | — | **Yes** (asterisk shown on the Microsoft Form) | Low | The only confirmed required question. |
| Q2 | "Number of BTP Stations Visited This Day" | `btpStationVisitCount` | Integer / numeric | "The value must be a number" | To be confirmed | Low | Blank-versus-zero rule applies (section 3.2). Count meaning is not established (section 9). |
| Q3 | "Name of Station/s, if more than one is visited separate list names of stations with a semicolon" | `btpStationNames` | Free text | — | To be confirmed | Low to medium | Multiple names are separated manually with a semicolon. No station list is supplied as an existing requirement. |
| Q4 | "Senior Management Visited: Name and Position (i.e. Director or Superintendent and above)" | `seniorManagementVisited` | Free text | — | To be confirmed | **Potentially personally identifiable** | May contain a person's name and position. See section 6. |
| Q5 | "Number of Home Visits This Day" | `homeVisitCount` | Integer / numeric | "The value must be a number" | To be confirmed | Low | Blank-versus-zero rule applies. No details of individuals are collected. |
| Q6 | "Number of Hospital Visits This Day" | `hospitalVisitCount` | Integer / numeric | "The value must be a number" | To be confirmed | Low | Blank-versus-zero rule applies. No hospital names or patient details are collected. |

### 3.2 Blank numeric values (Q2, Q5, Q6)

The form-level instruction "If the number is zero, just leave that number blank" means that a zero is entered by leaving the field empty. The consequences are:

- A blank value on the current form **may** mean zero. It **may also** mean that the question was not answered. The supplied material does not distinguish the two.
- The proposed data model keeps a **blank** (not answered) distinct from an **explicit zero**. It does not convert blank into zero.
- Whether the future application should allow the user to enter an explicit zero is a question for Railway Mission (section 9, item 3).

### 3.3 What the current form does not collect

For the avoidance of doubt, the current form does **not** collect:

- names, addresses or reasons for any home visit;
- hospital names, patient information or reasons for any hospital visit;
- any station reference code or station dropdown;
- any further details beyond the six questions above.

These are **not** added in this mapping.

### 3.4 Current form summary

1. Date (required)
2. Number of BTP Stations Visited This Day
3. Name of Station/s (semicolon-separated)
4. Senior Management Visited: Name and Position
5. Number of Home Visits This Day
6. Number of Hospital Visits This Day

## 4. Station-visit counts and station names (current form)

The current form asks for a **number** of stations (Q2) and separately for the **names** of those stations (Q3). Q3 asks the user to separate multiple names with a semicolon.

Points to note, all **to be confirmed**:

- Whether Q2 counts **distinct stations** or **total station visits** is not established.
- Whether Q2 and Q3 must agree is not established.
- Whether Q3 is required when Q2 is zero or blank is not established.
- No BTP station reference list is part of the current form. This mapping does not create one.

## 5. Proposed mobile workflow

> **PROPOSED UX CHANGE.** This section is a proposal for discussion. It is **not** the current Railway Mission process. Nothing here may be implemented until Railway Mission approves it.

The current form asks for a count and then a semicolon-separated list of names. The proposal replaces the free-text list with repeatable entries, and keeps the count separate until Railway Mission confirms how it should be derived.

**Step 1: Date**

> "What date was the visit?"
> [date picker]

Maps to `visitDate` (required on the current form).

**Step 2: BTP station visits**

Replace the semicolon-separated text with repeatable station entries:

```
BTP stations visited

Station 1
[station name]

Station 2
[station name]

+ Add another station
```

The application could then derive `btpStationVisitCount` from the number of entries. **This derivation requires Railway Mission confirmation** (section 9, items 4 and 5). It must not be assumed, because we do not yet know whether the count means distinct stations or total visits. For example, if the same BTP station is visited twice in one day, the expected count may be 1 or 2.

Station names remain **free text** in this proposal. No station dropdown or reference catalogue is proposed as an existing requirement. Whether an approved station list should exist is a question for Railway Mission (section 9, item 7).

**Step 3: Senior management**

A potential future Yes/No question, followed by the existing Name and Position field:

> "Did you meet with senior management?"
> ( ) Yes  ( ) No
>
> If Yes: show "Senior Management Visited: Name and Position (i.e. Director or Superintendent and above)"

> **Requires Railway Mission approval.** This Yes/No question does **not** exist in the current form. It is a proposal only.

**Step 4: Other visit counts**

- Home visits (`homeVisitCount`)
- Hospital visits (`hospitalVisitCount`)

Each uses the same blank-versus-zero rule as the current form until Railway Mission confirms the reporting meaning. The explicit-zero option is a question (section 9, item 3).

**Step 5: Review and queue**

```
Date:                    17 November 2026
BTP stations visited:    2 (synthetic example)
Senior management:       None recorded
Home visits:             (blank)
Hospital visits:         (blank)

[ Back ]   [ Save draft ]   [ Complete and queue for sending ]
```

**Offline status message:**

> Saved on this device - waiting for connection

A record must **not** show as Submitted until the simulated, or future, backend has acknowledged it.

## 6. Privacy considerations

**Senior management (Q4) is the main privacy concern.** The field may contain a person's name and position. Name and position together can identify a person. Therefore:

- Do not place the field's contents in URLs, application logs, analytics events, diagnostic messages or sync error messages.
- Do not use a real person's name in synthetic test data. Examples in this document and in the prototype use invented placeholders only.
- Ask for senior-management details only when the chaplain met senior management (proposed Step 3). Do not require the field when the answer is No.
- Consider whether the role can be selected rather than typed. This is a proposal only.

**Home and hospital visit counts (Q5, Q6)** are numbers only. They do not identify individuals. The current form does not collect any detail about them, and this mapping does not add any.

**Station names (Q3)** identify places, not people, but may be combined with the date to show when a chaplain was at a location. Treat them as operational information, not as personal data, and keep them out of logs and analytics in the same way as other free text.

**Data minimisation (proposed, for confirmation):** store only what the form asks for. Do not add patient details, addresses or visit reasons.

## 7. Proposed data model (documented, not implemented)

This structure is for discussion only. It is **not** finalised.

```
BTPVisitLog {
  id
  visitDate
  stationVisits           // see note below
  seniorManagementVisited
  homeVisitCount
  hospitalVisitCount
  createdAt
  updatedAt
  isSynthetic
}
```

Notes:

- `stationVisits` is shown as a single field. Whether it should be a count, a list of entries, or both is not decided (section 9, items 4 to 6). The current form has two separate answers, `btpStationVisitCount` and `btpStationNames`.
- **Blank numeric values must be kept distinguishable from explicit zero values** for `homeVisitCount` and `hospitalVisitCount`, and for any station count, until Railway Mission confirms the reporting semantics. Do not store "not answered" as `0`.
- No field for Q3 names, patient details or visit reasons is added beyond those in the current form.
- `isSynthetic` is true for every record in the prototype.

## 8. Offline requirements

The BTP workflow must preserve the tested Phase 1 offline behaviour. The following acceptance steps are proposed for the future BTP workflow, and each must be tested:

1. Start the BTP log offline.
2. Enter all BTP fields offline.
3. Save draft offline.
4. Persist the record in IndexedDB.
5. Close the browser.
6. Reopen while still offline.
7. Restore the BTP record and all values, including blank numeric fields as blank (not as zero).
8. Edit while offline.
9. Complete the record and add it to the local outbox.
10. Show "Waiting to send".
11. Reconnect.
12. Attempt synchronisation.
13. Mark Submitted only after acknowledgement or receipt from the transport or backend.
14. Ensure that a retry does not create a duplicate submission.

Do not modify the Phase 1 architecture to meet these requirements. If a requirement cannot be met by it, record the gap and stop for review.

## 9. Railway Mission confirmation items

Each item is **open**. None has been assumed.

1. **Are Q2 to Q6 optional?** Not established.
2. **Does blank mean exactly the same as zero for the numeric fields (Q2, Q5, Q6)?** Not established.
3. **Should the future application allow the user to enter an explicit zero?** Not established.
4. **Does the station count (Q2) mean distinct stations or total station visits?** Not established.
5. **If the same BTP station is visited twice in one day, is the count 1 or 2?** Not established.
6. **Should station names (Q3) remain free text?** Proposed as free text. Not confirmed.
7. **Is there an approved BTP station reference list?** Not established. None is assumed.
8. **Can multiple senior managers be recorded (Q4)?** Not established.
9. **Should senior-management name and position become separate fields?** Not established.
10. **Should a Yes/No senior-management question be introduced?** Proposed only. Requires approval.
11. **Should any further information be collected for home visits?** Not established. None is proposed.
12. **Should any further information be collected for hospital visits?** Not established. None is proposed.
13. **Are there maximum daily visit counts?** Not established.
14. **Is Q1 definitely the only mandatory question?** Only Q1 is confirmed as required. Not further established.
15. **Is the same BTP form used by all Railway Mission chaplains?** Not established.

Also to confirm:

- Whether the required marker on Q1 is the only required marker in the live form. The supplied evidence shows only Q1.
- Whether Q3 is expected when Q2 is zero or blank.

## 10. Current form versus proposed UX improvements

| Topic | Current form (existing requirement) | Proposed UX improvement (not in current form) |
|---|---|---|
| Station names | Free text, semicolon-separated (Q3) | Repeatable station entries, each with a name |
| Station count | Separate numeric answer (Q2) | Possibly derived from station entries (requires confirmation) |
| Senior management | Free text Name and Position (Q4) | Preceded by a Yes/No question (requires approval) |
| Home and hospital counts | Numeric, blank means zero, per form instruction (Q5, Q6) | Same rule until confirmed; explicit-zero option is a question |
| Required status | Q1 only (confirmed) | None proposed |
| Save state | Not applicable | "Saved on this device - waiting for connection" |

## 11. Cross-workflow note

The BTP Visits workflow shares some concepts with the Network Rail Visits workflow:

- visit date;
- location or station;
- senior management visited.

**These workflows are not merged in this document.** A shared data model should be considered only after the Support Interaction Form, Network Rail Visits and BTP Visits mappings have all been reviewed. Each workflow keeps its own current-form field IDs for now.

## 12. Explicitly out of scope

- Any code change, including Phase 1.
- A real backend, or any transmission of data outside the browser.
- Authentication or user accounts.
- Analytics.
- Station administration or a station reference catalogue.
- Map, GPS or location detection.
- Notifications.
- Reporting dashboards.
- Production reference data.
- Adding fields not present in the current form, including names, addresses, visit reasons, hospital names and patient information.
- Merging the BTP, Network Rail or Support Interaction workflows.
- Any real person's name or real visit data in examples or in the prototype.
