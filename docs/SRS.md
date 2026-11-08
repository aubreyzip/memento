# Software Requirements Specification — Memento

**Version:** 0.1  
**Date:** 8 November 2026  
**Status:** Planning baseline

## 1. Purpose

This document defines the functional, non-functional, security, and platform requirements for Memento V1. Requirements use stable identifiers so implementation, tests, and future changes can refer to them.

### Requirement language

- **MUST**: mandatory for V1 acceptance.
- **SHOULD**: expected unless a documented reason justifies otherwise.
- **MAY**: optional or deferred.

## 2. System context

Memento is a single-user native mobile application for Android and iOS. All user content is stored on the device. The application does not depend on a hosted backend or internet connectivity for its core functionality.

External platform capabilities are limited to user-initiated file selection/sharing, local notifications, biometric/device authentication, and native photo selection. These integrations do not imply remote storage.

## 3. Actors and external systems

| Actor/system | Description |
|---|---|
| App User | The person who owns and operates a local Memento installation. |
| Operating System | Provides app lifecycle, private storage, local notification scheduling, biometrics, and file/share interactions. |
| Photo Picker | Native user-mediated mechanism for choosing images. |
| File Provider / Share Sheet | OS-mediated transfer of backup files. |

There is no remote account actor, administrator role, or second collaborator in V1.

## 4. Functional requirements

### 4.1 Onboarding, settings, and localization

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | The app MUST show a concise first-run introduction explaining Memento's purpose and local-first storage model. | Must |
| FR-002 | The app MUST support English and Turkish UI strings. | Must |
| FR-003 | The app SHOULD detect the device locale on first launch and allow manual language selection in Settings. | Should |
| FR-004 | The app MUST support System, Light, and Dark appearance settings. | Must |
| FR-005 | The app MUST persist selected language and theme across restarts. | Must |
| FR-006 | User-created content MUST remain unchanged when the UI language changes. | Must |

### 4.2 Collections

| ID | Requirement | Priority |
|---|---|---|
| FR-010 | The user MUST be able to create, view, edit, archive, restore, and permanently delete collections. | Must |
| FR-011 | The app MUST provide built-in collection types: Person, Space, Project, Event, and General. | Must |
| FR-012 | The user MUST be able to create custom collection types with a name, icon, and accent color. | Must |
| FR-013 | Each collection MUST have a name and type; description, icon override, and accent-color override are optional. | Must |
| FR-014 | Collections MUST be independent top-level containers; nested collections are out of scope for V1. | Must |
| FR-015 | A collection type in use MUST NOT be permanently deleted. It MAY be archived/deactivated. | Must |
| FR-016 | Deleting a collection MUST clearly explain the effect on its entries and require confirmation. | Must |

### 4.3 Categories and templates

| ID | Requirement | Priority |
|---|---|---|
| FR-020 | The app MUST provide built-in categories: Wishlist, Experiences, Preferences, Home & Improvements, Tasks & Repairs, Important Dates, and General Notes. | Must |
| FR-021 | The user MUST be able to create custom categories with a name, icon, optional color, and one supported template. | Must |
| FR-022 | Supported templates MUST be Note, Task, Wishlist, Event, and Preference. | Must |
| FR-023 | Categories MUST be reusable across collections in V1. | Must |
| FR-024 | A category MUST define the applicable status behavior and relevant optional fields through its template. | Must |
| FR-025 | System categories MUST NOT be permanently deleted. Custom categories in use MUST be archived or reassigned before deletion. | Must |
| FR-027 | Built-in collection types and categories MAY be reordered and archived (hidden) but MUST NOT be renamed or deleted; icon and color overrides are optional (O-041). | Must (no rename/delete); Could (overrides) |
| FR-026 | The app MUST seed built-in collection types and categories idempotently so upgrades do not duplicate them. Built-in rows MUST use permanent IDs from the reserved built-in namespace; user-created rows MUST NOT use IDs in that namespace (O-020). | Must |

### 4.4 Quick Capture Inbox

| ID | Requirement | Priority |
|---|---|---|
| FR-030 | The user MUST be able to create an unsorted entry without selecting a collection or category. | Must |
| FR-031 | Unsorted entries MUST appear in a system-managed Quick Capture Inbox. | Must |
| FR-032 | The user MUST be able to assign an Inbox entry to one collection and one category. | Must |
| FR-033 | The user MUST be able to move an assigned entry back to the Inbox. | Must |
| FR-034 | Inbox entries MUST be searchable and included in full backups. | Must |
| FR-035 | The Inbox MUST NOT be deletable or editable as a user collection. | Must |

### 4.5 Entries

| ID | Requirement | Priority |
|---|---|---|
| FR-040 | The user MUST be able to create, view, edit, archive, restore, and permanently delete entries. | Must |
| FR-041 | An entry MUST have a non-empty title. A description is optional. | Must |
| FR-042 | An assigned entry MUST belong to exactly one collection and one category. | Must |
| FR-043 | An unsorted Inbox entry MUST have neither a collection nor a category. Partial assignment MUST be rejected. | Must |
| FR-044 | An entry MAY have a priority of Low, Medium, or High. | Must |
| FR-045 | Task, Wishlist, and Event entries use the status values of their category's template (§4.6). Whether status is required for these templates, its default value, and its behavior when an entry changes template or returns to the Inbox are pending decision O-021 in `DECISIONS.md`. | Must |
| FR-046 | Note and Preference entries, and unsorted Inbox entries, MUST have no status. | Must |
| FR-047 | The user MUST be able to pin/unpin entries. | Must |
| FR-048 | The user MUST be able to add, remove, and reorder multiple links on an entry. | Must |
| FR-049 | The user MUST be able to attach and remove multiple photos/images on an entry. | Must |
| FR-050 | The app MUST copy selected image content into app-managed private storage rather than relying on a temporary picker URI. | Must |
| FR-051 | The user MUST be able to add optional dates and, where applicable, date ranges or times. | Must |
| FR-052 | The user MUST be able to save an optional price with an ISO 4217 currency code. | Must |
| FR-053 | The user MUST be able to save optional location text/address without granting background location permission. | Must |
| FR-054 | The user MUST be able to assign zero or more tags to an entry. | Must |
| FR-055 | The app MUST preserve entries after app restarts and normal app updates. | Must |
| FR-056 | Permanent deletion MUST remove associated database records and attachment files, with orphan cleanup as a recovery safeguard. | Must |

### 4.6 Template behavior

| ID | Template | Required behavior |
|---|---|---|
| FR-060 | Note | Stores information; no status field required. |
| FR-061 | Task | Status: `TODO`, `IN_PROGRESS`, `COMPLETED`; supports priority and optional due date. |
| FR-062 | Wishlist | Status: `SAVED`, `PLANNED`, `PURCHASED`; supports optional price and links. |
| FR-063 | Event | Status: `IDEA`, `PLANNED`, `COMPLETED`, `CANCELLED`; supports date/time and location. |
| FR-064 | Preference | Stores a fact/preference; no status field required. |

The app MUST validate status values against the selected category template. Status transitions may be changed by the user; V1 does not require a rigid transition graph.

### 4.7 Dashboard, search, and organization

| ID | Requirement | Priority |
|---|---|---|
| FR-070 | Home MUST show useful summaries of upcoming dated items, pending tasks, pinned entries, and recent entries. | Must |
| FR-071 | Home MUST provide a Quick Add action. | Must |
| FR-072 | The user MUST be able to search across assigned and Inbox entries. | Must |
| FR-073 | Search MUST support title and description matching. Search SHOULD also support tag matching. Text normalization for English and Turkish (case and diacritic folding) is pending decision O-026. | Must (title/description); Should (tags) |
| FR-074 | The user MUST be able to filter results by collection, category, status, priority, tags, and archived state where relevant. | Must |
| FR-075 | The user MUST be able to sort results by recently updated, recently created, title, and relevant date where available. | Must |
| FR-076 | Empty states MUST explain what the user can do next. | Must |

### 4.8 Reminders and notifications

| ID | Requirement | Priority |
|---|---|---|
| FR-080 | The user MUST be able to create a local reminder associated with an entry. Reminder lifecycle rules (count per entry, fired reminders, recurrence, archive behavior) are pending decisions O-024, O-025, and O-032. | Must |
| FR-081 | A reminder MUST be scheduled by the operating system locally; no push service or backend is required. | Must |
| FR-082 | The app MUST handle notification permission denial gracefully and keep reminder data visible in the app. | Must |
| FR-083 | The app MUST reconcile scheduled notifications with stored reminder records after restart or relevant schedule changes. | Must |
| FR-084 | Deleting an entry or reminder MUST cancel its scheduled notification when possible. | Must |

### 4.9 Security and app access

| ID | Requirement | Priority |
|---|---|---|
| FR-090 | The app MUST provide optional biometric app locking on supported devices. | Must |
| FR-091 | The app MUST offer a device-credential fallback where supported, or clearly explain when biometric authentication is unavailable. | Must |
| FR-092 | When app lock is enabled, the app MUST allow manual lock and SHOULD offer configurable auto-lock behavior (options pending decision O-013). | Must (manual lock); Should (auto-lock) |
| FR-093 | Encryption keys MUST NOT be hardcoded or logged. | Must |
| FR-094 | The app MUST verify SQLCipher availability in production-style builds before opening the encrypted database. | Must |

### 4.10 Export, import, and deletion

| ID | Requirement | Priority |
|---|---|---|
| FR-100 | The user MUST be able to create a full manual backup containing all collections, custom types/categories, entries, tags, reminders, and attachments. | Must |
| FR-101 | The user MUST be able to export one selected collection with its associated content and attachments. | Must |
| FR-102 | Backup files MUST use a versioned manifest so future releases can validate and migrate older backup schemas. | Must |
| FR-103 | Backup encryption MUST use a vetted cryptographic implementation; custom cryptography is prohibited. | Must |
| FR-104 | The user MUST be able to import a backup and review a summary before committing it. | Must |
| FR-105 | Full restore MUST warn that existing local data will be replaced and require explicit confirmation. | Must |
| FR-106 | Collection import MUST avoid silent ID collisions and explain whether a duplicate collection is being created or an existing one is replaced. | Must |
| FR-107 | The user MUST be able to permanently delete all local Memento data. | Must |
| FR-108 | Export/restore MUST verify archive integrity and detect unsupported backup versions before modifying live data. | Must |

## 5. Non-functional requirements

### 5.1 Offline operation

| ID | Requirement |
|---|---|
| NFR-001 | All core collection, category, entry, search, filter, and dashboard functionality MUST work without internet access. |
| NFR-002 | V1 MUST NOT require an application server for normal use. |
| NFR-003 | The application MUST NOT send user-created content to remote services. |

### 5.2 Performance and scale

| ID | Requirement |
|---|---|
| NFR-010 | Common local interactions SHOULD feel immediate on supported mid-range devices. |
| NFR-011 | As an initial engineering target, common collection/entry queries over a test dataset of 10,000 entries SHOULD complete within 300 ms on the agreed reference device; revise only with measured evidence. |
| NFR-012 | Long-running import/export and media operations MUST show progress or a clear busy state and MUST not block the UI thread. |
| NFR-013 | Image thumbnails SHOULD be used for list rendering; original media should be loaded only when needed. |

### 5.3 Reliability and data integrity

| ID | Requirement |
|---|---|
| NFR-020 | Database writes that update related records MUST use transactions. |
| NFR-021 | Database schema changes MUST be versioned migrations. |
| NFR-022 | Backup import MUST be staged and validated before replacing live data. |
| NFR-023 | Interrupted file/database operations MUST leave either the previous valid state or a recoverable state. |
| NFR-024 | The app MUST detect and report missing attachment files without crashing. |

### 5.4 Security and privacy

| ID | Requirement |
|---|---|
| NFR-030 | The V1 database MUST use SQLCipher in production builds, subject to successful cross-platform verification. |
| NFR-031 | Database keys MUST be generated securely and stored using platform-backed secure storage. |
| NFR-032 | Attachment protection MUST be explicitly designed; database encryption alone MUST NOT be represented as encrypting media files. |
| NFR-033 | Backup archives MUST be encrypted using a vetted implementation and a user-supplied passphrase or equivalent user-controlled secret. |
| NFR-034 | Logs MUST NOT include personal entry content, encryption keys, passphrases, or sensitive local file paths. |
| NFR-035 | The app MUST request only permissions needed for a user-initiated feature. |
| NFR-036 | V1 MUST NOT include advertising SDKs or third-party analytics. |
| NFR-037 | Memento's private app data (database, attachments, keys, settings, staging files) MUST be excluded from automatic OS device backups and device-to-device transfers on Android and iOS. Memento's manual backup is the supported backup mechanism (O-018). |
| NFR-038 | If a database file exists but its key is missing or does not open it, the app MUST NOT delete, overwrite, or recreate it automatically. It MUST quarantine the file and offer restore from a Memento backup or a confirmed fresh start (O-019). |

### 5.5 Usability and accessibility

| ID | Requirement |
|---|---|
| NFR-040 | The UI MUST be usable in English and Turkish. |
| NFR-041 | Layouts MUST accommodate system font scaling without hiding primary actions or content. |
| NFR-042 | Interactive elements MUST have meaningful accessible labels and appropriate roles. |
| NFR-043 | Text/background combinations MUST meet a 4.5:1 contrast target for normal text where applicable; large text and non-text controls must use appropriate accessibility contrast checks. |
| NFR-044 | Color MUST NOT be the only way status, priority, or selection is communicated. |
| NFR-045 | Touch targets SHOULD be sized and spaced for comfortable mobile interaction. |

### 5.6 Compatibility and maintainability

| ID | Requirement |
|---|---|
| NFR-050 | The application MUST support Android and iOS using one shared TypeScript codebase. |
| NFR-051 | Minimum OS versions MUST be selected based on the chosen Expo SDK and documented before beta release. |
| NFR-052 | Expo native modules MUST use versions compatible with the installed Expo SDK. |
| NFR-053 | Feature modules MUST keep presentation, application logic, and persistence concerns separated. |
| NFR-054 | New dependencies MUST have a clear purpose and must not introduce unnecessary network/data collection. |

## 6. Data rules and validation

- Titles are required after trimming whitespace; set a documented maximum length (recommended initial limit: 160 characters).
- Descriptions are optional; set a generous documented maximum (recommended initial limit: 10,000 characters).
- URLs must be normalized and restricted to supported schemes (`https`, `http`, and optionally `mailto` if explicitly designed); reject executable or unknown schemes.
- Prices are non-negative decimal currency amounts stored as integer minor units with an ISO 4217 currency code. Avoid binary floating-point arithmetic for money.
- Dates must be stored in a form that preserves all-day dates without timezone shifts. Store timed instants in UTC and display in the device timezone.
- Location is user-entered text/address in V1. Do not request device location permission for passive capture.
- Tags should be normalized for duplicate detection while preserving a display label.
- Assigned entries must have both `collection_id` and `category_id`; Inbox entries must have neither.
- Category template controls valid status values. Note and Preference entries have no status.

## 7. Acceptance overview

A release candidate is acceptable only when the applicable requirements in this document are covered by automated tests or documented manual verification, database migrations work from a clean install and previous schema, backup/restore passes on both platforms, SQLCipher and attachment security are verified in real builds, and the release checklist is complete.

## 8. Traceability

| Requirement area | Primary source |
|---|---|
| Decisions and their status | `DECISIONS.md` |
| Pre-Phase 1 review findings | `DOCUMENTATION_REVIEW.md` |
| Product goals and scope | `PRD.md` |
| User interactions | `USE_CASES.md` |
| Architecture | `SDD.md` |
| Persistence | `DATABASE_DESIGN.md` |
| Verification | `TEST_PLAN.md` |
| Store/policy preparation | `RELEASE_CHECKLIST.md` |
