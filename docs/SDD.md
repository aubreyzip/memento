# Software Design Description — Memento

**Version:** 0.1  
**Date:** 8 November 2026  
**Status:** Proposed architecture baseline; validate technical spikes before locking all libraries.

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
| ORM/query layer | Drizzle ORM candidate | Do a small compatibility spike; direct parameterized SQLite repositories are acceptable if the current integration is unstable. |
| Input validation | Zod | Validate form and import payloads at boundaries. |
| Forms | React Hook Form | Reusable template-aware entry forms. |
| Secure storage | Expo SecureStore | Store database key material or wrapped secrets, not user records. |
| Biometrics | Expo Local Authentication | Optional app-lock feature. |
| Images | Expo ImagePicker + Expo FileSystem | User-mediated selection; copy into app-private storage. |
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

### 10.4 Import safety

1. Copy the selected archive to a temporary location.
2. Check file size and archive structure limits.
3. Decrypt/authenticate into a staging area.
4. Validate manifest/version, data schema, IDs, and media hashes.
5. Show a preview/summary.
6. Require confirmation for replace/merge behavior.
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
