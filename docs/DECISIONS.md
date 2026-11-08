# Memento — Product and Technical Decisions Register

**Baseline:** 0.3  
**Recorded:** 8 November 2026 (baseline 0.1); restructured 8 November 2026 after the pre-Phase 1 documentation review ([`DOCUMENTATION_REVIEW.md`](./DOCUMENTATION_REVIEW.md)); 0.3 records the product owner's 8 November 2026 approvals (O-001, O-015, O-016, O-017, O-018, O-019, O-020, O-036 to O-041), the Phase 0 findings, and the Phase 0 closure (G-003) ([`PHASE_0_REPORT.md`](./PHASE_0_REPORT.md)).  
**Status:** Phase 0 concluded 8 November 2026 with native validation carried forward as Phase 1 gates (G-003). Product implementation has not started; Phase 1 is next.

**Note on option letters (8 Nov 2026).** The approval message referred to decisions by option letter (for example "O-019 — Option B"). This register and the review recorded each of these decisions as one recommendation, sometimes with an alternative, but without option letters. Where the approval message also described the chosen content, that description was matched against the recorded recommendation and the content is recorded below. Where it did not (O-017), the decision was held as Proposed until the product owner clarified it later the same day ("go with recommended"), which also confirmed O-036 to O-041.

This register is the central record of Memento's product and architecture decisions. Implementation must follow the latest **Confirmed** decision. A **Proposed** or **Open** item must never be silently treated as approved.

## Status definitions

| Status | Meaning |
|---|---|
| **Confirmed** | Explicitly agreed by the product owner, or mandated by the project instructions in root `CLAUDE.md`. Implement it. |
| **Proposed** | A recommended approach, sometimes already written into a specification, awaiting product-owner approval. It may guide planning, but implementation that depends on it must flag the dependency, and the decision must be confirmed before the affected feature is accepted. |
| **Open** | Needs clarification or a choice. Do not implement behavior that depends on it; ask. |
| **Superseded** | Replaced by a newer decision. Kept for history, with a pointer to the replacement. |

The **Needed by** column states the latest point at which an Open/Proposed item must be settled. "Phase 1" means it blocks the start of Phase 1.

## 1. Product-owner-confirmed decisions

| ID | Area | Decision | Status |
|---|---|---|---|
| D-001 | Name | The app is named **Memento**. | Confirmed |
| D-002 | Audience | Memento is life-oriented: it organizes information about people, spaces, projects, events, and everyday life, not only romantic relationships. | Confirmed |
| D-003 | Visual personality | Warm, minimal, modern, and personal. *(Updated 8 Nov 2026: "personal" added to match the product-owner brief and PRD §10.1.)* | Confirmed |
| D-004 | Color palette | `#5D2A42`, `#FB6376`, `#FCB1A6`, `#FFDCCC`, `#FFF9EC`. | Confirmed |
| D-005 | Themes | Support both light and dark themes. | Confirmed |
| D-006 | Collection model | Support flexible collection types. | Confirmed |
| D-007 | Categories | Provide predefined categories and allow custom categories. | Confirmed |
| D-008 | Entry information | Support photos, links, dates, price, priority, location, and tags. | Confirmed |
| D-009 | Storage | Offline/local-device storage (offline-first architecture). | Confirmed |
| D-010 | Portability | Users must be able to export and import their information. | Confirmed |
| D-011 | Backup style | Manual backup rather than automatic cloud backup. | Confirmed |
| D-012 | V1 ambition | Build a complete, useful first release rather than an extremely limited proof of concept. | Confirmed; scope must remain controlled |
| D-013 | Localization | English and Turkish. | Confirmed |
| D-014 | Platforms | Android and iOS, distributed through Google Play and Apple App Store. | Confirmed |
| D-015 | Framework | React Native. | Confirmed |

## 2. Product-design decisions

Rows were previously all labelled "adopted baselines". Statuses below reflect the product-owner brief of 8 November 2026 ("established product decisions") and the mandatory rules in root `CLAUDE.md`.

| ID | Area | Decision | Status | Source / note |
|---|---|---|---|---|
| B-001 | Product definition | A private personal life organizer, offline-first, for people, spaces, projects, events, and everyday life. | Confirmed | Product-owner brief |
| B-002 | Tagline | “Remember the little things.” | Confirmed | Product-owner brief |
| B-003 | Collections | Built-in types Person, Space, Project, Event, General, plus user-defined types. | Confirmed | Brief ("flexible built-in and custom collection types"); `CLAUDE.md` product invariants |
| B-004 | Category scope | Categories are global and reusable across collections in V1. | Proposed | Adopted in SRS FR-023; see O-005 |
| B-005 | Category templates | Categories use one of the reusable templates `NOTE`, `TASK`, `WISHLIST`, `EVENT`, `PREFERENCE`; entry fields depend on the template. No arbitrary form builder. | Confirmed | Brief ("reusable templates", "category-dependent entry fields"); `CLAUDE.md`. Field details: O-022 |
| B-006 | Entry ownership | An assigned entry belongs to exactly one collection and one category; Inbox entries have neither. | Confirmed | `CLAUDE.md` Inbox rule |
| B-007 | Inbox | Quick Capture Inbox for unsorted entries. | Confirmed | Product-owner brief |
| B-008 | Navigation | Four primary areas: Home, Collections, Search, Settings; quick-add globally accessible. | Proposed | PRD §9, SDD §7.1 |
| B-009 | Sharing | Private collections with export/import; no live sharing or collaboration in V1. | Confirmed | Product-owner brief |
| B-010 | Backend | No mandatory account, backend, or cloud sync in V1. | Confirmed | Product-owner brief |
| B-011 | Monetization | Free initial release; no advertising or subscriptions in V1. | Confirmed | Product-owner brief |
| B-012 | Reminders | Local notifications and reminders in V1. | Confirmed | Product-owner brief |
| B-013 | Security | Local SQLite storage with database encryption; SQLCipher is the required target and must be verified in real native builds. Attachment and backup encryption are designed separately (O-007, O-008). | Confirmed (database encryption) | Brief; `CLAUDE.md` security rules |
| B-014 | Backup | Manual full backup, plus collection export/import, including attachments. | Confirmed | Brief. Whether encryption is mandatory: O-028 |
| B-015 | Themes | System / Light / Dark appearance settings. | Confirmed | Brief (light and dark); `CLAUDE.md` (System/Light/Dark) |

## 3. Technology decisions

Status reflects the product-owner brief ("React Native + Expo + TypeScript") and `CLAUDE.md` architecture rules. Library choices not covered by either remain Proposed. Evidence from the 8 Nov 2026 verification is summarized in [`DOCUMENTATION_REVIEW.md` §5 and §11](./DOCUMENTATION_REVIEW.md#5-technical-feasibility-assessment).

| Area | Choice | Status | Caveat |
|---|---|---|---|
| Runtime/framework | React Native + Expo | Confirmed | The scaffold installs Expo SDK 58 (React Native 0.88.1); formal selection and minimum OS versions remain O-009. Expo SDK 58 CLI requires Node ≥ 22.13. |
| Target platforms in code | Android and iOS only; no web target | Confirmed (D-014, V1 exclusion "Web application") | Web dependencies (`react-native-web`, `react-dom`), web config, and `.web.tsx` files were removed from the scaffold on 8 Nov 2026. |
| Language | TypeScript | Confirmed | Strict mode. |
| Navigation | Expo Router | Confirmed | `CLAUDE.md` architecture rule. |
| Data access pattern | Repository interfaces; no SQL in UI/routes | Confirmed | `CLAUDE.md` architecture rule. |
| Local database | `expo-sqlite` | Confirmed (O-016, 8 Nov 2026) | Provides the SQLCipher config plugin and FTS5. Phase 0 used `expo-sqlite` 58.0.15 (Expo SDK 58). |
| Database encryption | SQLCipher through the `expo-sqlite` config plugin (`useSQLCipher`) | Proposed (mechanism) | Encryption target is Confirmed (B-013). Requires custom builds. Not yet verified on any device: Phase 0 was concluded before a native build completed (G-003). On-device verification on Android and iOS is a Phase 1 gate. |
| ORM / query layer | No ORM. Hand-written, parameterized SQL in repositories; numbered SQL migrations tracked with `PRAGMA user_version` | Confirmed (O-016, 8 Nov 2026) | An ORM may be introduced only by a later decision. |
| Password KDF (backups) | `react-native-quick-crypto` Argon2id (candidate) | Open (part of O-007) | Checked from documentation and source only; not run on a device (`PHASE_0_REPORT.md` §4.4). New native dependency (Nitro Modules); not approved. |
| iOS backup exclusion | Small local Expo module that sets `isExcludedFromBackup` on Memento's data directories | Confirmed approach (O-039) | Expo FileSystem has no backup-exclusion API (verified). Unverified on device: needs macOS/EAS and a physical iPhone (Phase 1 gate). |
| Validation | Zod | Proposed | |
| Forms | React Hook Form | Proposed | |
| Secure key storage | Expo SecureStore | Confirmed (O-019, 8 Nov 2026) | Data keys use `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` and never `requireAuthentication`. |
| Biometrics / app lock | Expo Local Authentication | Proposed | See O-013. |
| App-switcher protection | Expo ScreenCapture | Proposed | New dependency; see O-013. |
| Image selection | Expo ImagePicker (library only) | Proposed | See O-031. |
| Local files | Expo FileSystem (new `File`/`Directory` API) | Proposed | |
| Backup file pick / share | Expo DocumentPicker, Expo Sharing | Proposed | Added by review R-30. |
| Symmetric encryption | `expo-crypto` AES-GCM | Proposed | Verified available; no password KDF (O-007). |
| Local notifications | Expo Notifications | Proposed | |
| Localization | i18next + Expo Localization | Proposed | |
| Testing | Jest (`jest-expo` preset), React Native Testing Library, Maestro | Jest Confirmed via O-017 and installed; other tools Proposed | Node-side SQLite driver for repository tests: `sql.js` worked on Node 20 in Phase 0; choose the driver with the CI Node version. |
| Lint | ESLint 9 + `eslint-config-expo` (flat config) | Proposed | Installed 8 Nov 2026 to provide the lint step required by `CLAUDE.md`; Expo's default. Formatter (e.g. Prettier) not chosen. |
| CI | GitHub Actions | Proposed | |
| Builds/submission | EAS Build / EAS Submit | Proposed | |

## 4. Open and proposed decisions — do not guess silently

Each row lists the question, current recommendation, affected documents, the status, and when it is needed. Context and options for O-015 onward are in the referenced review findings.

| ID | Question | Recommendation / current direction | Affected docs | Status | Needed by |
|---|---|---|---|---|---|
| O-001 | Final Android application ID / iOS bundle ID | **Decided:** `com.aubreyzip.memento` for both the Android application ID and the iOS bundle identifier. Permanent: Keychain items and the app sandbox are tied to it, so it must not change once anyone stores data they want to keep. Spike and test builds use a different suffix (Phase 0 used `com.aubreyzip.memento.p0probe`) so they never share storage with the real app. Registration in App Store Connect and the first Play upload are still to do (RELEASE_CHECKLIST §1). | RELEASE_CHECKLIST, CLAUDE.md | **Confirmed** (product owner, 8 Nov 2026) | — |
| O-002 | Public store name and trademark clearance | “Memento” is the working name; check store conflicts and trademark databases. | PRD §10.1, RELEASE_CHECKLIST | Open | Before store submission |
| O-003 | Final logo, icon, typography, illustration style | Palette and warm-minimal direction set; assets to be designed. | PRD §10 | Open | Before beta |
| O-004 | Exact dark-theme token values | Burgundy-tinted dark palette; validate contrast. Provisional values are in `src/design-system/tokens.ts` (background `#1F1218`, surface `#2D1B23`, text cream, secondary text `#BCB4AC`, primary soft coral); all text pairs pass 4.5:1 in the token tests. | PRD §10.2, SDD §7.2 | Open | Before dark-theme acceptance (provisional values allowed in Phase 1) |
| O-005 | Custom category reuse | Categories are global/reusable across collections. | SRS FR-023, DATABASE_DESIGN §3.4 | Proposed (adopted in SRS) | Phase 2 |
| O-006 | Category deletion | System categories cannot be deleted; custom categories in use must be archived or reassigned before deletion. | SRS FR-025, DATABASE_DESIGN §6 | Proposed (adopted in SRS) | Phase 2 |
| O-007 | Backup cryptographic format and KDF | Never write custom crypto. Verified: `expo-crypto` has AES-GCM but no password KDF. Recommend a vetted Argon2id (or scrypt) KDF library; encrypt each archive member as an independent AES-GCM blob with AAD binding path and format version; encrypted manifest with member hashes; test vectors and review before acceptance. (Review R-35.) Phase 0 (documentation and source only, not run on a device): `react-native-quick-crypto` 1.1.9 ships `argon2` (argon2id, RFC 9106 parameters incl. secret and associated data) and `scrypt`; it needs `react-native-nitro-modules` and a config plugin, and does not run in Expo Go; its docs page shows a different `argon2` parameter shape from the shipped code. Device verification (RFC 9106 vector, timing, cross-implementation check) is a Phase 5 entry gate. | SDD §10.3, SRS FR-103, NFR-033 | Open | Phase 5 (before backup work) |
| O-008 | Attachment encryption at rest | Recommend **Option A**: per-file AES-GCM via `expo-crypto` with a per-install media key in SecureStore (random IV per file, attachment ID as AAD); thumbnails encrypted too; decrypt to cache for display; purge cache on lock/startup. Option B (OS file protection only + documented exception) is simpler but weaker. Attachment work must not start until decided; per O-037 it must be decided before Phase 3. (Review R-33) | SDD §9, SRS NFR-032, CLAUDE.md | Open | **Phase 3** |
| O-009 | Expo SDK and minimum Android/iOS versions | Choose at project init from the then-current SDK; record here. The scaffold already uses SDK 58 (current release); confirming it and the minimum OS versions is still the product owner's decision. | SRS NFR-051 | Open | **Phase 1** |
| O-010 | Price currency default | Store ISO 4217 code per price. Recommend a `default_currency_code` setting initialized from the device region's `currencyCode` (verified available via Expo Localization), editable in Settings. Do not assume TRY. | SRS §6, DATABASE_DESIGN §7 | Open | Phase 3 (entry forms) |
| O-011 | Location coordinates/maps | V1 is user-entered text/address only; no location permission or map SDK. | SRS FR-053, §6 | Proposed (adopted in SRS) | Phase 3 |
| O-012 | Standalone photo share/export | Not in V1; photos leave the app only inside backups/exports. | PRD §8 | Proposed | Phase 3 |
| O-013 | App lock behavior | App lock is a UI gate (biometric with device-passcode fallback), not bound to data keys. Manual lock always available; auto-lock options: immediately / 1 min / 5 min. If the device no longer has any credential, show a notice and disable lock rather than locking the user out. App-switcher protection via `expo-screen-capture` (new dependency). (Review R-39) | SRS FR-090–092, UC-13, TEST_PLAN §7 | Open | Before app-lock phase |
| O-014 | Custom collection type deletion | Prevent deletion while in use; allow archive. | SRS FR-015, UC-03 | Proposed (adopted in SRS) | Phase 2 |
| O-015 | Phase plan | **Decided:** seven phases. 0 Technical validation and proofs of concept; 1 Project foundation and infrastructure; 2 Collections and categories; 3 Entries and Quick Capture Inbox; 4 Dashboard, search, and reminders; 5 Security, encryption, and backups; 6 Testing, polish, and store release. Phase content and exit criteria: [`ROADMAP.md`](./ROADMAP.md). A phase starts only after the previous phase has been evaluated and its blocking issues resolved. Replaces the review's six-phase recommendation (§6, S-001). Open placement questions raised by this plan: O-036, O-037. | ROADMAP, CLAUDE.md, README | **Confirmed** (product owner, 8 Nov 2026) | — |
| O-016 | Data-access layer | **Decided:** plain SQL with `expo-sqlite` behind repository interfaces. Parameterized, hand-written SQL; numbered SQL migration files tracked with `PRAGMA user_version`; no ORM in V1 unless a later decision justifies one. The definition of a "released migration" is split out as O-040. (Review R-36) | SDD §4, §8, DATABASE_DESIGN §8, CLAUDE.md | **Confirmed** (product owner, 8 Nov 2026) | — |
| O-017 | Persistence test strategy | **Decided:** (1) unit tests with fakes; (2) repository and migration tests in Jest on a Node SQLite driver executing the **same** migration SQL files behind a minimal adapter; (3) a small on-device integration suite in a development build for SQLCipher, keying, migrations, and connection behavior; (4) Maestro E2E. Clarification: the 8 Nov approval of "Option A" referred to this strategy, the only one recorded (confirmed by "go with recommended"). Phase 0: the Node side works with `sql.js` 1.15.2 on Node 20; `better-sqlite3` 13 needs Node ≥ 22. Pin the Node version in CI. (Review R-37) | TEST_PLAN §2, §5 | **Confirmed** (product owner, 8 Nov 2026: "go with recommended") | — |
| O-018 | OS device-backup policy | **Decided:** exclude Memento's private app data (database, attachments, keys, settings, staging) from automatic Android and iOS device backups and device-to-device transfers. Memento's own manual backup and restore is the supported backup mechanism; users may store exported backup files wherever they choose, including external or cloud storage. Onboarding states that moving to a new phone requires a Memento backup. Implementation and verification: Android, `allowBackup="false"` **plus** `dataExtractionRules` excluding all domains for both cloud backup and device transfer, because Android documents that `allowBackup="false"` alone does not stop device-to-device transfer on some devices (Phase 0, SDD §12.4); iOS, O-039. Exclusion is best effort on iOS (Apple: not a guarantee), so the O-019 recovery path remains mandatory. (Review R-32a) | SDD §8.1, §12, PRD §11, RELEASE_CHECKLIST §4, CLAUDE.md | **Confirmed** (product owner, 8 Nov 2026) | — |
| O-019 | Key lifecycle and unreadable-database recovery | **Decided:** preserve inaccessible databases. The database key and media key are independent random 256-bit secrets in SecureStore with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` and **without** `requireAuthentication`; the database is keyed with a raw key. The app never deletes, overwrites, or recreates an existing database file on its own. If the key is missing or wrong, the database file and its `-wal`/`-shm`/`-journal` sidecars are moved to a quarantine name and the user sees a recovery screen: "Restore from a Memento backup" or "Start fresh". "Start fresh" creates a new database; the quarantined file is deleted only after its own explicit confirmation, and is otherwise kept. Flow: SDD §8.1.1 and UC-01. (Review R-32b) | SDD §8.1, §12, UC-01, TEST_PLAN §7, CLAUDE.md | **Confirmed** (product owner, 8 Nov 2026) | — |
| O-020 | Built-in seed identity | **Decided:** built-in collection types and categories have stable, permanent identifiers that never change between installs or versions, plus a unique `key`. User-created types and categories use random UUIDs (v4). The built-in ID namespace is reserved: user-created rows and imported custom rows may never use an ID inside it. Exact ID format: O-038. Customizing built-ins (formerly part (b) of this item) moved to O-041. (Review R-24) | DATABASE_DESIGN §5, SRS FR-026 | **Confirmed** (product owner, 8 Nov 2026) | — |
| O-021 | Status rules | Status required for TASK/WISHLIST/EVENT, default `TODO`/`SAVED`/`IDEA`; NULL for NOTE/PREFERENCE and Inbox. Template change resets to the new default; move to Inbox clears it. `completed_at` set for `COMPLETED`/`PURCHASED`, cleared otherwise. "Pending" = TASK-template entry not `COMPLETED` and not archived. (Review R-04, R-17) | SRS FR-045, §4.6, SDD §8.4, DATABASE_DESIGN §3.5 | Open | Phase 3 (entry model) |
| O-022 | Template field-applicability matrix | Matrix in review R-16. Templates decide which empty fields are offered; populated values are preserved and shown when an entry changes template or moves to Inbox. | PRD §6.3, SRS FR-024, FR-051, FR-060–064 | Open | Phase 3 |
| O-023 | Inbox entry capabilities | Inbox entries may have description, links, photos, tags, a reminder, pin and archive; never a status; template fields only after assignment. (Review R-18) | PRD §6.4, SRS FR-030–035 | Open | Phase 3 |
| O-024 | Recurring dates | Include minimal yearly recurrence (`NONE`/`YEARLY`) for all-day dates and a yearly reminder option; or explicitly add recurrence to V1 exclusions. (Review R-19) | PRD §6.2, SRS FR-051, FR-070, FR-080, DATABASE_DESIGN §3.5, §3.10 | Open | Phase 3 |
| O-025 | Archive semantics | Single term "Archive" and `archived_at` on collections, entries, categories, and types. Archived collection hides its entries from Home and default search, accepts no new entries; archiving cancels pending notifications; restoring re-schedules future ones. (Review R-13, R-20) | SRS FR-010, FR-015, FR-025, FR-040, DATABASE_DESIGN §3, §6 | Open | Phase 2 |
| O-026 | Search normalization | Normalized search column computed in TypeScript (NFKD, strip marks, fold `İ I ı i` → `i`, lowercase); same fold for queries and tag normalization; FTS5 optional. (Review R-23) | SRS FR-073, SDD §8.5, TEST_PLAN §5 | Open | Phase 3 (schema) / Phase 4 (search) |
| O-027 | Field and size limits | Title 160; description 10,000; names 60; tag 40; links/entry 20; URL 2,048; photos/entry 10; image intake ≤ 20 MB then re-encoded. (Review R-26) | SRS §6 | Open | Phase 2 (names) / Phase 3 (entry fields) |
| O-028 | Backup encryption mandatory? | Backups always passphrase-encrypted; no plaintext export in V1; backup feature blocked rather than shipped unencrypted if no vetted implementation passes review. Minimum passphrase length (e.g. 10) with confirmation; warn that a lost passphrase is unrecoverable. (Review R-06, R-38) | SRS NFR-033, UC-14, TEST_PLAN §7 | Open | Before backup phase |
| O-029 | Collection import merge rules | System rows by fixed ID; custom types/categories by UUID (existing rows not overwritten; no name-based merge); tags by normalized name; "import as copy" re-IDs the collection and its dependents. (Review R-29) | SRS FR-106, DATABASE_DESIGN §9 | Open | Before backup phase |
| O-030 | Reminder notification content | "Hide reminder content" setting; on by default when app lock is enabled. Disclose OS-held notification content. (Review R-22) | SDD §11, PRD §11 | Open | Before reminders phase |
| O-031 | Image intake | Library picker only (no camera permission) in V1; re-encode on intake to strip EXIF/GPS and cap long edge (e.g. 2048 px). (Review R-27) | SRS FR-049/050, SDD §9, PRD §11 | Open | Phase 3 |
| O-032 | Reminder lifecycle rules | Multiple reminders per entry; fired reminders kept as history; reminders are absolute instants shown in device time zone; completing an entry does not auto-cancel reminders; exact-alarm permission requested only when the user creates a timed reminder. (Review R-21) | SRS FR-080–084, SDD §11, DATABASE_DESIGN §3.10 | Open | Before reminders phase |
| O-033 | Delete-all-data semantics | Close the database; delete DB files (incl. WAL/SHM), media, thumbnails, staging/cache, all scheduled notifications, and SecureStore keys; reset settings; return to onboarding. (Review R-28) | SRS FR-107, UC-16, TEST_PLAN T-028 | Open | Before data-management phase |
| O-034 | Language source of truth | In-app setting System / English / Türkçe; "System" follows OS per-app or device language; re-read locale on foreground. (Review R-32) | SRS FR-003, FR-005 | Open | Phase 1 (i18n scaffolding) — low risk |
| O-035 | Performance reference device | Name a device class (e.g. 2022-era mid-range Android, 4 GB RAM) and an iPhone model for NFR-011 measurements. | SRS NFR-011, TEST_PLAN §9 | Open | Before beta |
| O-036 | Where database encryption is built in the phase plan | **Decided:** Phase 1 builds the encrypted database foundation: SQLCipher build flag, `cipher_version` fail-closed check, key generation and storage, O-019 recovery, and O-018 exclusion. Phase 5 covers attachment encryption hardening, app lock, backup/restore cryptography, and delete-all. Reason: avoids a later plaintext-to-encrypted conversion of user data and keeps Phase 1–4 testing representative. | ROADMAP, SDD §8.1, CLAUDE.md | **Confirmed** (product owner, 8 Nov 2026: "go with recommended") | — |
| O-037 | Where photo attachments are built | **Decided:** photos are built in Phase 3 with their final protection. O-008 (attachment encryption), O-031 (image intake), and O-012 must therefore be settled before Phase 3 starts. | ROADMAP, SDD §9 | **Confirmed** (product owner, 8 Nov 2026: "go with recommended") | — |
| O-038 | Built-in ID format (implements O-020) | **Decided:** RFC 9562 version-8 UUIDs with the fixed prefix `4d454d30` (ASCII "MEM0"): `4d454d30-0000-8000-8TTT-NNNNNNNNNNNN`, where `TTT` is the table (`000` collection types, `001` categories) and `N` is a sequence. Random v4 UUIDs can never fall in this namespace because their version digit is 4, not 8. Seeds and import validation reject custom rows in the namespace. Validated in the Phase 0 Node harness. | DATABASE_DESIGN §5 | **Confirmed** (product owner, 8 Nov 2026: "go with recommended") | — |
| O-039 | iOS backup-exclusion mechanism (implements O-018) | **Decided:** a small local Expo module sets `URLResourceValues.isExcludedFromBackup` on Memento's data directory (database, media, staging) at startup and after creating files, because Apple notes some file operations reset the flag. Expo FileSystem (SDK 58) has no backup-exclusion API (verified). Apple states the flag is guidance, not a guarantee, so O-019 recovery stays mandatory. **Not yet verified:** needs a macOS/EAS build and a physical iPhone (device backup and Quick Start transfer); this is a Phase 1 acceptance gate before iOS builds store real data. | SDD §12.4, TEST_PLAN §7 | **Confirmed** (product owner, 8 Nov 2026: "go with recommended") (approach) | — |
| O-040 | Definition of a "released migration" | **Decided:** a migration is frozen once any build containing it has stored data the owner wants to keep, including the owner's own long-lived test installs. Before that point, pre-release migrations may be edited. | DATABASE_DESIGN §8, CLAUDE.md | **Confirmed** (product owner, 8 Nov 2026: "go with recommended") | — |
| O-041 | Customizing built-in types and categories | **Decided:** built-ins can be reordered and archived (hidden), not renamed or deleted; icon and color overrides are optional. (Review R-25) | SRS FR-011, FR-020, FR-025 | **Confirmed** (product owner, 8 Nov 2026: "go with recommended") | — |
| O-042 | Accent color contrast | Found while applying tokens (8 Nov 2026): coral `#FB6376` on cream is 2.80:1, below even the 3:1 minimum for non-text UI elements. Options: (a) coral is decorative only, never text and never the only state indicator, with burgundy carrying state (current token rule); (b) add a darker accent shade for interactive states (a palette change, so D-004 would need owner approval). | PRD §10.2, SDD §7.2 | Open | Phase 2 (first interactive components) |

## 5. Explicit V1 exclusions

- User accounts and authentication against a server.
- Backend APIs or hosted database.
- Cloud backup and synchronization.
- Multi-user shared collections or collaboration.
- Web application.
- AI assistant or remote AI processing.
- Social features.
- Ads, subscriptions, or payment processing.
- Arbitrary user-defined entry forms or arbitrary custom field schemas.
- Automatic translation of user-created content.
- Background location tracking or access to contacts.

## 6. Superseded decisions

| ID | Former decision | Superseded by | Date |
|---|---|---|---|
| G-000 | Change-control statuses `Confirmed`, `Proposed`, `Superseded`, `Deferred`. | G-001 (four-status model with "Needed by" in place of `Deferred`). | 8 Nov 2026 |
| S-001 | Recommended phase plan in the review (O-015 recommendation): 0 Technical spikes; 1 Foundation; 2 Organize; 3 Enrich and find; 4 Remind and protect; 5 Portability; 6 Harden and release. | O-015 as confirmed by the product owner (seven phases in `ROADMAP.md`). | 8 Nov 2026 |
| S-002 | O-020 part (b), customization of built-ins, bundled with seed identity. | O-041 (split out; still Open). | 8 Nov 2026 |
| S-003 | O-016 sub-item: definition of a "released migration". | O-040 (split out; Confirmed 8 Nov 2026). | 8 Nov 2026 |

## 7. Governance and change control

| ID | Rule | Status |
|---|---|---|
| G-001 | Decisions use exactly four statuses: Confirmed, Proposed, Open, Superseded. Deferral is expressed with the "Needed by" column. | Confirmed (product-owner brief) |
| G-002 | `DECISIONS.md` is the central decision register. Every decision change updates this file **and** every affected source document in the same change. | Confirmed (product-owner brief) |
| G-003 | Phase 0 is concluded (8 Nov 2026) without completing native experiments; the product owner stopped the work and then approved concluding it. Native validation not performed in Phase 0 becomes mandatory acceptance gates: SQLCipher, keying, and key-state recovery (Phase 1, on a physical Android device and a physical iPhone before any build stores real data); OS backup exclusion on both platforms (Phase 1); notification limits (Phase 4); attachment AES-GCM (Phase 3); KDF and backup crypto (Phase 5). List and status: `PHASE_0_REPORT.md` §7 and `ROADMAP.md`. Experiment code lives only in `experiments/phase-0/`. | Confirmed (product owner, 8 Nov 2026) |

When a decision is made or changes:

1. Add or update its ID here with the correct status. Never delete history: mark a replaced decision **Superseded**, add it to §6, and point to the replacement.
2. Never move an item to **Confirmed** without explicit product-owner approval, and note the date and source.
3. Update every affected document (PRD, SRS, SDD, DATABASE_DESIGN, USE_CASES, TEST_PLAN, RELEASE_CHECKLIST, diagrams, README, CLAUDE.md) in the same change, and remove or correct outdated statements elsewhere.
4. If stored data is affected, add a new migration and a compatibility plan; never edit a released migration.
5. Record impact on backups, privacy disclosures, tests, and store declarations.
6. Implementation follows the latest Confirmed decision; where it depends on a Proposed or Open item, stop and ask.
