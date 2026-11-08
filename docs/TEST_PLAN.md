# Test Plan — Memento

**Version:** 0.1  
**Date:** 8 November 2026  
**Status:** Baseline test strategy

## 1. Objectives

Verify that Memento is reliable, private, usable offline, and safe to release on Android and iOS. Tests must cover both ordinary user workflows and high-risk areas: database migrations, attachment lifecycle, SQLCipher verification, and backup/restore.

## 2. Test levels and tools

| Level | Purpose | Candidate tools |
|---|---|---|
| Static | Catch type and style issues | TypeScript (`npm run typecheck`), ESLint with `eslint-config-expo` (`npm run lint`, which runs `expo lint`; on Node < 22.13 run `npx eslint .`), Prettier (`npm run format:check`) |
| Unit | Domain rules and pure functions | Jest with the `jest-expo` preset (installed). Tests live next to the code in `__tests__/`; `experiments/` is excluded. Run with `npm test`. |
| Repository/integration | SQLite queries, migrations, transactions | Plain-SQL repositories (Confirmed O-016). Test approach Confirmed (O-017): Jest on a Node SQLite driver (`better-sqlite3`, O-047) running the same migrations through the `SqlDatabase` interface (`src/database/testing/node-sql-database.ts`, test-only), plus an on-device suite for SQLCipher. Phase 0 finding: `better-sqlite3` 13 requires Node ≥ 22 (satisfied by the Node 24 baseline, O-009); `sql.js` (WebAssembly) also works. Node is pinned to 24 locally and in CI. |
| Component | Forms, states, accessibility behavior | React Native Testing Library 14 (Confirmed; async `render`/`fireEvent`, built-in matchers such as `toBeSelected`). Navigation is tested with `expo-router/testing-library` `renderRouter` against the real `src/app` tree (tests live outside `src/app` so they are not routes). Native header titles are not rendered as text in Jest. |
| End-to-end | Native user journeys and OS integrations | Maestro |
| Manual | Visual quality, permissions, backup transfer, biometric behavior | Real Android/iOS devices |
| Release | Build/signing/store validation | EAS Build, Play Console, App Store Connect |

Exact tooling versions must be selected to match the installed Expo SDK.

## 3. Test environments

- Unit tests: deterministic test data and isolated database instances.
- Android: emulator plus at least one physical Android device for SQLCipher, file access, notifications, and biometrics.
- iOS: simulator for routine UI tests plus a physical iPhone for secure storage, SQLCipher, photo picker, notifications, and biometrics.
- Build variants: development/preview builds with the same native configuration as release; SQLCipher must not be validated in Expo Go.
- Locale matrix: language setting System (with English, Turkish, and one unsupported device language), English, and Türkçe.
- OS matrix: Android 7.0 (API 24) as the minimum plus a current Android version; iOS 16.4 as the minimum plus a current iOS version (O-009).
- Tooling: Node.js 24 (≥ 24.3) locally and in CI.
- Theme matrix: System, Light, Dark.
- Network matrix: online and airplane mode; core tests must pass offline.

## 4. Unit test coverage

### Domain rules

- Collection type validation and deletion restrictions.
- Category template validation.
- Template-specific valid status sets.
- Note/Preference entries do not require status.
- Inbox invariant (both collection/category null or both assigned).
- Priority validation.
- Price conversion to/from minor units and currency validation.
- Date-only and UTC instant handling.
- Tag normalization and duplicate detection.
- URL scheme validation.

### Application services

- Create/update/archive/delete collection.
- Create custom collection type and prevent deletion while in use.
- Create/update/archive/delete custom category.
- Quick Capture creates an Inbox entry.
- Assign Inbox entry to collection/category atomically.
- Move assigned entry back to Inbox.
- Entry CRUD and status update.
- Pinned and archived list behavior.
- Search/filter combinations.
- Reminder creation/cancellation and reconciliation decisions.
- Backup manifest generation and validation.

## 5. Repository and database tests

- Migrations create a valid fresh database.
- Every migration path from a supported prior schema preserves data.
- Any migration that rebuilds a table preserves child rows (links, attachments, tag links, reminders) and passes `PRAGMA foreign_key_check`. See DATABASE_DESIGN §8.
- Built-in seed operations are idempotent.
- Custom types/categories survive app upgrades and seed changes.
- Foreign keys and cascade/restrict behavior match the design.
- Invalid half-assigned Inbox entries are rejected by SQLite.
- Duplicate tag normalized names are prevented.
- Price/date constraints are enforced.
- Multi-record operations roll back on failure.
- Search returns correct results for English and Turkish text, according to the normalization rule in decision O-026. Include `İ/i/I/ı` and `ş ğ ç ö ü` cases.
- Archived records are excluded from normal lists but remain retrievable.
- Deletion removes dependent DB rows and schedules file cleanup.

## 6. Functional acceptance scenarios

| ID | Scenario | Expected result |
|---|---|---|
| T-001 | First launch with English device locale | English onboarding appears; no account is requested. |
| T-002 | First launch with Turkish device locale | Language setting is System and the UI is Turkish. |
| T-003 | Change language after creating entries | UI labels change; user-created text is unchanged. |
| T-004 | Switch System/Light/Dark | Theme updates immediately and persists after restart. Persistence is testable from Phase 1 slice 5 (interim in-memory settings until then, O-044). |
| T-005 | Create Person, Space, Project, Event, General collections | All types are selectable and saved. |
| T-006 | Create a custom collection type | It appears in collection creation and persists. |
| T-007 | Create a custom category using each template | Category fields/status behavior match its template. |
| T-008 | Quick Capture with only a title | Entry appears in Inbox and global search. |
| T-009 | Assign Inbox entry | Both collection and category are set together. |
| T-010 | Try partial Inbox assignment | Operation is rejected. |
| T-011 | Create a task and change status | Only Task statuses are available and persisted. |
| T-012 | Create a preference | No status is required or displayed. |
| T-013 | Add multiple links | Links are validated, ordered, and reopen correctly. |
| T-014 | Add multiple photos | Files are copied to managed storage and remain after restart. |
| T-015 | Add date/price/location/tags | Values persist and display with locale-aware formatting. |
| T-016 | Search across collections and Inbox | Matching records appear with correct collection context. |
| T-017 | Filter by category/status/priority/tag | Results match all selected filters. |
| T-018 | Pin and archive entries | Pinned items surface; archived items leave normal lists but remain accessible. |
| T-019 | Schedule reminder with permission granted | OS schedules notification and tapping opens the entry. |
| T-020 | Deny notification permission | App remains usable and explains that notification delivery is disabled. |
| T-021 | Delete an entry with attachments/reminders | Related metadata, files, and notifications are cleaned up. |
| T-022 | Export full backup | Backup contains all expected records and media. |
| T-023 | Export one collection | Only selected collection data and dependencies are included. |
| T-024 | Restore valid backup | Preview is shown; confirmed restore reproduces data and attachments. |
| T-025 | Import wrong password/corrupt archive | Import fails without changing live data. |
| T-026 | Import unsupported backup version | Clear error; live data remains unchanged. |
| T-027 | Full restore interrupted | Previous live data remains recoverable. |
| T-028 | Delete all app data | User confirms; data and attachment files are removed. |
| T-029 | Use app in airplane mode | All core features continue to work. |
| T-030 | Switch language System → English → Türkçe → System in Settings | Each change applies immediately without restart; the choice persists after restart (O-034). |
| T-031 | With System selected, change the device language and return to the app | The app follows the new device language on foreground. With English or Türkçe selected, it does not change. |
| T-032 | Device language other than English or Turkish, with System selected | UI shows English. |
| T-033 | A key missing from the Turkish resources | That string falls back to English; no raw key or blank text is shown. Automated: unit tests require every missing Turkish key to be listed explicitly (currently only the tagline, O-045). |
| T-034 | Recovery screen or SQLCipher error screen | Uses the System appearance and language regardless of the saved preference (O-044). |

## 7. Security tests

### SQLCipher

- Confirm `PRAGMA cipher_version` returns a valid version on Android and iOS production-style builds.
- Confirm startup fails safely when SQLCipher is unavailable in a build that requires it.
- Confirm the database cannot be opened as plain SQLite without the key.
- Confirm the key is generated securely, stored through the secure key-management flow, and never logged.
- Confirm every database connection path applies the key before schema reads/migrations.
- Verify migration and transaction behavior with SQLCipher enabled, including any APIs that open separate connections. For example, Expo's `withExclusiveTransactionAsync()` uses a new connection: confirm it is keyed and that foreign-key enforcement is as expected, or confirm it is not used.
- Key and database state handling (O-019, SDD §8.1.1 states A–E). Automated in Jest against a fake encrypted store (`src/database/testing/fake-encrypted-storage.ts`): all five states, quarantine without deletion, fail-closed cases (cipher unavailable, key-store read/write failure, newer database, open failure), and the recovery/error screens. Must also pass on device (G1–G4): first run; normal open; database present but key missing; database present with a wrong key; key present but no database. Confirm that the database and its sidecars are quarantined byte-for-byte, the recovery screen appears, and no existing database file is deleted or overwritten without explicit user confirmation.
- OS backup exclusion (O-018, SDD §12.4):
  - Android: the merged release manifest has `allowBackup="false"`, `dataExtractionRules`, and `fullBackupContent` with all-domain exclusions for both cloud backup and device transfer; `adb shell bmgr backupnow <package>` does not back up the app; a device-to-device transfer to a second Android device arrives without Memento data.
  - iOS (O-039): the data directory reports `isExcludedFromBackup = true`; after an encrypted device backup/restore or Quick Start transfer, the app either starts empty or reaches the O-019 recovery screen. It never opens with silently lost or overwritten data.

### Attachments

- Confirm attachments are stored only in app-private locations.
- Confirm filenames are opaque/generated and path traversal is rejected.
- Verify the selected attachment-protection strategy independently of database encryption.
- Confirm an attachment cannot be read through the database key alone if file encryption is implemented.
- Verify temp/orphan cleanup and missing-file handling.

### Backups

- Wrong passphrase and altered archive fail authentication.
- Tampered manifest/media hash is detected.
- No plaintext entry records or media are exposed in the exported archive if the format promises full archive encryption.
- Passphrases and keys are never logged or stored in plaintext.
- Large/malformed archives are bounded to avoid memory exhaustion/path traversal.

### App lock

- Verify biometric success, failure, cancellation, lockout, unavailable hardware, no enrolled biometrics, device passcode removed, and fallback behavior.
- After adding or removing a fingerprint or face profile, confirm the app still unlocks through the OS prompt and **all data remains readable**. Expo Local Authentication cannot detect enrolment changes, and data keys must not be biometric-bound (O-019).
- Verify manual lock and auto-lock lifecycle.
- Verify sensitive app content is not exposed in app-switcher snapshots where platform APIs support protection.

## 8. Accessibility and UX checks

- Screen-reader labels for primary controls, icon-only buttons, form fields, status, priority, and reminders.
- Text scaling at larger system font sizes.
- Color contrast for all text and important controls.
- Status/priority not communicated by color alone; coral is never the only indicator of any state (O-042). Token tests enforce 4.5:1 text contrast and 3:1 for `primary`.
- Empty states, validation errors, permission denials, and long-running operations are understandable.
- Turkish labels fit without clipping or unexplained abbreviations.
- Keyboard navigation/focus behavior for text inputs and modals is sensible.

## 9. Performance checks

Use a documented reference device and repeatable synthetic dataset.

- Initial launch and home rendering.
- Open a collection with many entries.
- Search/filter with 10,000 entries.
- Scroll a list with multiple photo attachments.
- Import/export a representative large backup.
- Memory use while generating thumbnails and restoring media.

Initial target: common local queries over 10,000 entries complete within 300 ms on the agreed reference device. Treat this as a measurement goal, not an unverified claim.

## 10. Regression and release gates

A candidate release must:

- Pass lint, typecheck, unit, integration, and critical E2E tests.
- Pass critical manual tests on both platforms.
- Pass clean install and upgrade/migration tests.
- Pass full backup/restore tests including media.
- Pass SQLCipher and attachment security verification on real custom builds.
- Have no known blocker/high-severity data-loss or privacy defects.
- Have all release checklist items completed or explicitly waived by the product owner.

## 11. Test data and privacy

- Use synthetic names, notes, URLs, locations, and images only.
- Never put real personal notes from the developer's life into automated fixtures, screenshots, issue reports, or logs.
- Do not commit real backup files, encryption keys, passphrases, or user media.
