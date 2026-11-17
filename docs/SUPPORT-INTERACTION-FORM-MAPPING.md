# Support Interaction Form (SIF): approved field mapping

Written for: Railway Mission reviewers and the developers who will later update the prototype's form definitions.

Status: **documentation only.** No application code, form definitions or Phase 1 behaviour have been changed.
This remains a **synthetic-data-only prototype.** Nothing in this document authorises the use of real personal, welfare or safeguarding data.

## How to read this document

- **Current** values and wording are taken from the existing Railway Mission form, as supplied and manually reviewed.
- **Proposed** field IDs, types and conditional rules are our mapping proposals, unless marked otherwise.
- **Not supplied** means the information was not in the source. It has not been invented. It needs confirming.
- **Requires confirmation** means the wording or values must be checked by Railway Mission before production.
- Proposed UX improvements are kept separate, in the final section, and are not part of the current form.

## Mapping summary

| # | Current question (short) | Field ID | Type | Conditional | Privacy | Flag |
|---|---|---|---|---|---|---|
| Q1 | Organisation type | `organisationType` | Single select | None | Standard | — |
| Q2 | TOC | `toc` | Single-select dropdown | Shown when `organisationType` = TOC | Standard | Duplicate-looking entries (Lumo) |
| Q3 | Full Name of Company | `otherCompanyName` | Free text | Shown when `organisationType` = Other Company or Organisation (proposed) | Standard | Conditional is a proposed UX rule |
| Q4 | Freight Operator | `freightOperator` | Single-select dropdown | Shown when `organisationType` = Freight Operator | Standard | — |
| Q5 | Reason for support | `supportReason` | Long free text | None | **High sensitivity** | — |
| Q6 | Key Designation | `keyDesignation` | Single select | None | Standard | **Truncated entry; final list to verify** |
| Q7 | Gender | `gender` | Single select | None | Demographic | Preserved as supplied |
| Q8 | Manager/director request | `managerRequested` | Single select | None | Standard | — |
| Q9 | Location | `supportLocation` | Free text | None | Standard | Not a structured list |
| Q10 | Repeat support | `repeatSupport` | Single select | None | Standard | — |
| Q11 | Method of offering support | `supportMethod` | Single select | None | Standard | — |
| Q12 | Work related | `workRelated` | Single select | None | Standard | — |
| Q13 | Date | `supportDate` | Date | None | Standard | — |
| Q14 | Referral/signposting | `referred` | Single select | None | Standard | — |
| Q15 | Referral destination | `referralDestination` | Free text | Not supplied | Standard | Display condition not supplied |

Mandatory status is **not supplied** for any question. No question is marked required in this document.

---

## Current support interaction form

### Q1: Organisation type

- **Current wording:** "Company (or type of organisation) the person works for"
- **Proposed field ID:** `organisationType`
- **Type:** Single select
- **Current values** (preserved exactly, in the supplied order):
  - TOC
  - Network Rail
  - BTP
  - Member of Public Referral via BTP (give details)
  - London Underground
  - Freight Operator
  - Maintenance Contractor to Network Rail
  - Other Company or Organisation
- **Conditional behaviour:** Q2, Q3 and Q4 depend on this answer. See those sections.
- **Not supplied:**
  - The "(give details)" wording on "Member of Public Referral via BTP" implies a follow-up text field. No such field was supplied, so none is mapped. **Requires Railway Mission to confirm** whether a field exists and, if so, its wording.
  - Mandatory status.

### Q2: TOC

- **Current wording:** "TOC"
- **Proposed field ID:** `toc`
- **Type:** Single-select dropdown
- **Conditional rule:** Display only when `organisationType` = TOC.
- **Current values** (preserved exactly, in the supplied order, not deduplicated or renamed):
  - Avanti West Coast
  - c2c
  - Caledonian Sleeper
  - Chiltern Railways
  - CrossCountry
  - East Midlands Railway
  - Elizabeth Line (MTR)
  - Eurostar
  - Gatwick Express
  - Grand Central
  - Greater Thameslink Railway (GTR)
  - Great Western Railway (GWR)
  - Greater Anglia
  - GTS Rail Operations Ltd
  - Heathrow Express
  - Hull Trains and Lumo
  - LNER
  - London Northwestern Railway
  - First Rail London (London Overground)
  - Merseyrail
  - Northern
  - ScotRail
  - South Western Railway and Island Line
  - Southeastern
  - Southern Rail
  - Thameslink
  - TransPennine
  - Transport for Wales
  - West Midlands Railway
  - Lumo Trains

> **Requires Railway Mission confirmation before production.** "Hull Trains and Lumo" and "Lumo Trains" both appear in the supplied list. They have **not** been merged or renamed here. Railway Mission must confirm whether both are correct, one is a duplicate, or they represent different operators.

> **Requires Railway Mission confirmation before production.** Other entries in this list may also need verification against current operator names. The list has been preserved as supplied.

### Q3: Full Name of Company

- **Current wording:** "Full Name of Company"
- **Proposed field ID:** `otherCompanyName`
- **Type:** Free text
- **Proposed conditional rule:** Display only when `organisationType` = Other Company or Organisation.
- **Status of the conditional rule:** **Proposed UX rule.** It has not been demonstrated from the existing form. Railway Mission should confirm it matches the current form's behaviour.
- **Not supplied:** maximum length, mandatory status.

### Q4: Freight Operator

- **Current wording:** "Freight Operator"
- **Proposed field ID:** `freightOperator`
- **Type:** Single-select dropdown
- **Conditional rule:** Display only when `organisationType` = Freight Operator.
- **Current values** (preserved exactly, in the supplied order):
  - Direct Rail Services
  - Freightliner
  - GB Railfreight
  - DB Cargo UK
  - Colas Rail
  - DCRail
  - Mendip Rail
  - Heavy Haul Rail
- **Not supplied:** mandatory status. Whether the conditional rule is demonstrated on the live form has not been verified.

### Q5: Reason for support

- **Current wording:** "Describe the reasons for support. Work-related and personal, one situation or multiple issues. Be clear about the main reason support was offered. This should match the key designation (is there a BTP Log Number?)"
- **Proposed field ID:** `supportReason`
- **Type:** Long free text
- **Privacy classification:** **Potentially sensitive / high-sensitivity narrative.**
- **Requirements:**
  - Must never appear in application logs.
  - Must never appear in URLs.
  - Must not be included in analytics payloads.
  - Must not appear in sync or error diagnostic messages.
  - Prototype data must remain synthetic.
- **Not supplied:**
  - Maximum length.
  - Whether the "BTP Log Number" is a separate field. The parenthetical question is preserved as supplied. It is **not** mapped to a field.
  - Whether the description must "match the key designation" is a business rule. It is preserved as wording only and is **not** enforced by the prototype.

### Q6: Key Designation

- **Current wording:** "Key Designation - Choose the most relevant to the situation encountered"
- **Proposed field ID:** `keyDesignation`
- **Type:** Single select
- **Current values** (confirmed or visible in the supplied source, preserved in order):
  - Health - Mental
  - Health - physical
  - Personal - Relationships
  - Divorce Separation
  - Personal Finance
  - Family/Maternity/Children
  - Personal - Bereavement
  - Group Meeting For Company
  - Work-Related Stress
  - Work-Related Demands
  - Work Related Colleague Support
  - Work-Related Relationships
  - Death of a Colleague (or former colleague)
  - Work-Related Trauma
  - Other
  - **[Requires confirmation from Railway Mission]** Violence-against-women / misogyny / gendered-bullying category (see below)

> **Requires confirmation from Railway Mission.** The source contains a truncated category, which appears to read: "Identifying possible violence against women, misogyny or gendered bullying". **Do not treat that wording as fully verified.**
>
> Status: *Requires confirmation from Railway Mission. Final word "bullying" inferred from truncated source.*
>
> The supplied source appears to contain more than one closely related entry for this category. **These have not been deduplicated, and we have not inferred whether they are the same category.** Railway Mission must confirm the number, wording and order of these entries.
>
> **The complete Q6 value list requires final verification before production.**

- **Not supplied:** whether "Other" requires a free-text follow-up, and mandatory status.

### Q7: Gender

- **Current wording:** "Male or Female?"
- **Proposed field ID:** `gender`
- **Type:** Single select
- **Current values** (preserved exactly):
  - Male
  - Female
  - Other
- **Note:** Question wording and values are preserved as supplied. They have not been redesigned or renamed at this stage. Any more inclusive wording is recorded only in the final section, and requires Railway Mission approval.
- **Not supplied:** mandatory status, and whether the question is optional.

### Q8: Manager/director request

- **Current wording:** "Was the support at the request of a manager or director?"
- **Proposed field ID:** `managerRequested`
- **Type:** Single select
- **Values:** Yes, No
- **Not supplied:** mandatory status.

### Q9: Location

- **Current wording:** "Location support took place, Location Name / Area / Station / Office / Depot/ Home/ Hospital"
- **Proposed field ID:** `supportLocation`
- **Type:** Free text, for the initial mapping.
- **Note:** No station or location database has been created. The existing free-text requirement is kept. A structured selector is considered only in the final section.
- **Privacy note:** The current wording includes "Home" and "Hospital". These are location categories, but a free-text home or hospital entry could identify a person. Railway Mission should confirm the guidance given for these entries.
- **Not supplied:** mandatory status, maximum length.

### Q10: Repeat support

- **Current wording:** "Has this person been supported more than once regarding this situation? If yes add these to your answer to the question above 'Describe the nature and reason or reasons for support.'"
- **Proposed field ID:** `repeatSupport`
- **Type:** Single select
- **Values:** Yes, No
- **Preserved instruction:** The instruction to add repeat-support details to the Q5 answer is kept as written. The prototype does not change what is captured.
- **Not supplied:** mandatory status.

### Q11: Method of offering support

- **Current wording:** "Method of offering support:"
- **Proposed field ID:** `supportMethod`
- **Type:** Single select
- **Current values** (preserved exactly):
  - Face to Face
  - Telephone (voice or text)
  - E-mail
  - Video Conference
  - Support offered Via Manager
- **Not supplied:** mandatory status.

### Q12: Work related

- **Current wording:** "Was the support 'Work Related'; if there were multiple reasons describe this in the answer above in 'Describe the nature and reason or reasons for support.'"
- **Proposed field ID:** `workRelated`
- **Type:** Single select
- **Values:** Yes, No, Work and personal issues
- **Preserved instruction:** Multiple reasons are described in the Q5 answer, as currently written.
- **Not supplied:** mandatory status.

### Q13: Date

- **Current wording:** "What was the date of this support"
- **Proposed field ID:** `supportDate`
- **Type:** Date
- **Not supplied:** mandatory status, any rule about future dates or the earliest permitted date.

### Q14: Referral or signposting

- **Current wording:** "Was the person referred to another organisation, GP, EAP, Counsellor etc."
- **Proposed field ID:** `referred`
- **Type:** Single select
- **Values:** Yes, No
- **Not supplied:** mandatory status.

### Q15: Referral destination

- **Current wording:** "If yes, where did you signpost to?"
- **Proposed field ID:** `referralDestination`
- **Type:** Free text
- **Display condition:** **Not supplied.** The current wording says "If yes", which implies it follows Q14 = Yes. Railway Mission must confirm whether it is shown only when `referred` = Yes.
- **Not supplied:** mandatory status, maximum length.

---

## Items requiring Railway Mission confirmation before production

| # | Item | Why |
|---|---|---|
| 1 | Q2: "Hull Trains and Lumo" and "Lumo Trains" both appear | Possible duplicate or two different operators. Not merged or renamed. |
| 2 | Q2: full TOC list verification | Preserved as supplied. Names may need checking against current operators. |
| 3 | Q6: truncated violence-against-women / misogyny / gendered-bullying entry | Final wording inferred from a truncated source. |
| 4 | Q6: possibly more than one closely related entry for that category | Not deduplicated. Not inferred whether they are the same. |
| 5 | Q6: complete list | Requires final verification. |
| 6 | Q1: "Member of Public Referral via BTP (give details)" follow-up field | "(give details)" implies a field that was not supplied. |
| 7 | Q3: conditional display rule | Proposed UX rule, not demonstrated from the existing form. |
| 8 | Q4: conditional display rule | Specified in the mapping brief, not verified against the live form. |
| 9 | Q5: "BTP Log Number" parenthetical | Unclear whether it is a separate field. Not mapped. |
| 10 | Q5: "must match the key designation" | Business rule. Not enforced by the prototype. |
| 11 | Q9: "Home" and "Hospital" location guidance | Free-text entries could identify a person. |
| 12 | Q15: display condition | Not supplied. Implied by "If yes" only. |
| 13 | Mandatory status for every question | Not supplied. Nothing is marked required. |
| 14 | Maximum lengths for free-text fields | Not supplied. |
| 15 | Q7: gender question wording | Preserved as supplied. Requires approval before any change. |

---

## Potential future UX/data improvements

**These are not part of the current form. They are recorded for consideration only. Any change requires Railway Mission approval, and none is to be applied to the prototype.**

- **Q7 (gender):** Consider more inclusive wording and whether "Other" should allow a description. Any change must be approved by Railway Mission, and considered alongside its data-protection and equality obligations.
- **Q9 (location):** Consider a structured location selector with an "Other" option, which would keep the free-text route. This needs a location source that Railway Mission approves. No database has been created.
- **Q10 (repeat support):** Consider a way to capture repeat contacts as separate, linked entries, rather than adding them to the Q5 narrative. This would change what is captured, so it requires approval and is not part of this mapping.
- **Q2 and Q4 (operator lists):** Consider a maintained reference list with a review date, so the lists can be updated without a form change.
- **Q5 and Q6 (sensitive narrative):** Consider whether a narrower set of structured prompts would reduce the amount of sensitive free text captured. Any change requires a data-protection review.
- **Q15 (referral destination):** Consider a structured referral list, with a free-text "Other" option, once Railway Mission confirms the referral options.
- **Overall:** Show a short "Why we ask this" note beside sensitive questions, once the wording is approved.
