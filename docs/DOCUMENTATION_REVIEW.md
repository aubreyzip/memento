# Documentation Review — Memento (Pre-Phase 1)

> **Frozen record (9 November 2026, G-004).** Kept for history; do not edit. Current decisions are in [`DECISIONS.md`](./DECISIONS.md).

**Review date:** 8 November 2026  
**Documentation baseline reviewed:** 0.1 (commit `bcba822`)  
**Reviewer role:** Senior software architect / product-minded technical reviewer  
**Scope:** Review and documentation maintenance only. No application code, project initialization, or dependency installation was performed.

> **Status update (8 November 2026, later the same day):** The product owner has since confirmed O-001, O-015 (with a different seven-phase plan, now in `ROADMAP.md`), O-016, O-017, O-018, O-019, O-020, and the follow-up items O-036 to O-041. Phase 0 has been concluded (G-003). This review is kept as a historical record; `DECISIONS.md` is authoritative for current status, and `PHASE_0_REPORT.md` records the technical validation.

## How to read this review

Each finding has an ID (`R-xx`), a severity, the affected documents, an explanation, a recommended resolution, and whether product-owner approval is required. Findings are tagged with one of these outcomes:

- **Corrected:** a clear documentation error or inconsistency where the intended behavior was already established; fixed in this change.
- **Recorded:** a product or architectural decision that needs approval; recorded in [`DECISIONS.md`](./DECISIONS.md) as **Open** or **Proposed** with a recommendation. Not treated as approved.

Statements of evidence are marked as follows:

- **Verified:** checked against current official documentation during this review (see [§11 Verification log](#11-verification-log)).
- **Assumption:** believed true but not verified here; must be verified in a spike before being relied on.
- **Recommendation:** reviewer's proposed approach; requires approval when it affects product behavior or architecture.

Severity scale:

| Severity | Meaning |
|---|---|
| Critical | Can cause data loss, silent security failure, or a privacy contradiction if implemented as currently specified. Must be settled before the affected code is written. |
| High | Missing or contradictory specification for a core capability; implementation would force fundamental guesses. |
| Medium | Gap or inconsistency that will cause rework or inconsistent behavior if not settled before the relevant phase. |
| Low | Wording, traceability, or polish issue. |

---

## 1. Executive summary

The Memento documentation set is unusually strong for a pre-implementation project. Scope, exclusions, privacy posture, the Inbox invariant, the template model, and the security caveats (Expo Go, silent `PRAGMA key`, SQLCipher not covering media) are clearly stated and mostly consistent across the PRD, SRS, SDD, database design, use cases, test plan, and release checklist. The authors consistently avoid over-claiming encryption and repeatedly require verification on real builds, which is the right posture.

The review found **no contradiction with the product owner's established direction**. It did find:

1. **Two critical gaps in the encryption-key lifecycle.** First, the documents do not say what happens when the operating system's own device backup (Android Auto Backup, iOS iCloud or device transfer) restores the database file without its key. Second, they do not say what the app must do when it finds a database it cannot decrypt. Implemented naively, startup code could create a fresh database over the user's unreadable but recoverable data. The OS-backup behavior also conflicts with the confirmed "manual backup rather than automatic cloud backup" decision, because attachment files that the app has not encrypted could be copied to cloud backups by default.
2. **No documented phase plan.** `CLAUDE.md` refers to "the current phase", but no document defines what Phase 1 contains.
3. **Several core domain rules are underspecified.** These include:
   - which fields each template offers (even though "category-dependent entry fields" is a confirmed decision);
   - whether status is required, and its default and reset rules;
   - which fields Inbox entries may hold;
   - archive cascade semantics;
   - recurring dates for "Important Dates";
   - stable identities for seeded system data, which cross-device backups depend on.
4. **Technology decisions still open that Phase 1 depends on:** the ORM (Drizzle's Expo integration is currently documented against release-candidate packages), and how persistence code is tested, since SQLite runs natively and not in plain Jest.
5. **Backup and attachment cryptography are feasible but not designed.** Expo's first-party `expo-crypto` now provides AES-GCM (verified), which simplifies attachment encryption. It does not provide a password-based key derivation function, so passphrase-protected backups still need a vetted KDF from another library and a reviewed format.
6. **Governance gaps.** `DECISIONS.md` used a status vocabulary (`Deferred`) different from the one now required, labelled several product-owner-confirmed items as mere "baselines", listed some items as "open" even though the SRS had already adopted them, and `CLAUDE.md` did not instruct sessions to keep decisions and documents synchronized.

Clear inconsistencies (priority mismatches, status wording, restore-mode contradiction, diagram drift, governance wording) were corrected in this change. Everything that requires a product or architecture choice was recorded in `DECISIONS.md` with options and a recommendation, without being marked as approved.

**Verdict: Not ready — decisions required.** The documents need no major rewrite. Seven Phase 1 blocker decisions remain (see [§10](#10-phase-1-readiness-assessment)), and most can be settled quickly or resolved by a short technical spike that can start immediately.

---

## 2. Overall documentation quality assessment

| Dimension | Rating | Notes |
|---|---|---|
| Product vision and scope | Strong | Clear promise, personas, journeys, explicit V1 exclusions, future-work list. |
| Internal consistency | Good | Few true contradictions; most issues are wording drift and priority mismatches (corrected). |
| Requirements completeness | Fair | Coverage is broad, but the domain rules that make templates, statuses, Inbox, archive, and reminders behave predictably are thin. |
| Testability | Good | Stable requirement IDs, a scenario table (T-001–T-029), security tests. Some requirements lack measurable criteria (see [§7](#7-requirements-quality-assessment)). |
| Technical feasibility | Good with caveats | Stack is coherent and mostly verified; ORM, backup KDF, OS-backup exclusion on iOS, and persistence testing need spikes. |
| Security and privacy | Good intent, incomplete design | Correct caveats; key lifecycle, OS backups, attachments, notification content, and photo metadata need decisions. |
| Traceability | Good | Use cases map to FR ranges; SRS traceability table now includes `DECISIONS.md`. |
| Governance | Fair → Good after this change | Decision register restructured to the four required statuses; `CLAUDE.md` now carries the synchronization workflow. |
| Development readiness | Not yet | No phase plan; Phase 1 persistence decisions open. |

---

## 3. Contradictions and inconsistencies

### R-01 — Reminders priority contradicts confirmed scope
- **Severity:** Medium  
- **Affected:** `SRS.md` §4.8 FR-080; `DECISIONS.md` B-012; product-owner brief ("Local notifications and reminders").  
- **Problem:** FR-080 made reminders a *Should*, while reminders are a confirmed V1 capability.  
- **Resolution:** FR-080 raised to *Must*. B-012 marked Confirmed.  
- **Approval required:** No (already confirmed). **Outcome: Corrected.**

### R-02 — Collection export priority contradicts confirmed scope
- **Severity:** Medium  
- **Affected:** `SRS.md` §4.10 FR-101; `DECISIONS.md` B-014; brief ("Private collections with export/import functionality").  
- **Problem:** FR-101 made single-collection export a *Should*; FR-106 (collection import) is already *Must*. Export/import of collections is confirmed.  
- **Resolution:** FR-101 raised to *Must*.  
- **Approval required:** No. **Outcome: Corrected.**

### R-03 — Note/Preference status: "not required" vs "has no status"
- **Severity:** Low  
- **Affected:** `SRS.md` FR-046 vs SRS §6, `PRD.md` §6.2 table, `SDD.md` §8.4, `TEST_PLAN.md` T-012.  
- **Problem:** FR-046 said Note/Preference entries "MUST NOT require a status", which still permits one. Every other document says they have **no** status.  
- **Resolution:** FR-046 now states that Note/Preference entries MUST have no status.  
- **Approval required:** No. **Outcome: Corrected.**

### R-04 — Status optional (SRS) vs status required (SDD) for Task/Wishlist/Event
- **Severity:** Medium  
- **Affected:** `SRS.md` FR-045 ("MAY have"), `SDD.md` §8.4 ("absent only for Note and Preference"), `DATABASE_DESIGN.md` §3.5 (`status` nullable), `PRD.md` Journey C (implies an initial status).  
- **Problem:** Whether a Task/Wishlist/Event entry may have no status is contradictory. Default values are not defined either.  
- **Resolution:** Recorded as **O-021** with recommendation: status is required for status-bearing templates, defaulting to `TODO` / `SAVED` / `IDEA`. FR-045 now references O-021 instead of asserting either reading.  
- **Approval required:** Yes. **Outcome: Recorded.**

### R-05 — Full restore "replace" (SRS) vs "replace/merge" (SDD)
- **Severity:** Medium  
- **Affected:** `SRS.md` FR-105/FR-106; `SDD.md` §10.4 step 6.  
- **Problem:** The SRS defines full restore as replace-only and collection import as duplicate-or-replace. SDD step 6 implied a generic "merge" option for any import.  
- **Resolution:** SDD §10.4 aligned with the SRS: full restore replaces; collection import offers *import as copy* or *replace existing*. No full-backup merge in V1.  
- **Approval required:** No (SRS is the requirement source). **Outcome: Corrected.**

### R-06 — Backup encryption: mandatory (SRS) vs conditional (DECISIONS, Use Cases)
- **Severity:** Medium  
- **Affected:** `SRS.md` NFR-033 (MUST encrypt); `DECISIONS.md` B-014 ("if a vetted implementation is validated"); `USE_CASES.md` UC-14 step 4 ("if required by the validated format"); `TEST_PLAN.md` §7 ("if the format promises full archive encryption").  
- **Problem:** It is unclear whether an unencrypted export is ever allowed, or what happens if no vetted library is validated.  
- **Resolution:** Recorded as **O-028**. Recommendation: backups are always passphrase-encrypted, with no plaintext export in V1. If no vetted implementation passes review, the backup feature is blocked; it is not shipped unencrypted. UC-14 now references O-028.  
- **Approval required:** Yes. **Outcome: Recorded.**

### R-07 — Items listed as "Open" that the SRS already treats as requirements
- **Severity:** Low  
- **Affected:** `DECISIONS.md` O-005, O-006, O-011, O-012, O-014 vs `SRS.md` FR-015, FR-023, FR-025, FR-053, and the PRD exclusions.  
- **Problem:** The register said "open" while the SRS stated MUST requirements matching the recommendation. Readers could not tell what to implement.  
- **Resolution:** These items are now **Proposed** (adopted in the specification and pending product-owner confirmation). Their content is unchanged.  
- **Approval required:** Yes, to move them to Confirmed. **Outcome: Corrected (status only).**

### R-08 — Confirmed product decisions labelled as "baselines"
- **Severity:** Medium  
- **Affected:** `DECISIONS.md` §2 and §3.  
- **Problem:** The brief confirms the product definition, tagline, built-in and custom collection types, reusable templates, Inbox, no live sharing, no backend or accounts, free release, local reminders, encrypted local SQLite, manual backup with collection export/import, light/dark themes, and React Native + Expo + TypeScript. The register showed these as "adopted baselines". Separately, `CLAUDE.md` (project instructions) already treats Expo Router, the repository pattern, the five templates, and System/Light/Dark as mandatory rules.  
- **Resolution:** Each baseline row now has an explicit status. Items confirmed by the product owner or mandated by `CLAUDE.md` are **Confirmed**, with the source cited. The remaining items stay **Proposed**.  
- **Approval required:** No for the items the brief or `CLAUDE.md` confirm. Yes for the rest. **Outcome: Corrected.**

### R-09 — Visual personality missing "personal"
- **Severity:** Low  
- **Affected:** `DECISIONS.md` D-003 vs brief ("Warm, minimal, modern, and personal") and `PRD.md` §10.1.  
- **Resolution:** D-003 updated. **Approval required:** No. **Outcome: Corrected.**

### R-10 — Decision status vocabulary differs from the required governance model
- **Severity:** Medium  
- **Affected:** `DECISIONS.md` §6 (`Confirmed`, `Proposed`, `Superseded`, `Deferred`).  
- **Resolution:** The register now uses **Confirmed / Proposed / Open / Superseded**, with a "Needed by" column instead of `Deferred`. The change-control rule was rewritten to require synchronized document updates and superseded history.  
- **Approval required:** No (requested in the brief). **Outcome: Corrected.**

### R-11 — `CLAUDE.md` references an attachment-protection design that does not exist
- **Severity:** High  
- **Affected:** `CLAUDE.md` ("Follow the attachment-protection design and tests in `docs/SDD.md`"); `SDD.md` §9 ("use a vetted file-encryption strategy or document a security-approved exception"); `DECISIONS.md` O-008.  
- **Problem:** No attachment-protection design exists yet. An implementer following `CLAUDE.md` would have nothing to follow.  
- **Resolution:** `CLAUDE.md` now says the design is pending decision O-008 and that the attachments feature must not start until it is approved. O-008 updated with verified options (see [R-33](#r-33--attachment-protection-design-is-not-specified)).  
- **Approval required:** Yes, for the design itself. **Outcome: Corrected (reference) + Recorded (design).**

### R-12 — Mixed priorities inside single requirements
- **Severity:** Low  
- **Affected:** `SRS.md` FR-073 ("Must/Should"), FR-092 (manual lock MUST, but priority "Should").  
- **Resolution:** FR-073 reworded so the priority attaches to each clause (title/description *Must*, tags *Should*). FR-092 changed to: manual lock MUST, configurable auto-lock SHOULD, priority Must.  
- **Approval required:** No. **Outcome: Corrected.**

### R-13 — Terminology drift: archive vs deactivate
- **Severity:** Low  
- **Affected:** `SRS.md` FR-015 ("archived/deactivated"), FR-025; `DATABASE_DESIGN.md` (`is_active` for types/categories, `archived_at` for collections/entries); `USE_CASES.md` UC-03.  
- **Problem:** Two mechanisms and two words describe the same user-facing idea.  
- **Resolution:** Recorded in **O-025** (archive semantics). Recommendation: use the single user-facing term "Archive" everywhere and use `archived_at` on all four tables for consistency. This can be fixed at no cost because no migration has shipped yet.  
- **Approval required:** Yes (schema). **Outcome: Recorded.**

### R-14 — Diagram drift
- **Severity:** Low  
- **Affected:** `diagrams/application-architecture.mmd` (use cases never call the notification adapter); `diagrams/data-model.mmd` (missing `starts_at_utc`, `ends_at_utc`, `completed_at`, collection `sort_order`, category `color`).  
- **Resolution:** Diagrams updated to match the SDD and database design.  
- **Approval required:** No. **Outcome: Corrected.**

### R-15 — Traceability omissions
- **Severity:** Low  
- **Affected:** `SRS.md` §8 (no link to `DECISIONS.md`); `README.md` reading list (no review document).  
- **Resolution:** Added. **Approval required:** No. **Outcome: Corrected.**

---

## 4. Missing requirements

Requirements below are proposed only where V1 cannot be implemented predictably without them. No new features are proposed beyond what the documents already imply.

### R-16 — Template field-applicability matrix is missing
- **Severity:** High  
- **Affected:** `PRD.md` §5 principle 4, §6.3; `SRS.md` FR-024, FR-051, FR-060–064; `DATABASE_DESIGN.md` §3.5.  
- **Problem:** "Category-dependent entry fields" is a confirmed decision, but no document lists which fields each template offers. FR-060–064 cover only a subset (for example, Wishlist "supports price and links", but nothing says whether a Note may have links, a Task a price, or a Preference a date). Nothing says what happens to stored values when an entry moves to a category with a different template.  
- **Resolution (Recommendation, recorded as O-022):**

  | Field | NOTE | TASK | WISHLIST | EVENT | PREFERENCE | Inbox (no template) |
  |---|---|---|---|---|---|---|
  | Title (required) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
  | Description | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
  | Status | — | ✓ | ✓ | ✓ | — | — |
  | Priority | — | ✓ | ✓ | ✓ | — | — |
  | All-day date | — | ✓ (due) | ✓ (target) | ✓ | — | — |
  | Date range / time | — | — | — | ✓ | — | — |
  | Price + currency | — | — | ✓ | ✓ | — | — |
  | Location text | — | — | — | ✓ | — | — |
  | Links, photos, tags | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
  | Reminder | ✓ | ✓ | ✓ | ✓ | ✓ | see O-023 |

  **Preservation rule (recommended):** templates control which *empty* fields the editor offers, not which stored values exist. When an entry changes template or moves to the Inbox, populated non-applicable fields are kept and remain visible in the entry detail. Only `status` is remapped (see O-021). This prevents silent data loss without adding UI complexity.
- **Approval required:** Yes. **Outcome: Recorded.**

### R-17 — Status lifecycle rules are incomplete
- **Severity:** Medium  
- **Affected:** `SRS.md` FR-045, §4.6; `DATABASE_DESIGN.md` `completed_at`.  
- **Problem:** No default status is defined. Nothing says what happens to status when an entry is re-categorized across templates or moved back to the Inbox (FR-033). Nothing says which statuses set `completed_at` (`COMPLETED` only, or `PURCHASED` too? Is `CANCELLED` "done"?). "Pending tasks" on Home is not defined.  
- **Resolution (Recommendation, O-021):**
  - Defaults: `TODO`, `SAVED`, `IDEA`.
  - Moving to a different template resets status to the new template's default.
  - Moving to the Inbox clears status.
  - `completed_at` is set when status becomes `COMPLETED` or `PURCHASED` and cleared when it leaves those values. `CANCELLED` does not set it.
  - "Pending" means a TASK-template entry with status ≠ `COMPLETED`, not archived.
- **Approval required:** Yes. **Outcome: Recorded.**

### R-18 — Inbox entry capabilities are undefined
- **Severity:** Medium  
- **Affected:** `PRD.md` §6.4; `SRS.md` FR-030–035; `USE_CASES.md` UC-05.  
- **Problem:** Quick Capture collects a title and description. Can an Inbox entry later receive tags, links, photos, priority, or a reminder? Can it be pinned or archived?  
- **Resolution (Recommendation, O-023):** Inbox entries may hold the template-independent fields (description, links, photos, tags) and may be pinned, archived, and given a reminder. They never hold a status. Template-specific fields become available after assignment.  
- **Approval required:** Yes. **Outcome: Recorded.**

### R-19 — Recurring dates (birthdays, anniversaries) are not addressed
- **Severity:** High  
- **Affected:** `PRD.md` §4.2 personas, §6.2 ("Important Dates"); `SRS.md` FR-051, FR-070, FR-080; `DATABASE_DESIGN.md` `entries`, `reminders`.  
- **Problem:** "Important Dates" is a built-in category and "remembering important dates" is a core use. Every date and reminder in the model is one-off. A birthday stored as `1990-05-12` would never appear as "upcoming" on Home, and its reminder would fire once. The docs neither include nor exclude recurrence.  
- **Resolution (Recommendation, O-024):** Include minimal **yearly** recurrence only: an entry-level `recurrence` value (`NONE` | `YEARLY`) for all-day dates, and a yearly reminder option. *Verified:* `expo-notifications` supports a yearly trigger type. No general recurrence rules (RRULE) in V1. If rejected, explicitly add "recurring dates" to the V1 exclusions so the gap is deliberate.  
- **Approval required:** Yes (scope). **Outcome: Recorded.**

### R-20 — Archive cascade semantics are undefined
- **Severity:** Medium  
- **Affected:** `SRS.md` FR-010, FR-040, FR-074; `USE_CASES.md` UC-02, UC-09; `SDD.md` §11.  
- **Problem:** When a collection is archived, nothing says whether its entries still appear on Home or in search, whether their reminders still fire, or whether entries can still be added to it. Nothing says whether archived entries' reminders fire either. SDD §11 implies notifications may fire for archived entries.  
- **Resolution (Recommendation, O-025):**
  - Archiving a collection hides its entries from Home and default search results; they remain reachable through the archive filter.
  - New entries cannot be added to an archived collection.
  - Archiving an entry, or its collection, cancels its pending notifications.
  - Restoring re-schedules any reminders that are still in the future.
  - Archived categories and types are hidden from pickers but stay displayed on existing records.
- **Approval required:** Yes. **Outcome: Recorded.**

### R-21 — Reminder lifecycle details missing
- **Severity:** Medium  
- **Affected:** `SRS.md` FR-080–084; `SDD.md` §11; `DATABASE_DESIGN.md` §3.10; `TEST_PLAN.md` T-019/T-020.  
- **Problem:** The following are undefined:
  - How many reminders an entry may have.
  - What happens to a reminder after it fires (it remains `is_enabled = 1` with a past time).
  - Whether reminders are wall-clock (09:00 wherever I am) or absolute instants.
  - What happens when a reminder's entry is completed.

  Two platform constraints are not specified either:
  - **Verified:** On Android 14+, the exact-alarm permission is denied by default for new installs. Without it, notifications arrive "at an approximate time". Google Play restricts `USE_EXACT_ALARM` to alarm, timer, and calendar apps.
  - **Verified (Apple's documentation for the older API, Apple forums):** iOS keeps a limited number (64) of pending local notifications per app. The eviction policy of the current API is not clearly documented, so reconciliation must schedule only the nearest reminders, up to a safe cap.
- **Resolution:** SDD §11 updated with these verified platform constraints (fact, not a product choice). Product rules recorded in **O-024** (recurrence), **O-025** (archive), and **O-032** (lifecycle). O-032 recommends:
  - Multiple reminders per entry are allowed.
  - Fired reminders are kept as history.
  - Reminders are absolute instants and display in the device time zone.
  - Completing an entry does not cancel its reminders automatically.
  - Exact alarms are requested only when the user creates a timed reminder, with an explanation of what happens without them.
- **Approval required:** Yes (product rules). **Outcome: Corrected (platform facts) + Recorded.**

### R-22 — Notification content is user content outside the encrypted database
- **Severity:** Medium  
- **Affected:** `SDD.md` §11, §12; `SRS.md` NFR-003, NFR-034; `PRD.md` §11.  
- **Problem:** A local notification typically shows the entry title on the lock screen. The scheduled notification payload is also held by the OS outside SQLCipher. Neither is discussed, even though app lock is a V1 feature.  
- **Resolution (Recommendation, O-030):** Add a "Hide reminder content" setting. Default it to on when app lock is enabled, so the notification shows a generic "Memento reminder" text and the title is revealed only in the app. Disclose OS-held notification content in the privacy policy.  
- **Approval required:** Yes. **Outcome: Recorded.**

### R-23 — Turkish/English search normalization is undefined
- **Severity:** Medium  
- **Affected:** `SRS.md` FR-073; `SDD.md` §8.5; `TEST_PLAN.md` §5 ("Search returns correct results for English and Turkish text").  
- **Problem:** SQLite's built-in `LIKE` and `lower()` fold only ASCII letters. Turkish has dotted/dotless I (`İ i I ı`) and letters many users type without a Turkish keyboard (`ş ğ ç ö ü`). Without a defined folding rule, "correct results" cannot be tested.  
- **Resolution (Recommendation, O-026):** Store a normalized search column (title + description + tag labels) computed in TypeScript using a documented fold: Unicode NFKD, strip combining marks, map `İ I ı i` → `i`, then lowercase. Apply the same fold to the query. FTS5 is optional on top. *Verified:* `enableFTS` defaults to `true` in the Expo SQLite config plugin. Tag normalization should use the same fold.  
- **Approval required:** Yes (affects matching behavior users see). **Outcome: Recorded.**

### R-24 — Built-in seed identity is not fixed
- **Severity:** High  
- **Affected:** `DATABASE_DESIGN.md` §5 ("deterministic IDs **or** stable keys"); `SRS.md` FR-026, FR-100/FR-101/FR-106.  
- **Problem:** If built-in types and categories get random UUIDs per installation, a backup from device A references category IDs that do not exist on device B. Restore and collection import would then need key-based remapping everywhere.  
- **Resolution (Recommendation, O-020):** Give every built-in row a **fixed, hard-coded UUID constant** plus its unique `key`. Backups and imports then resolve system rows by ID directly, with `key` as a cross-check.  
- **Approval required:** Yes (architecture; trivial to adopt). **Outcome: Recorded.** Phase 1 blocker.

### R-25 — Customizing built-in types and categories is unspecified
- **Severity:** Low  
- **Affected:** `SRS.md` FR-011, FR-020, FR-025; `DATABASE_DESIGN.md` §3.2, §3.4.  
- **Problem:** Can a user rename, recolor, reorder, or hide a built-in category? System names are localized via translation keys, so renaming conflicts with localization.  
- **Resolution (Recommendation, O-020):** Built-ins can be reordered and archived (hidden), not renamed or deleted. Icon and color overrides are optional.  
- **Approval required:** Yes. **Outcome: Recorded.**

### R-26 — Field and size limits are only "recommended"
- **Severity:** Medium  
- **Affected:** `SRS.md` §6; `DATABASE_DESIGN.md`.  
- **Problem:** The title (160) and description (10,000) limits are recommendations. There are no limits for names, tags, link count, attachment count or size, or backup size, so import bounding (TEST_PLAN §7) has no reference values.  
- **Resolution (Recommendation, O-027):**
  - Title 160; description 10,000.
  - Collection, category, and type names 60; tag 40.
  - Links per entry 20; URL 2,048.
  - Photos per entry 10; each image ≤ 20 MB on intake, then re-encoded (see O-031).
- **Approval required:** Yes. **Outcome: Recorded.**

### R-27 — Image intake: camera, metadata, size
- **Severity:** Medium  
- **Affected:** `PRD.md` §11; `SRS.md` FR-049/FR-050, NFR-035; `SDD.md` §9.  
- **Problem:** No document says whether V1 lets users take a photo with the camera (which needs a permission) or only pick existing photos. Copying the original file also keeps its EXIF metadata, which often includes **GPS location**. That conflicts with data minimization, and the location would go into backups. *Verified:* `expo-image-picker` launches the library picker without a permission request. Camera use requires a camera permission.  
- **Resolution (Recommendation, O-031):** V1 supports library selection only (no camera, so no camera permission). Images are re-encoded on intake, which strips metadata and caps dimensions (for example, 2048 px on the long edge). *Assumption:* Expo's image-manipulation module supports this. Its documentation page was not reachable during this review, so verify it in a spike.  
- **Approval required:** Yes. **Outcome: Recorded.**

### R-28 — "Delete all data" semantics incomplete
- **Severity:** Medium  
- **Affected:** `SRS.md` FR-107; `USE_CASES.md` UC-16; `TEST_PLAN.md` T-028.  
- **Problem:** It is unclear whether "delete all" also removes SecureStore keys, cancels every scheduled notification, clears staging and cache files, resets settings, and returns to onboarding. On iOS, *verified:* Keychain items can persist after uninstall, so a leftover key might be reused unintentionally.  
- **Resolution (Recommendation, O-033):** Delete-all closes the database, then deletes:
  - the database files, including the WAL and SHM files;
  - all media, thumbnail, staging, and cache files;
  - every scheduled notification;
  - the SecureStore keys.

  It then resets settings and returns to first-run onboarding. A fresh key is generated on the next initialization.
- **Approval required:** Yes. **Outcome: Recorded.**

### R-29 — Collection import merge rules for shared entities
- **Severity:** Medium  
- **Affected:** `SRS.md` FR-106; `DATABASE_DESIGN.md` §9.  
- **Problem:** Categories, custom types, and tags are global. When a collection export is imported on a device that already has a category with the same UUID (edited differently) or the same name (different UUID), the behavior is undefined.  
- **Resolution (Recommendation, O-029):**
  - System rows match by fixed ID (O-020).
  - Custom types and categories match by UUID; an existing row is kept, not overwritten. With no UUID match, a new row is created, even when the name matches.
  - Tags match by normalized name.
  - "Import as copy" gives the collection and all of its entries, links, attachments, and reminders new UUIDs.
- **Approval required:** Yes. **Outcome: Recorded.**

### R-30 — Backup and import file handling dependencies not listed
- **Severity:** Low  
- **Affected:** `SDD.md` §4; `DECISIONS.md` §3.  
- **Problem:** Importing requires a document picker, and exporting requires the OS share/save sheet. Neither module is in the technology table. *Verified:* `expo-document-picker` and `expo-sharing` exist and are the documented companions to the new `expo-file-system` API.  
- **Resolution:** Added to the SDD and the DECISIONS technology table as **Proposed**.  
- **Approval required:** Yes (dependencies). **Outcome: Recorded.**

### R-31 — Accessibility targets lack a reference standard
- **Severity:** Low  
- **Affected:** `SRS.md` NFR-041–045; `TEST_PLAN.md` §8.  
- **Problem:** "Appropriate" contrast and "comfortable" touch targets cannot be measured.  
- **Resolution (Recommendation):** Reference WCAG 2.2 AA for contrast. Set touch targets of at least 44×44 pt (iOS) and 48×48 dp (Android). Test at the largest standard system text size. Respect the OS reduce-motion setting.  
- **Approval required:** Yes (light). **Outcome: Recorded in this review only;** adopt when the design-system phase starts.

### R-32 — Language source of truth
- **Severity:** Low  
- **Affected:** `SRS.md` FR-003, FR-005.  
- **Problem:** *Verified:* `expo-localization` supports declaring `supportedLocales`, which enables per-app language selection in the OS settings. An in-app language setting plus an OS per-app language means two sources of truth.  
- **Resolution (Recommendation, O-034):** The in-app setting offers System / English / Türkçe. "System" follows the OS per-app or device language. Re-read the locale when the app returns to the foreground (*verified* Android behavior).  
- **Approval required:** Yes. **Outcome: Recorded.**

---

## 5. Technical feasibility assessment

| Area | Assessment | Evidence | Concerns / required action |
|---|---|---|---|
| React Native + Expo + TypeScript | Feasible | Current Expo docs list SDK modules at version line ~58.x | Choose the SDK at project init and record it (O-009). Use `npx expo install`. |
| Expo Router | Feasible | Mandated by `CLAUDE.md`; file routing fits the 4-tab + modal design | None blocking. A thin-routes rule is already in `CLAUDE.md`. |
| `expo-sqlite` | Feasible | **Verified:** sync/async APIs, transactions, `PRAGMA` support | **Verified:** `withExclusiveTransactionAsync()` opens a **new connection**, so connection-level settings (e.g. `PRAGMA foreign_keys = ON`) do not apply inside it. With SQLCipher the new connection must also be keyed. *Recommendation:* use `withTransactionAsync()` only, or key every connection. SDD and TEST_PLAN updated. |
| SQLCipher | Feasible, needs custom builds | **Verified:** `useSQLCipher` config plugin option; not supported in Expo Go; `PRAGMA key` silently ignored without SQLCipher; `PRAGMA cipher_version` returns a row only with SQLCipher; supported on Android and iOS | Spike on both platforms (Phase 0). Add an explicit "wrong key → `file is not a database`" detection path (O-019). |
| FTS5 | Feasible | **Verified:** `enableFTS` defaults to `true` | Not on web (irrelevant). Folding must be in app code (R-23). |
| Drizzle ORM | Feasible but immature for Expo | **Verified:** Drizzle's Expo page currently instructs `drizzle-orm@rc`, `drizzle-kit@rc`, `expo-sqlite@next`, a Babel inline-import plugin and a Metro change. Migrations are bundled SQL run via a hook or `migrate()` | *Assumption to verify:* whether its migrator wraps each migration in a transaction, and how it handles the FK-safe table-rebuild procedure (R-34). Recommendation in **O-016**: direct parameterized repositories + hand-written versioned SQL migrations for V1. |
| Expo SecureStore | Feasible with explicit choices | **Verified:** iOS Keychain values may persist after uninstall (not guaranteed); Android values are lost on uninstall; values stored with `requireAuthentication: true` become unreadable when biometrics change; default iOS accessibility is `WHEN_UNLOCKED`, which migrates to a new device in backups, while `*_THIS_DEVICE_ONLY` variants do not; the config plugin excludes SecureStore data from Android Auto Backup | The database key **must not** use `requireAuthentication` (data-loss risk). Accessibility class must be chosen together with the OS-backup policy (O-018, O-019). |
| Attachment storage | Feasible | **Verified:** the new `expo-file-system` API (`File`, `Directory`, `Paths.document`, `Paths.cache`, move/copy, `FileHandle` streaming). No API for excluding files from iOS backup was found | Atomic rename within the same directory is the expected pattern. *Assumption:* atomicity of `move()` on both platforms; verify. |
| Attachment encryption | Feasible | **Verified:** `expo-crypto` provides AES-GCM (`aesEncryptAsync`/`aesDecryptAsync`, 12-byte IV, 16-byte tag, AAD support) on Android and iOS | One-shot API: encrypts whole buffers in memory, which is acceptable for size-capped images (R-27). Display requires decrypting to a cache file and cleaning it up. See R-33. |
| Password-protected backup | Feasible, design missing | **Verified:** `expo-crypto` has **no** password-based KDF (no PBKDF2/scrypt/Argon2) | A vetted KDF from another library is required. *Assumption:* candidates such as `react-native-quick-crypto` (scrypt/PBKDF2) or a libsodium binding (Argon2id) work on the chosen SDK and New Architecture. Needs a spike. See R-35. |
| Cross-device restore | Coherent | Backups are logical exports re-encrypted with a passphrase-derived key, not copies of the SQLCipher file. The device key never leaves the device | This is the correct model. Media must be decrypted with the device media key and re-encrypted for the archive. Documented in SDD §10.3. |
| OS device backups | **Not coherent as specified** | **Verified:** Android Auto Backup is on by default for apps targeting API 23+. SecureStore is excluded from it, but the database and media files are not | See R-32a (Critical). |
| Expo Local Authentication | Feasible | **Verified:** Face ID not testable in Expo Go; `disableDeviceFallback`; Android `biometricsSecurityLevel`; error codes include `not_enrolled`, `passcode_not_set`, `lockout`. **No API to detect biometric enrolment changes** | TEST_PLAN's "changed biometrics" case reworded to observable behavior. App lock is a UI gate (O-013). |
| App-switcher protection | Feasible (new dependency) | **Verified:** `expo-screen-capture` offers `enableAppSwitcherProtectionAsync()` (iOS blur) and Android `FLAG_SECURE` via `preventScreenCaptureAsync()` | TEST_PLAN expects this, but no requirement or dependency exists. Recorded under O-013. |
| Expo Notifications (local) | Feasible with platform limits | **Verified:** local notifications work without push; `RECEIVE_BOOT_COMPLETED` is added automatically and notifications are re-set after reboot on Android; Android 12+ exact-alarm permission rules; yearly/calendar triggers exist | iOS pending-notification cap (64) → reconcile only the nearest reminders. Android 13+ runtime notification permission. |
| English/Turkish localization | Feasible | **Verified:** `expo-localization` provides `getLocales()`, `getCalendars()`, `currencyCode`, `timeZone` | *Assumption:* Hermes `Intl` date/number/currency formatting for `tr-TR` is complete on both platforms; verify in Phase 1. Search folding is app-level (R-23). |
| Image picking | Feasible | **Verified:** library picker needs no permission; camera does | See R-27. |
| EAS Build / Submit | Feasible | Standard Expo path; custom dev builds required for SQLCipher | Bundle ID must be fixed before any build stores real data (keychain and sandbox are tied to it) — O-001 moved earlier. |
| GitHub Actions | Feasible | — | Lint, typecheck, and Jest on Linux runners. Native E2E (Maestro) needs emulators, macOS runners, or EAS builds; treat as milestone jobs, not per-commit. |
| Testing tools | Feasible with a gap | — | Jest runs in Node. *Assumption (high confidence):* `expo-sqlite` has no Node runtime, so repository tests need either a Node SQLite driver executing the same migration SQL, or on-device tests. SQLCipher behavior can only be tested on device. See R-37 / O-017. |

### R-32a — OS device backups conflict with key lifecycle and the manual-backup decision
- **Severity:** Critical  
- **Affected:** `DECISIONS.md` D-011, B-013; `SDD.md` §8.1, §12.3; `SRS.md` NFR-031, NFR-032; `PRD.md` §11; `RELEASE_CHECKLIST.md` §4.  
- **Problem (verified facts):**
  - **Android:** Auto Backup is enabled by default. The SecureStore config plugin excludes the key from backup because Keystore entries are deleted on uninstall. Unless excluded, the SQLCipher database file and the media files **are** backed up. After a restore to a new phone, the app finds an encrypted database without its key, which makes it unreadable. Media that the app has not encrypted will have been copied to the user's cloud backup.
  - **iOS:** The database and media in the app's documents area are normally included in iCloud or device-transfer backups. Whether the key follows depends on the Keychain accessibility class: the default `WHEN_UNLOCKED` migrates, while `*_THIS_DEVICE_ONLY` does not. No exclude-from-backup API was found in `expo-file-system`.
  - This conflicts with confirmed **D-011** ("Manual backup rather than automatic cloud backup"). At minimum it must be decided and disclosed.
- **Resolution (Recommendation, O-018):** Exclude Memento data from OS backups on both platforms, consistent with D-011:
  - **Android:** disable app-data backup.
  - **iOS:** mark the database and media directories as excluded from backup. *Assumption:* this likely needs a small native config or module; verify in the Phase 0 spike.
  - Use `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (or `WHEN_UNLOCKED_THIS_DEVICE_ONLY`) for keys.
  - Onboarding states clearly that phone migration requires a Memento backup.
  - Alternative: allow iOS backups with a migratable key class, accepting cloud copies of unencrypted media. Not recommended unless attachments are app-encrypted.
- **Approval required:** Yes. Users lose "it just came with my new phone". **Outcome: Recorded.** Phase 1 blocker.

### R-32b — No defined behavior for an undecryptable or key-less database
- **Severity:** Critical  
- **Affected:** `SDD.md` §8.1, §12.3; `USE_CASES.md` UC-01 exceptions; `SRS.md` NFR-023, FR-094.  
- **Problem:** Startup checks only for SQLCipher availability. Nothing covers these states:
  - (a) the key is missing but a database file exists (OS restore; iOS reinstall edge cases);
  - (b) the key exists but does not open the database;
  - (c) a key exists but no database exists (iOS reinstall: *verified* that Keychain may persist).

  A naive "no key → generate key and create database" path **would overwrite or orphan the user's data**. Separately, storing the key with `requireAuthentication` would make data permanently unreadable after a fingerprint or face change (*verified*).
- **Resolution (Recommendation, O-019):**
  - Never delete, overwrite, or recreate an existing database file automatically.
  - On (a) or (b), move the file aside to a quarantine name. Show a recovery screen: "Restore from a Memento backup" or "Start fresh (your old unreadable data will be deleted)", with explicit confirmation.
  - On (c), reuse the key for a new database, or regenerate it. Either is safe.
  - Store a database key and a media key as independent random 256-bit secrets in SecureStore, using a `*_THIS_DEVICE_ONLY` class and without `requireAuthentication`.
  - Use a raw-key `PRAGMA key` form so SQLCipher does not run its passphrase KDF on every open. *Assumption:* raw-key syntax is supported by Expo's SQLCipher build; verify in the spike.
- **Approval required:** Yes (architecture/UX). **Outcome: Recorded.** Phase 1 blocker.

### R-33 — Attachment protection design is not specified
- **Severity:** High  
- **Affected:** `DECISIONS.md` O-008; `SDD.md` §9; `SRS.md` NFR-032; `CLAUDE.md`.  
- **Options:**
  - **A — App-level encryption (recommended).** Encrypt each file, and each thumbnail, with AES-GCM via `expo-crypto` (*verified* available), using a per-install media key from SecureStore and a random 12-byte IV per file. Use the attachment ID as AAD. Decrypt to `Paths.cache` for display and purge the cache on lock and on startup. Cost: decryption latency for thumbnails, which needs a small decrypted-thumbnail memory cache.
  - **B — OS protection only.** Rely on Android file-based encryption and iOS Data Protection, and document a security exception. Simpler, but files are readable to anything with app-sandbox access while the device is unlocked, and they travel in OS backups unless excluded.
- **Resolution:** Recorded in **O-008** with Option A recommended. Attachment work must not begin until O-008 is decided.  
- **Approval required:** Yes. **Outcome: Recorded.**

### R-34 — Migration table-rebuild can cascade-delete child rows
- **Severity:** High  
- **Affected:** `DATABASE_DESIGN.md` §4, §8; `SDD.md` §8.1.  
- **Problem (verified):** `PRAGMA foreign_keys` has no effect inside a transaction. SQLite cannot alter `CHECK` constraints or foreign keys in place; it needs a table rebuild (create new table, copy, `DROP` old, rename). With foreign keys enforced, dropping `entries` performs an implicit delete that **fires `ON DELETE CASCADE`** on links, attachments, tags, and reminders. A future migration that changes the Inbox `CHECK` constraint could silently delete user data.  
- **Resolution:** `DATABASE_DESIGN.md` §8 now requires SQLite's documented table-rebuild procedure: disable foreign keys **outside** the transaction, rebuild, run `PRAGMA foreign_key_check`, then re-enable. Every rebuild migration needs a test that proves child rows survive. TEST_PLAN updated.  
- **Approval required:** No (correctness of an established requirement, NFR-021/NFR-023). **Outcome: Corrected.**

### R-35 — Backup cryptographic format and KDF not selected
- **Severity:** High (not a Phase 1 blocker)  
- **Affected:** `DECISIONS.md` O-007; `SDD.md` §10.3; `SRS.md` FR-103, NFR-033.  
- **Problem:** `expo-crypto` AES-GCM is available (*verified*). There is no first-party passphrase KDF (*verified*). The one-shot AEAD API means a multi-hundred-megabyte archive cannot be encrypted as a single buffer.  
- **Resolution (Recommendation, O-007):**
  1. Select a vetted KDF (Argon2id preferred, scrypt acceptable) from a maintained library that supports the chosen SDK and New Architecture.
  2. Avoid inventing a streaming construction. Encrypt each archive member (records JSON, each media file) as an independent AES-GCM blob with its own random IV, binding the member path and format version as AAD.
  3. Encrypt the manifest too, and include the per-member hashes in it. A ZIP container without its own crypto is acceptable.
  4. Have the format reviewed and covered by test vectors before acceptance (SDD §10.3 already requires this).
  
  Prefer an established file format if a vetted React Native implementation exists. *Not verified in this review.*
- **Approval required:** Yes. **Outcome: Recorded.**

### R-36 — Data-access layer decision blocks Phase 1
- **Severity:** High  
- **Affected:** `DECISIONS.md` §3 (Drizzle "not yet locked"); `SDD.md` §4.  
- **Problem:** The schema, migrations, repository interfaces, and tests all depend on this choice. Drizzle's Expo path currently uses release-candidate packages (*verified*).  
- **Resolution (Recommendation, O-016):** For V1, use direct parameterized `expo-sqlite` repositories with hand-written, numbered SQL migrations in `src/database/migrations`, tracked through `PRAGMA user_version`. Reasons:
  - the schema is small (≈ 9 tables);
  - CHECK constraints, FTS, and rebuild migrations are hand-written SQL in either approach;
  - keying and cipher verification must happen before any ORM touches the connection;
  - the same SQL files can run in Node-based tests (O-017).

  Revisit Drizzle after its v1 is stable.
- **Approval required:** Yes. **Outcome: Recorded.** Phase 1 blocker.

### R-37 — Persistence test strategy is undefined
- **Severity:** High  
- **Affected:** `TEST_PLAN.md` §2 ("Jest + test database/native test setup"), §5.  
- **Resolution (Recommendation, O-017):**
  1. Unit tests for domain rules, using fakes.
  2. Repository and migration tests in Jest against a Node SQLite driver, executing the **same** migration SQL files behind a minimal database adapter interface.
  3. A small on-device integration suite in a development build covering SQLCipher, keying, migrations, and the separate-connection behavior.
  4. Maestro for end-to-end flows.

  Keep SQL portable between the Node driver and expo-sqlite, and document any divergence.
- **Approval required:** Yes. **Outcome: Recorded.** Phase 1 blocker.

---

## 6. Security and privacy assessment

**Strengths (already in the docs):**
- No hardcoded keys.
- Fail-closed SQLCipher verification.
- No Expo Go evidence accepted.
- Media explicitly not covered by SQLCipher.
- Redacted logs and synthetic fixtures.
- No analytics or ads SDKs.
- Destructive-action confirmations.
- Staged restore.
- An honest store-disclosure caveat.

**Gaps and risks:**

| ID | Risk | Severity | Status |
|---|---|---|---|
| R-32a | OS backups copy the database and media without the key; conflicts with D-011 | Critical | O-018 |
| R-32b | Unreadable database could be overwritten at startup; biometric-bound key would cause data loss | Critical | O-019 |
| R-33 | Attachment protection undesigned | High | O-008 |
| R-35 | Backup KDF and format unselected | High | O-007 |
| R-22 | Notification text on lock screen / OS-held copy | Medium | O-030 |
| R-27 | Photo EXIF GPS metadata retained and exported | Medium | O-031 |
| R-38 | Backup passphrase loss is unrecoverable; no requirement for strength guidance or a warning | Medium | Below |
| R-39 | App lock edge cases: device passcode removed, no biometrics enrolled, lockout; snapshot protection not in requirements | Medium | O-013 |
| R-40 | Temporary plaintext (decrypted media cache, restore staging, export temp file) not covered by cleanup rules | Medium | Below |
| R-41 | Privacy policy must be hosted at a public URL even with no backend | Low | Below |

### R-38 — Backup passphrase handling
- **Severity:** Medium  
- **Recommendation:**
  - Require a minimum passphrase length (for example, 10 characters) with confirmation entry.
  - Warn that a lost passphrase makes the backup unrecoverable.
  - Never store or log the passphrase, and never offer "remember passphrase".
- **Approval:** Yes (fold into O-028).

### R-39 — App-lock edge cases
- **Severity:** Medium  
- **Problem:** UC-13 says "Do not lock the user out of their data without a recovery path", but no recovery path is defined. **Verified:** the error codes `passcode_not_set` and `not_enrolled` exist, and the library cannot detect biometric enrolment changes.  
- **Recommendation (O-013):**
  - App lock uses the device-owner policy (biometrics with passcode fallback) and is a UI gate only; it is not bound to the key.
  - If the device no longer has any credential, the app shows a notice and disables lock rather than locking the user out, since the device itself is now unprotected.
  - Auto-lock options: immediately, 1 minute, 5 minutes.
  - App-switcher protection through `expo-screen-capture`. This is a new dependency and needs approval.
- **Approval:** Yes.

### R-40 — Temporary plaintext cleanup
- **Severity:** Medium  
- **Recommendation:** Add an SDD rule that decrypted media caches, restore staging, and export temp files live under a single app-private temp directory. That directory is purged on startup, after each operation, and (for media caches) on lock. Applied to SDD §9/§10 as a requirement that follows from NFR-023 and NFR-032.
- **Approval:** No. **Outcome: Corrected.**

### R-41 — Privacy policy hosting
- **Severity:** Low  
- **Note:** Both stores require a public privacy-policy URL. A static page (for example, GitHub Pages) does not conflict with "no backend", but someone must own it. Already in `RELEASE_CHECKLIST.md`; no change.

---

## 7. Requirements quality assessment

**Clarity and testability.** Most FRs are clear and testable. The following need measurable criteria or decisions:

| Requirement | Issue | Suggested acceptance criterion |
|---|---|---|
| FR-001 | "Concise" introduction | ≤ 3 screens; skippable; states local-only storage and backup responsibility. |
| FR-051 | "Where applicable" | Defined by O-022 matrix. |
| FR-070 | "Useful summaries", "upcoming" | Upcoming = dated entries and enabled reminders within the next 30 days (including the next yearly occurrence if O-024 is accepted); ≤ 5 items per section with "See all". |
| FR-075 | "Relevant date where available" | Sort by `date_start`, falling back to `starts_at_utc`; undated entries last. |
| FR-083 | "Relevant schedule changes" | Reconcile on app start, foreground after a time-zone change, restore, reminder or entry edit, archive/restore, and delete. |
| FR-092 | "Configurable auto-lock" | Options defined in O-013. |
| NFR-010 | "Feel immediate" | Covered by NFR-011 once the reference device is chosen (O-035). |
| NFR-011 | "Agreed reference device" undefined | Name a device class (for example, a 2022-era mid-range Android phone with 4 GB RAM) before beta. |
| NFR-012 | "Clear busy state" | Progress indicator for operations over 500 ms; cancellable where safe. |
| NFR-041 | "Accommodate system font scaling" | Verified at the largest standard (non-accessibility) size on both platforms; no clipped primary actions. |
| NFR-045 | "Comfortable" | 44 pt / 48 dp minimum (R-31). |

**Functional vs non-functional separation.** Mostly correct. FR-093/FR-094 (key handling, SQLCipher verification) are non-functional security constraints placed in the functional section. This is harmless and left as is to keep IDs stable.

**Prioritization.** Corrected the FR-080 and FR-101 mismatches (R-01, R-02). FR-090 (biometric lock) is *Must* although the feature is optional for users. That is consistent ("must be offered"), so no change.

**Scope consistency.** No requirement exceeds the confirmed V1 scope. Recurring dates (R-19) is the one item where the reviewer recommends a small addition. It is flagged for an explicit include/exclude decision.

---

## 8. Unresolved decisions

All decisions are recorded in [`DECISIONS.md`](./DECISIONS.md) §4 with context, options, recommendation, affected documents, and the phase they are needed by. Summary:

| ID | Decision | Needed by | Blocks Phase 1? |
|---|---|---|---|
| O-001 | App identifier / bundle ID | First dev build that stores real data | **Yes** |
| O-015 | Phase plan and Phase 1 scope | Phase 1 | **Yes** |
| O-016 | Data-access layer (Drizzle vs direct repositories) | Phase 1 | **Yes** |
| O-017 | Persistence test strategy | Phase 1 | **Yes** |
| O-018 | OS device-backup policy | Phase 1 (before the encrypted database) | **Yes** |
| O-019 | Key lifecycle and unreadable-database recovery | Phase 1 | **Yes** |
| O-020 | Fixed seed identities; built-in customization | Phase 1 (identity) / Phase 2 (customization) | **Yes** (identity) |
| O-009 | Expo SDK and minimum OS versions | Project initialization | Recorded at init |
| O-021–O-027 | Status rules, field matrix, Inbox fields, recurrence, archive semantics, search folding, limits | Before the entry model (Phase 2) | No* |
| O-007, O-008, O-028, O-029 | Backup crypto, attachment protection, mandatory encryption, import merge | Before attachments and backup phases | No |
| O-010, O-013, O-030–O-034 | Currency default, app lock, notification content, image intake, reminder lifecycle, delete-all, language | Before the respective feature phase | No |
| O-002–O-004, O-035 | Store name, visual assets, dark tokens, reference device | Before beta or release | No |

\* If Phase 1 creates the `entries` table, O-021, O-024, and O-026 influence its columns. Pre-release migrations may still be revised (see the proposed definition of "released migration" in O-016), so these can follow in Phase 2 without risk.

---

## 9. Recommended corrections

### 9.1 Applied in this change

| File | Change | Finding |
|---|---|---|
| `docs/DECISIONS.md` | Restructured to Confirmed/Proposed/Open/Superseded with "Needed by"; promoted brief- and `CLAUDE.md`-confirmed items; D-003 adds "personal"; O-005/006/011/012/014 → Proposed; existing O-items updated with verified facts; new O-015–O-035; new change-control and governance rules; technology table statuses | R-07, R-08, R-09, R-10 and all "Recorded" findings |
| `CLAUDE.md` | Added the decision-management workflow; corrected the attachment-design reference; added the key-lifecycle and OS-backup guardrails pending decisions | R-10, R-11, R-32a/b |
| `docs/SRS.md` | FR-045 references O-021; FR-046 wording; FR-073 and FR-092 priorities; FR-080 → Must; FR-101 → Must; traceability adds `DECISIONS.md` | R-01–R-04, R-12, R-15 |
| `docs/SDD.md` | §4 table: SecureStore caveat, document picker and sharing (Proposed); §8.1 separate-connection and key-state notes; §10.3 device-key vs backup-key note; §10.4 restore modes; §9/§10 temp plaintext cleanup; §11 verified platform constraints | R-05, R-21, R-30, R-32b, R-40 |
| `docs/DATABASE_DESIGN.md` | §3.3 type FK RESTRICT; §5 seed identity pending O-020; §6 cascade-vs-file-cleanup note; §8 FK-safe table-rebuild rule | R-24, R-34 |
| `docs/USE_CASES.md` | UC-14 references O-028; UC-01 references O-019 for key-state recovery | R-06, R-32b |
| `docs/TEST_PLAN.md` | Biometric-change case made observable; key-state, OS-restore, rebuild-cascade, and separate-connection tests | R-32b, R-34, R-39 |
| `docs/diagrams/application-architecture.mmd`, `data-model.mmd` | Drift fixes | R-14 |
| `README.md` | Reading list adds this review; decision-status note | R-15 |

### 9.2 Pending approval (do not apply until decided)

Apply the recommendations attached to O-007, O-008, O-013, O-015–O-035 by updating `DECISIONS.md` (status → Confirmed) and every affected document in the same change, following the workflow now in `CLAUDE.md`.

---

## 10. Phase 1 readiness assessment

### Verdict: **Not ready — decisions required**

The documentation corrections are done. What remains is a short list of decisions, most of which are quick to make. Several can be settled by a time-boxed technical spike (Phase 0) that can start immediately, because the spike itself is not product implementation.

### Prioritized blockers

1. **O-019 — Key lifecycle and unreadable-database recovery** (Critical). Defines the startup code path; without it, Phase 1 risks data-destroying defaults.
2. **O-018 — OS device-backup policy** (Critical). Determines app-config flags and storage locations at initialization; conflicts with D-011 if left unset.
3. **O-015 — Phase plan and Phase 1 scope** (High). `CLAUDE.md` requires working phase by phase, but no phase is defined.
4. **O-016 — Data-access layer** (High). Shapes schema, migrations, repositories, and tests.
5. **O-017 — Persistence test strategy** (High). Required by the "tests with every slice" workflow.
6. **O-020 (identity part) — Fixed UUIDs for built-in rows** (High). Seeds are written in Phase 1 and become a backup-compatibility contract.
7. **O-001 — App identifier** (High for Phase 1). The bundle ID ties Keychain and sandbox data. Changing it after testers store data loses that data.

### Proposed phase plan (recorded as O-015, Proposed)

| Phase | Content |
|---|---|
| 0 — Technical spikes | Custom dev builds on Android and iOS: SQLCipher `cipher_version`, raw-key `PRAGMA key`, plain-open failure, wrong-key detection, separate-connection behavior; OS backup exclusion (Android flag, iOS exclude attribute); Node-driver test harness running the migration SQL; `expo-crypto` AES-GCM on device. KDF candidate check can trail. Output: spike notes and decisions O-016–O-019. |
| 1 — Foundation | Expo project init (SDK recorded); Expo Router shell (4 tabs + capture modal placeholder); semantic tokens (light final, dark provisional); i18n scaffolding en/tr; settings persistence; key management + encrypted database bootstrap + fail-closed + key-state recovery; migration runner; initial schema; idempotent seeds with fixed IDs; domain types and invariants (Inbox, templates, statuses); repositories for types/categories/collections/entries; CI (lint, typecheck, unit/repository tests). |
| 2 — Organize | Collections, types, categories (CRUD, archive); entries with template-driven forms; Quick Capture and Inbox assignment; status, priority, pin, archive. |
| 3 — Enrich and find | Links, tags, attachments (per O-008), search and filters, Home dashboard. |
| 4 — Remind and protect | Reminders and notification reconciliation; app lock. |
| 5 — Portability | Full backup, collection export/import, restore, delete-all. |
| 6 — Harden and release | Accessibility, performance on the reference device, store assets, privacy disclosures, release checklist. |

### Phase 1 entry checklist

- [ ] O-015 Phase plan and Phase 1 scope approved.
- [ ] O-001 Android application ID and iOS bundle identifier chosen.
- [ ] O-009 Expo SDK version selected at init; minimum Android/iOS versions recorded.
- [ ] O-016 Data-access approach decided (direct repositories or Drizzle with a pinned version).
- [ ] O-017 Persistence test strategy approved.
- [ ] O-018 OS device-backup policy approved, and its implementation path verified in the spike (especially iOS).
- [ ] O-019 Key lifecycle approved: key classes, no `requireAuthentication`, quarantine-and-recover behavior.
- [ ] O-020 Fixed UUIDs for built-in collection types and categories approved.
- [ ] Phase 0 spike passed on a **physical Android device and a physical iPhone**: `PRAGMA cipher_version` returns a version; the database file cannot be opened without the key; a wrong key is detected; every connection path is keyed.
- [ ] Phase 1 schema scope agreed: either the full V1 schema (then also settle O-021, O-024, O-026) or the core tables only, with the rest added by later pre-release migrations.
- [ ] Definition of a "released migration" agreed (proposed in O-016: frozen once any build containing it has stored data the owner wants to keep).
- [ ] `DECISIONS.md` updated for every decision above, and affected documents synchronized.

### Safely deferrable

O-002–O-004 (branding/store), O-007/O-008/O-028/O-029 (crypto and backup design, before their phases), O-010, O-013, O-021–O-027, O-030–O-035. These must be settled before their phases begin, not before Phase 1.

---

## 11. Verification log

Checked on 8 November 2026 against current official sources:

| Claim | Source | Result |
|---|---|---|
| SQLCipher via `useSQLCipher` plugin; not in Expo Go; `PRAGMA key` silently ignored without SQLCipher; `PRAGMA cipher_version` check | [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) | Verified; SDD §8.1 accurate |
| `enableFTS` default `true` | Expo SQLite | Verified |
| `withExclusiveTransactionAsync()` uses a new connection; `foreign_keys` pragma no effect inside a transaction | Expo SQLite | Verified |
| SecureStore uninstall behavior, `requireAuthentication` invalidation on biometric change, accessibility classes, Android Auto Backup exclusion, payload-size caution | [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) | Verified |
| `expo-file-system` new API (`File`, `Directory`, `Paths`, `FileHandle`); legacy API at `expo-file-system/legacy`; no backup-exclusion API found | [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) | Verified (absence based on API reference review) |
| `expo-crypto` AES-GCM; no password KDF | [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/) | Verified |
| Local notifications in Expo Go; boot rescheduling; Android 12+/14+ exact-alarm rules; Play restriction on `USE_EXACT_ALARM`; yearly trigger | [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) | Verified |
| iOS 64 pending local notification limit | [Apple Developer Forums](https://developer.apple.com/forums/thread/811171) and Apple's legacy notification guide | Verified for the limit; eviction policy of the current API unclear |
| Face ID not in Expo Go; fallback options; error codes; no enrolment-change API | [Expo LocalAuthentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/) | Verified |
| App-switcher protection API | [Expo ScreenCapture](https://docs.expo.dev/versions/latest/sdk/screen-capture/) | Verified |
| Image library picker needs no permission; camera does; EXIF opt-in | [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) | Verified |
| `getLocales()`/`getCalendars()`, `currencyCode`, `supportedLocales` per-app language | [Expo Localization](https://docs.expo.dev/versions/latest/sdk/localization/) | Verified |
| Document picker and sharing modules | [Expo DocumentPicker](https://docs.expo.dev/versions/latest/sdk/document-picker/), [Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/) | Verified (existence and role) |
| Drizzle Expo integration: RC packages, Babel/Metro config, bundled migrations | [Drizzle — Expo SQLite](https://orm.drizzle.team/docs/connect-expo-sqlite) | Verified at review time |
| Google Play: new personal accounts need a 12-tester, 14-day closed test | [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465) | Verified; checklist accurate |

**Not verified in this review (treat as assumptions):**
- Drizzle migrator transaction semantics.
- Raw-key `PRAGMA key` syntax on Expo's SQLCipher build.
- The iOS exclude-from-backup implementation path in Expo.
- Atomicity of `File.move()`.
- Hermes `Intl` completeness for `tr-TR`.
- Availability and API of Expo's image-manipulation module (its documentation path did not resolve).
- KDF libraries (`react-native-quick-crypto`, libsodium bindings) on the chosen SDK and New Architecture.
- Absence of a Node runtime for `expo-sqlite`.
- Apple export-compliance answers for SQLCipher and backup encryption (already flagged in `RELEASE_CHECKLIST.md`).
