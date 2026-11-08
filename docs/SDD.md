# Software Design Description — Memento

**Version:** 0.1  
**Date:** 8 November 2026  
**Status:** Architecture baseline. Data access (O-016), key lifecycle (O-019), and OS-backup policy (O-018) Confirmed 8 November 2026; other library choices remain Proposed. Phase 0 results: `PHASE_0_REPORT.md`.

## 1. Purpose

This document describes the proposed architecture for Memento V1. The architecture is intentionally small: one cross-platform mobile application, local persistence, and native OS capabilities. It should be easy for one developer to understand and maintain, while keeping boundaries that permit future capabilities without implementing them now.

## 2. Architecture summary

**Style:** Feature-oriented modular application with lightweight layered boundaries.

**Runtime:** React Native + Expo + TypeScript.

**Navigation:** Expo Router.

**Persistence:** Expo SQLite, configured for SQLCipher in production-style custom builds.

**Network:** No application backend or remote user-data service in V1.

See [`diagrams/system-context.mmd`](./diagrams/system-context.mmd) and [`diagrams/application-architecture.mmd`](./diagrams/application-architecture.mmd).

## 3. Architecture principles

1. UI components do not execute SQL or manipulate files directly.
2. Feature-specific application logic is separated from screen rendering.
3. Persistence is accessed through repository interfaces.
4. Native OS capabilities are wrapped behind small service interfaces.
5. The local database is the source of truth for collections, categories, entries, and reminders.
6. Attachments are files in app-private storage; SQLite stores metadata and relative paths.
7. No V1 dependency may require a server for core behavior.
8. Prefer small, explicit modules over a large framework or speculative abstraction.
9. Migrations, backup formats, and persisted identifiers are compatibility contracts.

## 4. Technology decisions

| Concern | Proposed technology | Notes |
|---|---|---|
| Mobile runtime | React Native + Expo | Shared Android/iOS app. |
| Language | TypeScript | Strict type checking. |
| Navigation | Expo Router | File-based routes. |
| Database | `expo-sqlite` | Persistent local SQLite. |
| Encryption | SQLCipher via Expo SQLite config plugin | Requires custom native build; verify on both platforms. |
| Query layer | Plain parameterized SQL in repositories (no ORM) | Confirmed O-016. Hand-written SQL, numbered migration files, `PRAGMA user_version`. An ORM needs a new decision. |
| Input validation | Zod | Validate form and import payloads at boundaries. |
| Forms | React Hook Form | Reusable template-aware entry forms. |
| Secure storage | Expo SecureStore | Store database key material or wrapped secrets, not user records. Do not use `requireAuthentication: true` for data keys: Expo documents that such values become unreadable when biometrics change. Data keys use `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (Confirmed O-019). |
| Biometrics | Expo Local Authentication | Optional app-lock feature. |
| Images | Expo ImagePicker + Expo FileSystem | User-mediated selection; copy into app-private storage. |
| Backup file pick/share | Expo DocumentPicker + Expo Sharing | Proposed (review R-30). User-mediated selection of an import file and OS save/share of an export file. |
| Symmetric encryption | `expo-crypto` AES-GCM | Proposed. Candidate for attachment (O-008) and backup-member (O-007) encryption; it provides no password KDF. |
| Notifications | Expo Notifications | Local scheduling only. |
| Localization | i18next plus Expo-compatible locale detection | English and Turkish. |
| Unit/component tests | Jest + React Native Testing Library | Pure logic and component behavior. |
| E2E | Maestro | Critical native flows on Android/iOS. |
| CI | GitHub Actions | Lint, typecheck, tests, build validation as feasible. |
| Build/submit | EAS Build / EAS Submit | Store-oriented build pipeline. |

Use `npx expo install` for Expo modules, allowing the installed Expo SDK to select compatible versions. Do not copy package versions from an old tutorial.

## 5. Logical layers

### 5.1 Presentation layer

Responsibilities:
- Expo Router route definitions and layouts.
- Screens, reusable components, forms, and visual states.
- Accessibility labels and localized UI strings.
- Navigation and presentation-level state.

Rules:
- No raw SQL in screens or components.
- No business rules hidden in JSX event handlers.
- Do not duplicate design tokens or translation strings.

### 5.2 Application / feature layer

Responsibilities:
- Use cases such as `CreateCollection`, `CaptureEntry`, `AssignInboxEntry`, `UpdateEntryStatus`, `SearchEntries`, `CreateBackup`, and `RestoreBackup`.
- Input validation and orchestration.
- Coordinating repositories, file storage, and notification services.
- Mapping persistence models to domain/application models where needed.

### 5.3 Domain layer

Responsibilities:
- Entity types and invariants.
- Collection type and category template definitions.
- Valid status sets per template.
- Validation rules for Inbox vs assigned entries.
- Date, money, and tag normalization rules.

Keep the domain layer framework-agnostic where practical.

### 5.4 Infrastructure layer

Responsibilities:
- SQLite connection and encryption initialization.
- Database migrations and repository implementations.
- Secure key storage.
- Attachment file storage and cleanup.
- Backup archive creation/validation.
- Local notification scheduling.
- OS photo/file picker integration.

## 6. Suggested repository structure

```text
memento/
├── app/                         # Expo Router routes and layouts
│   ├── (tabs)/
│   │   ├── index.tsx             # Home
│   │   ├── collections.tsx
│   │   ├── search.tsx
│   │   └── settings.tsx
│   ├── collections/[collectionId]/
│   ├── entries/[entryId]/
│   ├── capture.tsx
│   └── _layout.tsx
├── src/
│   ├── components/              # Shared UI components
│   ├── design-system/           # Tokens, typography, spacing, themes
│   ├── features/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── collections/
│   │   ├── categories/
│   │   ├── entries/
│   │   ├── inbox/
│   │   ├── search/
│   │   ├── reminders/
│   │   ├── backup/
│   │   └── settings/
│   ├── domain/                  # Shared domain types and invariants
│   ├── database/
│   │   ├── migrations/
│   │   ├── schema/
│   │   └── connection/
│   ├── repositories/            # Repository interfaces/implementations
│   ├── services/                # Files, notifications, security, backup
│   ├── localization/
│   ├── hooks/
│   ├── utils/
│   └── types/
├── assets/
├── docs/
├── tests/
├── .github/workflows/
├── app.config.ts
├── eas.json
├── package.json
└── README.md
```

This is a target structure, not a requirement to create empty folders. Adjust based on the actual Expo template and avoid unnecessary indirection.

## 7. Navigation and UI architecture

### 7.1 Primary navigation

- Home
- Collections
- Search
- Settings

Quick Add is a global prominent action, not a separate primary tab. Collection detail, entry detail, editors, category management, and backup flows are nested routes or modals.

### 7.2 Design system

Create semantic theme tokens such as:

- `background`, `surface`, `surfaceElevated`
- `textPrimary`, `textSecondary`, `textMuted`
- `primary`, `primaryText`, `accent`, `border`
- `success`, `warning`, `danger`, `info`
- `priorityLow`, `priorityMedium`, `priorityHigh`

Light palette source values:

- Burgundy `#5D2A42`
- Coral `#FB6376`
- Soft coral `#FCB1A6`
- Peach `#FFDCCC`
- Cream `#FFF9EC`

Dark theme should use a dark plum/burgundy-tinted neutral background and accessible foregrounds. Exact values must be validated and documented in the design tokens; do not assume the light palette can simply be inverted.

### 7.3 Localization

- Keep all UI strings in translation resources (`en`, `tr`).
- Store user-created names/descriptions exactly as entered.
- Format dates, numbers, and currencies using locale-aware APIs.
- Store machine values (statuses, category templates) independently from localized labels.
- Do not use translated labels as database identifiers.

## 8. Persistence architecture

### 8.1 Database lifecycle

1. Read database key material from secure storage.
2. Open the SQLite database.
3. Verify SQLCipher availability using `PRAGMA cipher_version` in a custom build.
4. Apply the database key immediately, before schema access or migrations.
5. Configure foreign keys and appropriate SQLite pragmas.
6. Read schema version and apply ordered migrations transactionally.
7. Seed built-in collection types and categories idempotently.
8. Expose initialized repositories to the application.

If SQLCipher is required but unavailable, the app must not proceed while pretending that data is encrypted. A controlled diagnostic/development mode may exist, but it must be unmistakably separate from production behavior.

**Important:** Expo documentation notes that SQLCipher is unavailable in Expo Go and that `PRAGMA key` can be silently ignored if the native binary does not include SQLCipher. Verify `PRAGMA cipher_version` before relying on encryption. See [Expo SQLite documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/).

**Separate connections:** Expo documents that `withExclusiveTransactionAsync()` runs on a **new database connection**, where connection-level settings such as `PRAGMA foreign_keys = ON` do not apply. With SQLCipher, such a connection also needs the key. Use `withTransactionAsync()` on the keyed connection, or ensure that every connection is keyed and configured before use. Covered by TEST_PLAN §7.

**Key and database states (Confirmed O-019):** Startup must distinguish four states: no database and no key (first run); key and database open correctly (normal); a database file exists but the key is missing or does not open it; a key exists but no database exists. The application must never automatically delete, overwrite, or recreate an existing database file in the third state. The database and attachments are excluded from OS device backups (Confirmed O-018, §12.4).

#### 8.1.1 Startup key-state handling and recovery (O-019)

Flow diagram: [`diagrams/startup-key-recovery.mmd`](./diagrams/startup-key-recovery.mmd).

Keys: one database key and one media key, each 32 random bytes from a CSPRNG, stored hex-encoded in SecureStore with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, never with `requireAuthentication`. The database is keyed with SQLCipher's raw-key form, `PRAGMA key = "x'<64 hex>'"`, so SQLCipher skips its passphrase KDF. Key values are never logged.

| State | Detection | Action |
|---|---|---|
| A. No database file, no key | File absent; SecureStore returns null | Generate key, store it, create and key the database, run migrations and seeds. |
| B. Database and key, opens | First read (`SELECT count(*) FROM sqlite_master`) succeeds after keying | Normal startup. |
| C. Database file, key missing | File present; SecureStore returns null | Close; quarantine; show recovery screen. |
| D. Database file, wrong key | First read after keying fails (SQLCipher reports the file is not a database) | Close; quarantine; show recovery screen. |
| E. Key present, no database file | File absent; key present | Create a new database. Reusing the existing key or generating a new one are both safe. |

**Quarantine:** close every connection, then move the database file and any `-wal`, `-shm`, or `-journal` sidecar to `<name>.quarantine-<timestamp>` in the same directory. Moving within one directory is a rename, so file contents should be unchanged; verify byte equality in the Phase 1 on-device test (not verified in Phase 0). Never delete as part of quarantine.

**Recovery screen** (UC-01): explains that the existing data cannot be opened on this device and offers:

1. **Restore from a Memento backup.** Runs the normal import flow (UC-15) into a new database.
2. **Start fresh.** Creates a new, empty database. The quarantined file is kept. Deleting it requires a separate, explicit confirmation, offered on this screen and in Settings → Data Management.

Startup must reach the recovery screen without touching user content. The SQLCipher availability check (`cipher_version`) runs before any of these states and fails closed.

### 8.2 Repository boundaries

Suggested repositories:
- `CollectionRepository`
- `CollectionTypeRepository`
- `CategoryRepository`
- `EntryRepository`
- `TagRepository`
- `ReminderRepository`
- `SettingsRepository`

Repositories expose typed operations, not arbitrary SQL to UI code. Multi-table operations should use a transaction in the application/service layer or repository unit-of-work helper.

### 8.3 Inbox invariant

An entry is in exactly one of two states:

- **Inbox:** `collection_id IS NULL AND category_id IS NULL`.
- **Assigned:** `collection_id IS NOT NULL AND category_id IS NOT NULL`.

A record with only one of the two fields populated is invalid. Enforce this with a database CHECK constraint and domain validation.

### 8.4 Status behavior

Store stable status keys, not display strings. Validate the key against the category's `template_key`. A status may be absent only for Note and Preference templates.

### 8.5 Search

Start with parameterized local SQL. SQLite FTS5 may be enabled for title/description search if compatible with the selected Expo SQLite build. The feature must still work if FTS setup is unavailable; select a clear fallback and test it. Search must not use a remote service.

## 9. Attachment storage

- Store files under an app-private directory using generated opaque filenames/UUIDs; do not use user-provided filenames as paths.
- Store MIME type, byte size, relative path, and optional dimensions/hash in SQLite.
- Copy selected media into managed storage before committing the attachment row.
- Use a temporary file and atomic rename where supported.
- Remove the file if the DB transaction fails; periodically detect and clean orphaned files safely.
- Generate/retain thumbnails for list previews where helpful.
- Validate file type and size; do not trust file extension alone.
- Treat attachment encryption as a separate requirement from SQLCipher. Use a vetted file-encryption strategy or document a security-approved exception; never claim SQLCipher encrypts media files.
- Backup/export must include attachment bytes, and restore must validate their hashes before committing.
- Keep all temporary plaintext (decrypted media for display, restore staging, export temp files) under one app-private temporary directory. Purge it at startup and after each operation completes or fails. Purge decrypted media caches when the app locks.
- The attachment-protection approach is pending decision O-008. Image intake rules (camera, metadata stripping, size caps) are pending O-031.

## 10. Backup and restore design

### 10.1 Format goals

- Versioned and self-describing.
- Portable between Android and iOS.
- Includes all supported app data and attachments.
- Encrypted before leaving the app through the OS share/save interface.
- Detects corruption, unsupported versions, wrong passwords, missing files, and incompatible data before destructive changes.

### 10.2 Proposed archive layout

The following is a logical layout inside an encrypted `.memento` container, not a mandate to use a particular ZIP/crypto library:

```text
manifest.json
records/
  collections.json
  collection-types.json
  categories.json
  entries.json
  links.json
  tags.json
  entry-tags.json
  reminders.json
media/
  <opaque-id>.bin
```

Manifest should include format version, app version, export timestamp, export scope, record counts, media manifest, and integrity hashes. Never put a passphrase or raw key in the archive metadata.

### 10.3 Cryptography

- Select a vetted cross-platform library and a standard authenticated encryption construction.
- Use a password-based key derivation function supported by that library; store algorithm and parameters in the versioned manifest/header.
- Include authentication/integrity verification.
- Do not design a custom encryption format or invent key derivation.
- Set reasonable passphrase guidance and handle incorrect passwords without exposing whether a file contains user data.
- Document crypto choices and test vectors before implementation is accepted.
- The backup is a **logical export** (records and media), not a copy of the SQLCipher database file. The device-specific database and media keys never enter the archive. Export reads data through the keyed connection, decrypts media with the device media key if attachments are app-encrypted, and encrypts the archive with a key derived from the user's passphrase. Restore on another device writes the data into that device's own encrypted database and media store. This keeps cross-device restore independent of device keys.
- Format and KDF selection is decision O-007. Whether encryption is mandatory is decision O-028.

### 10.4 Import safety

1. Copy the selected archive to a temporary location.
2. Check file size and archive structure limits.
3. Decrypt/authenticate into a staging area.
4. Validate manifest/version, data schema, IDs, and media hashes.
5. Show a preview/summary.
6. Require confirmation for the import mode. A full backup restore **replaces** all local data (SRS FR-105); there is no full-backup merge in V1. A collection import either **imports as a copy** or **replaces the existing collection** (SRS FR-106). Merge rules for shared entities (types, categories, tags) are pending decision O-029.
7. Apply changes using a transaction or recoverable swap strategy.
8. Reconcile reminders and clean staging artifacts.

A failed import must leave the existing live database and attachments usable.

## 11. Reminder architecture

- Store reminder definitions in SQLite.
- Schedule notifications through the OS only after persistence succeeds.
- Keep the native notification identifier in the reminder record when available.
- Reconcile scheduled notifications with enabled reminder rows on startup and after timezone/date edits.
- If permission is denied, preserve the in-app reminder and show that notifications are disabled.
- Tapping a notification should deep-link to an entry; if the entry was deleted/archived, show a safe fallback.
- No remote push service is needed or allowed in V1.

Platform constraints verified against official documentation on 8 Nov 2026:

- **Android exact alarms:** From Android 12, exact-time scheduling needs `SCHEDULE_EXACT_ALARM`. Android 14+ denies it by default for new installs, and without it notifications may arrive at an approximate time. Google Play restricts `USE_EXACT_ALARM` to alarm, timer, and calendar apps; do not declare it without a policy review.
- **Android 13+:** notification posting needs runtime permission.
- **Android reboot:** `expo-notifications` adds `RECEIVE_BOOT_COMPLETED` and re-registers scheduled notifications after reboot. Startup reconciliation remains the safety net.
- **iOS pending limit:** iOS keeps a limited number (64) of pending local notifications per app. Reconciliation must schedule only the nearest upcoming reminders, up to a safe cap, and top up on each reconciliation.
- **Notification content** is shown by the OS (including on the lock screen) and held outside the encrypted database. Content policy is decision O-030.
- Recurrence, archive behavior, and reminder lifecycle rules are decisions O-024, O-025, and O-032.

## 12. Security architecture

### 12.1 Threats considered

- Lost/stolen unlocked device.
- Someone casually opening the app.
- Backup file exposed to another person.
- Logs or crash output revealing personal notes.
- SQLCipher configuration not present in a production binary.
- Attachment files left unprotected outside the database.
- Interrupted backup/restore or migration corrupting data.

### 12.2 Controls

- SQLCipher database encryption and runtime cipher verification.
- SecureStore-backed key storage.
- Optional biometric/device-credential app lock.
- App-private attachment directory; separately validated file encryption strategy.
- Password-protected authenticated backup archive.
- No unnecessary network services, ads, or analytics SDKs.
- Redacted logs and test fixtures with synthetic data only.
- Destructive-operation confirmations and safe restore staging.

### 12.3 Important limitations

- Local encryption does not protect data while the app/device is unlocked or compromised.
- Biometric app lock is not a substitute for database encryption.
- SQLCipher protects the database file, not separately stored media.
- SecureStore items may have platform-specific uninstall/restore behavior; users need explicit manual backup guidance.
- No backup means data may be lost if the device is lost, damaged, or the app's encryption key is unavailable.
- Because OS backups are excluded (§12.4), a new phone, a factory reset, or a reinstall starts empty unless the user restores a Memento backup.

### 12.4 OS device-backup exclusion (Confirmed O-018)

Memento's private data must not travel in automatic OS backups or device-to-device transfers. Users move data only through Memento backups (§10).

**Android.** All three of the following are required:

- `android:allowBackup="false"` (Expo config `android.allowBackup: false`).
- `android:dataExtractionRules` pointing to rules that exclude every domain (`root`, `file`, `database`, `sharedpref`, `external`, and the `device_*` variants) with `path="."` in **both** `<cloud-backup>` and `<device-transfer>`. Android documents that for apps targeting Android 12+, `allowBackup="false"` disables cloud backup but, on some manufacturers' devices, does not disable device-to-device transfer. A missing `<device-transfer>` section means that transfer is fully enabled.
- `android:fullBackupContent` with the same exclusions, for devices on Android 11 and lower.

Because these rules replace Expo SecureStore's default backup configuration, set the SecureStore plugin's `configureAndroidBackup` to `false`; the exclusions above already cover its shared preferences. A small config plugin applies all three settings (Phase 0 prototype: `experiments/phase-0/native-probe/plugins/withNoOsBackup.js`; Phase 0 confirmed it writes all three settings into the prebuild manifest, but no build was completed). Verify on every release build that the merged manifest contains them.

**iOS.** Proposed mechanism O-039: keep all private data under one app-owned directory and set `isExcludedFromBackup` on it from a small local Expo module, at startup and after creating files. Expo FileSystem (SDK 58) has no API for this. Apple describes the flag as guidance that does not guarantee exclusion, and notes that some file operations reset it. Keys use a `*_THIS_DEVICE_ONLY` Keychain class, so a restored or migrated copy of the database cannot be opened. That situation is handled by §8.1.1.

**Residual risk.** On both platforms, exclusion is a best-effort OS contract. The O-019 recovery path is what guarantees that a database arriving without its key is preserved, not overwritten.

## 13. Error handling and observability

- Show actionable, user-friendly messages for storage full, permission denied, invalid URL, missing media, export failure, import failure, wrong passphrase, and migration failure.
- Keep technical diagnostics separate from user content.
- Do not log titles, descriptions, URLs, locations, image data, passphrases, or encryption keys.
- No third-party analytics or crash reporting in V1 unless separately approved and added to privacy disclosures.

## 14. Build, environments, and CI

Environments:
- Local development with synthetic data.
- Internal development/preview builds for testing native modules and SQLCipher.
- Store release builds.

CI should run, as applicable:
- Formatting/lint.
- TypeScript typecheck.
- Unit/component tests.
- Migration/schema tests.
- Expo configuration validation.
- Platform build checks or EAS preview builds at relevant milestones.

Do not use Expo Go to validate SQLCipher or other custom native configuration. Use development builds for native integration testing.

## 15. Future architecture considerations (not V1)

The repository pattern and stable IDs should make a future sync layer possible, but no sync engine, account model, server schema, conflict resolution, or collaboration permissions should be implemented now. Future cloud features require a new product/security decision and an explicit data-consent model.

## 16. Official technical references

- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) — persistence, SQLCipher configuration, custom build requirement, cipher verification.
- [Expo Router](https://docs.expo.dev/router/introduction/) — file-based navigation.
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) — platform secure key/value storage.
- [Expo Local Authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/) — biometric authentication.
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) — local notification scheduling.
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) — app file handling.
- [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) — user-mediated image selection.
- [Expo Localization](https://docs.expo.dev/versions/latest/sdk/localization/) — device locale information.

Re-check official documentation when initializing the project and whenever upgrading the Expo SDK. Do not copy package versions from this document.
