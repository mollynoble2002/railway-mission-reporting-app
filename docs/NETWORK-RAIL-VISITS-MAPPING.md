# Network Rail Visits: current form mapping and proposed mobile workflow

Written for: Railway Mission reviewers, and the developers who will later define the Network Rail Visits data model and reference data.

Status: **documentation only.** No application code, Phase 1 behaviour or form definitions have been changed. Phase 2 has not started.

Prototype status: **SYNTHETIC DATA ONLY.** Examples in this document are invented. No real person's name is used in any example.

---

## 1. Purpose and scope

This document does three things:

1. Records the current Railway Mission Network Rail Visits form as evidence: its questions, wording, categories and location values.
2. Proposes a reference-data model for Network Rail locations, which keeps the visit-frequency categories.
3. Separately describes a **proposed** simplified mobile workflow. That workflow is a UX proposal, not the current Railway Mission process.

Out of scope: code changes, a real backend, authentication, analytics, location administration, map or GPS features, automatic location detection, notifications, reporting dashboards, production reference data, and any Phase 2 change to the application.

## 2. Source and evidence limitations

**Source document:** `DXC one chaplains Network Rail Visits.pdf`. The copy reviewed is in the project folder. Byte-identical copies exist in the OneDrive "RM DATA" and "Copilot Chat Files" folders.

**What the source is:** a four-page export of a Microsoft Forms "Responses Overview". It is an image-only (scanned) PDF with no text layer. The scan contains the question headings, response charts and word clouds for Q1 to Q8. The page-by-page layout could not be reliably mapped, so this document refers to questions rather than pages.

**Limitations of the evidence:**

- Values were read from the scanned images. Small text, such as the Category E list, may have been misread. Every value in section 5 should be checked against the live form before production.
- The source shows **response counts** for each value. It does not show the form definition itself: question types, required status, validation or conditional logic. Those are marked "To be confirmed" below.
- The overview was taken from the title "Log of Visits - Network Rail: John Roe". See section 12, item 9.
- The word clouds on page 3 and page 4 show individual names for the senior-management question and free-text location answers. They are **not reproduced** in this document.
- The word cloud headed by "Apex House" does not show its question number on the scan. Its position relative to the Q8 heading is unclear, so it is **not** assigned to Q8 in this document. Railway Mission must confirm which question it belongs to.

**Response counts from the source (for context, not for the application):**

| Question | Responses in source |
|---|---|
| Q1 Date of Visits | 598 |
| Q2 Senior Management Visited | 9 |
| Q3 Category A (location chart) | 399 across two values |
| Q4 Category B | 323 across five values |
| Q5 Category C | 52 |
| Q6 Category D | 6 |
| Q7 Category E | 182 across 30 values |
| Q8 Other locations not listed | 78 |

The combined response counts across Categories A-E appear to exceed the 598 overall form responses. This may indicate that a submission can contain selections across multiple location categories, but the supplied source does not establish the underlying Microsoft Forms selection rules. Railway Mission should confirm this. See section 12, item 2.

## 3. Current form field mapping

Legend for the table:

- **Verification status:** "Seen in source" means the question and its values were read from the scan. "To be confirmed" means the source does not show it.
- **Sensitivity:** how the answer should be handled, not a legal classification.

| Q | Existing wording (as in source) | Proposed field ID / relationship | Data type | Current values | Required / optional | Conditional logic | Sensitivity | Verification status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Q1 | "Date of Visits" | `visitDate` | Date | — | To be confirmed | None evidenced | Low | Seen in source | Latest responses shown as ISO-style dates. Source shows 598 responses. |
| Q2 | "Senior Management Visited: Name and Position (i.e. Directors or Senior Regional Manager)" | `seniorManagementVisited` | Free text | — | To be confirmed | None evidenced. Whether it is shown only when senior management was met is **Proposed / requires confirmation** (see section 7) | **Medium: may identify a person** | Seen in source (wording); 9 responses | Current answers include personal names and roles. Do not reproduce names in examples. |
| Q3 | "Weekly - Category A" | Reference relationship: `NetworkRailLocation` with `visitCategory = A` | Single choice (see note) | London Paddington Managed Station; Other | To be confirmed | None evidenced | Low | Seen in source | "Other" appears here, in B and in E. See section 12, item 4. |
| Q4 | "Monthly - Category B" | Reference relationship: `visitCategory = B` | Single choice (see note) | London Enterprise House; Napier Road Depot - Reading; Reading Managed Station; Swindon Western House; Other | To be confirmed | None evidenced | Low | Seen in source | Values as read from source. |
| Q5 | "every 3 - 6 months - Category C" | Reference relationship: `visitCategory = C` | Single choice (see note) | Didcot Thames Valley SC | To be confirmed | None evidenced | Low | Seen in source | Only one value in this category. |
| Q6 | "Annual - Category D" | Reference relationship: `visitCategory = D` | Single choice (see note) | West Ealing Depot | To be confirmed | None evidenced | Low | Seen in source | Only one value in this category. |
| Q7 | "Ad Hoc Visits - Category E" | Reference relationship: `visitCategory = E` | Single choice (see note) | 30 values, listed in section 5.5 | To be confirmed | None evidenced | Low | Seen in source | Largest list. Contains spelling and case inconsistencies (section 9). |
| Q8 | "Other locations not listed" | `otherLocation` | Free text | — | To be confirmed | Whether selecting "Other" in Q3, Q4 or Q7 shows Q8 is **not established**. See section 12, item 4 | Low to medium: location text only | Seen in source; 78 responses | Free-text answers include many location names outside the category lists. |

**Note on "Single choice (see note)":** the source does not show whether a visit can record one location or several. The categories are shown as separate questions, so the current form may allow one location per category, or several in total. Section 12, item 2 asks Railway Mission to confirm.

## 4. Current location and reference values

These values are preserved as read from the source, with spelling and capitalisation kept as supplied. They are **not** corrected in this document. Section 9 lists the suspected issues.

### 4.1 Category A: Weekly (Q3)

- London Paddington Managed Station (272 responses in source)
- Other (127 responses in source)

### 4.2 Category B: Monthly (Q4)

- London Enterprise House (17)
- Napier Road Depot - Reading (41)
- Reading Managed Station (142)
- Swindon Western House (117)
- Other (6)

### 4.3 Category C: Every 3 to 6 months (Q5)

- Didcot Thames Valley SC (52)

### 4.4 Category D: Annual (Q6)

- West Ealing Depot (6)

### 4.5 Category E: Ad hoc (Q7)

Listed in the order of the source, with the response count shown in brackets:

1. Bristol Panel Box (1)
2. Bristol TM Managed Station (0)
3. Colthrop Signal Box (5)
4. Didcot DU (5)
5. Exeter Central office (1)
6. Exeter Panel (23)
7. Hayes Inner MOMs (4)
8. Kensal Green Depot (0)
9. London Tournament House (15)
10. Newbury DU (2)
11. Oxford MOMS (7) *(source chart reads "MOMs")*
12. Paddington PWay Depot (0)
13. Paddington S&T depot (1)
14. Paignton Panel (3) *(see section 9)*
15. Plymouth Panel (10)
16. Reading MOMS (18) *(source chart reads "MOMs")*
17. Redhill MOMS (0) *(source chart reads "MOMs")*
18. Salisbury (1)
19. Salisbury Maintenance Unit (3)
20. Salisbury MOMs (7)
21. Salisbury Panel Box (11)
22. Slough DU (3)
23. Slough outer MOMs (10)
24. Swindon DU (11)
25. Swindon Electrification Training Faclityq (0) *(see section 9)*
26. Swindon MOMs (11)
27. Westbury DU (3)
28. Westbury Panel (7)
29. Yeovil Pen Mill (3)
30. Other (17)

### 4.6 Other (Q8)

Free text. 78 responses in source. Answers include location names that are **not** in the category lists, such as "Apex House" (the largest entry in the word cloud), "Waterloo Station", "Moreton-in-Marsh", "Basingstoke ROC", "Penzance Signal" and "Liskeard Signal". The word cloud states that 40 respondents (53%) answered "Apex House" for the question it belongs to, which is not visible on the scan. Section 12 asks Railway Mission to confirm which question this is.

## 5. Category and frequency mapping

The existing form uses five visit-frequency categories. The proposed application keeps them as **reference data**. They must not be removed from the underlying data model.

| Category | Expected frequency (current label) | Source question | Locations in source |
|---|---|---|---|
| A | Weekly | Q3 | 1 named + Other |
| B | Monthly | Q4 | 4 named + Other |
| C | Every 3 to 6 months | Q5 | 1 |
| D | Annual | Q6 | 1 |
| E | Ad hoc | Q7 | 29 named + Other |

**Business meaning not established.** The labels "Weekly", "Monthly", "Every 3 to 6 months", "Annual" and "Ad hoc" are read as expected visit frequencies. The source does not state what happens if a frequency is missed, whether a category drives reporting targets, or whether "Ad hoc" carries any obligation. See section 12, items 6 and 7.

## 6. Proposed location reference-data model

This is a **proposal**. It is not a final schema, and it is not implemented.

```
NetworkRailLocation {
  id              // stable internal identifier, never the display name
  name            // display name, exactly as Railway Mission confirms it
  visitCategory   // A | B | C | D | E (retained for reporting)
  expectedFrequency  // Weekly | Monthly | Every 3-6 months | Annual | Ad Hoc
  active          // boolean; retired locations are kept for history
}
```

Points to note:

- **Category and frequency are stored with the location, not chosen by the chaplain.** This keeps the Railway Mission reporting structure while removing the need for the chaplain to know the category.
- **Identifier separate from name.** Renaming a location must not break history. Whether renames are allowed is not established (section 12, item 12).
- **`active` flag.** Retired locations stay in the catalogue so that historical visits can still be read.
- **Scope of the catalogue is not decided.** Whether one national catalogue exists, or lists are kept by region, route or chaplain, is an open major question (section 11). This model does not choose between them.
- **Historical category.** Whether a visit should keep the category that applied on the visit date is not established (section 12, item 14).

## 7. Proposed simplified mobile workflow

> **PROPOSED UX CHANGE.** This section describes a proposal for discussion. It is **not** the current Railway Mission process. The current process is in sections 3 to 5. No step here may be implemented until Railway Mission approves it.

The current form asks the chaplain to find the location under Category A, B, C, D or E. The proposal replaces that with a short sequence that the chaplain answers directly.

**Step 1: Date**

> "What date was the visit?"
> [date picker]

Maps to `visitDate`.

**Step 2: Location**

> "Where did you visit?"
> [Search or select a Network Rail location]

The search covers all categories, A to E. Example (synthetic):

> Search: `Reading Man`
> Result: **Reading Managed Station**

The application then **derives** the category and frequency from the location reference data, so the chaplain does not need to know that Reading Managed Station is Category B:

- Category: B
- Expected frequency: Monthly

The category and frequency are stored with the visit for reporting. They are not typed by the chaplain.

**Step 3: Location not listed**

> [ ] Location not listed
>
> If selected, show:
> "Enter the location"
> [free text]

Maps to `otherLocation`.

For an unlisted location, the application **does not assign a category or frequency**, unless Railway Mission defines that rule (section 12, item 15).

**Step 4: Senior management**

> "Did you meet with senior management during this visit?"
> ( ) Yes  ( ) No

This question is **not** in the current form as a Yes/No field. It is a **proposed UX improvement**, and Railway Mission must approve it before implementation.

- If **Yes**: show the existing requirement, using its current wording: "Senior Management Visited: Name and Position (i.e. Directors or Senior Regional Manager)". Maps to `seniorManagementVisited`.
- If **No**: do not show or require the free-text field.

**Step 5: Review**

A read-only summary, using synthetic values:

```
Date:                 17 November 2026
Location:             Reading Managed Station
Category:             B
Expected frequency:   Monthly
Senior management:    None recorded

[ Back ]   [ Save draft ]   [ Complete and queue for sending ]
```

### 7.1 Design principle

The chaplain should primarily answer three questions:

1. When?
2. Where?
3. Did you meet senior management?

The application determines the category and frequency from reference data. The chaplain should not need to remember whether a site is Category A, B, C, D or E. The aim is to reduce form friction while keeping Railway Mission's underlying reporting structure.

## 8. Proposed data model (Phase 2, not final)

```
NetworkRailVisit {
  id
  visitDate
  locationId          // reference to NetworkRailLocation, or null
  otherLocation       // free text, used only when no catalogue location applies
  seniorManagementVisited   // free text; optional; see section 7
  createdAt
  updatedAt
  isSynthetic
}

NetworkRailLocation {
  id
  name
  category
  expectedFrequency
  active
}
```

Notes:

- The visit stores `locationId` and **not** a copy of the category. The category is read from the location, which is the single source of truth. If the business rule is that the category must be frozen at visit time, a snapshot field would be added. That rule is not established (section 12, item 14).
- Exactly one of `locationId` and `otherLocation` should be present. This rule is **proposed**, and it depends on section 12, item 4.
- The prototype model is not being changed in this document.

## 9. Data-quality observations

These are **flagged for Railway Mission confirmation. They have not been corrected.**

1. **Apparent typo: "Swindon Electrification Training Faclityq".** The ending "q" looks like a typo, and "Facility" is the likely intent. This is not confirmed. The source value is kept as shown.
2. **Spelling to verify: "Paignton Panel".** It is spelled this way in the brief and appears similar on the scan. The scan is low resolution, so the spelling should be checked against the live form before any change.
3. **Inconsistent capitalisation of "MOMS" and "MOMs".** The supplied list uses "MOMS" for Oxford, Reading and Redhill, and "MOMs" for Hayes Inner, Salisbury, Slough outer and Swindon. The source chart appears to show "MOMs" throughout. Which is correct is not established.
4. **"Other" appears in several categories.** It appears in Category A, Category B and Category E. Each "Other" is a separate value and may mean something different in each category.
5. **Q8 separately captures "Other locations not listed".** It is not established whether this is the same concept as "Other" in Q3, Q4 and Q7.
6. **Free-text Q8 answers largely name locations that are not in the catalogue.** For example "Apex House" and "Waterloo Station". This suggests the category lists may be incomplete, or that people use Q8 for locations that are not in the lists.
7. **Combined category counts appear to exceed the overall response count.** The combined response counts across Categories A-E appear to exceed the 598 overall form responses. This may indicate that a submission can contain selections across multiple location categories, but the supplied source does not establish the underlying Microsoft Forms selection rules. Railway Mission should confirm this.
8. **Bristol TM Managed Station, Kensal Green Depot, Paddington PWay Depot, Redhill MOMS and Swindon Electrification Training Faclityq show 0 responses.** Zero responses may mean the location is not used, or that it is retired or misnamed. This is not established.
9. **Whether locations or categories differ by chaplain, geography, route or role is not established.**
10. **Whether this list is a national master list is not established.**
11. **How retired or renamed Network Rail locations are handled is not established.**

## 10. Privacy considerations

This workflow appears materially less sensitive than the Support Interaction Form. It can still contain identifiable information, particularly:

- **Senior management name and position (Q2).** A name combined with a position and a date can identify a person. Free-text entries also risk including more than the question asks for.
- **Visit location combined with date.** For a small team, a location and date together may identify who was visiting.
- **Free-text Q8 answers.** These are location names, but entries may include personal details if they are typed loosely.

**Data-minimisation considerations (proposed, for confirmation):**

- Ask for senior management **only** if the chaplain met them (proposed step 4). Do not require the field for "No".
- Ask for position or role only if Railway Mission confirms it is needed. Consider whether a role can be selected rather than typed.
- Do not store the free-text senior management value in URLs, analytics payloads, diagnostic logs or sync error messages. The same rule applies to `otherLocation` where it may contain personal details.
- Store the minimum needed for reporting. Retention rules are not established.
- Use synthetic data only in examples and in the prototype.

## 11. Major scope question: is the location list specific to one chaplain?

**The source title is "Log of Visits - Network Rail: John Roe".** This may mean the existing Network Rail visit forms and location lists are specific to one individual chaplain.

**This document does not assume that the location list applies to every Railway Mission chaplain.** This is a major item requiring confirmation.

The future application may need one of the following. This document does not choose between them:

- one national Network Rail location catalogue;
- location lists assigned by region or route;
- locations assigned to individual chaplains; or
- another configuration model.

The choice affects the reference-data model in section 6, the search in section 7, and who is allowed to see which locations.

## 12. Items requiring Railway Mission confirmation

Each item is **open**. None has been assumed.

1. **Which Network Rail visit fields are mandatory?** Not established for any question.
2. **Can more than one location be recorded for one visit or form submission?** The combined category counts appear to exceed the 598 overall responses. This is an observation from the response data, and it does not prove that multiple locations can be selected per submission. The underlying Microsoft Forms selection rules are not established. Railway Mission should confirm this.
3. **Are Categories A to E single-select or multi-select?** Not established.
4. **Does selecting "Other" in Q3, Q4 or Q7 trigger Q8?** Not established. Also: is Q8 always available, whatever the category?
5. **Is Q8 always available regardless of category?** Not established. (Same as item 4; confirm both.)
6. **Are Categories A to E only expected visit frequencies, or do they carry other business meaning?** Not established.
7. **Are the frequency classifications still current?** Not established.
8. **Are the location names and spellings current?** Not established. See section 9.
9. **Is this location catalogue specific to one chaplain?** The source title suggests it may be. Not established.
10. **Does every chaplain have a different Network Rail location list?** Not established.
11. **Should location lists be controlled nationally, regionally, by route, or by chaplain?** Not decided. Railway Mission to advise.
12. **Can a location's category or frequency change?** Not established. Also: how are renamed locations handled?
13. **Who maintains the location reference data?** Not established.
14. **Should historical visits keep the category and frequency that applied at the time?** Not established.
15. **Should "Other" locations later be reviewed and added to the main catalogue?** Not established. Also: should an unlisted location ever be assigned a category by rule?
16. **Is senior management information optional?** Not established.
17. **Can more than one senior manager be recorded on one visit?** Not established.
18. **Should senior manager name and position eventually be separate fields?** Not established.
19. **Is an explicit "No senior management visited" option wanted?** Not established. The proposal in section 7 uses Yes/No.
20. **Are there additional fields in the live form that cannot be seen in the PDF?** Not established. The PDF shows responses, not the form definition.

Also needing confirmation:

- The title "Log of Visits - Network Rail: John Roe" and what it means for ownership of the list (item 9).
- Whether the page 4 word cloud relates to Q8 (section 2).
- The exact spellings in section 9, items 1 to 3.

## 13. Potential future improvements

Recorded for consideration only. **Each requires Railway Mission approval. None is in scope.**

- **Location search** across all categories, with a "Location not listed" option, as in section 7.
- **Structured senior management entry**, with name and position as separate fields, if Railway Mission confirms this is wanted (item 18).
- **A governed location catalogue**, with an owner, a change log and a review date, so that renames and category changes are controlled.
- **Routing unlisted locations to a review queue**, so that they can be added to the catalogue after approval (item 15).
- **Retirement rather than deletion** of locations, so that history stays readable.
- **Visit-frequency reporting** that compares actual visits with expected frequency. This would need the business rules in items 6 and 7 first.

## 14. Explicit out-of-scope items

For this mapping exercise, and for the Phase 2 work it proposes, the following are **not** included:

- Any code change to the application, including Phase 1.
- A real backend, or any transmission of data outside the browser.
- Authentication or user accounts.
- Analytics of any kind.
- Location administration screens.
- Map, GPS or automatic location detection.
- Notifications.
- Reporting dashboards.
- Production reference data.
- Any real person's name or real visit data in examples or in the prototype.
- Changes to the Support Interaction Form.
