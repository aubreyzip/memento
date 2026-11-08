# Memento — Claude Code Project Guide

## Start here

Before making a change, read:

- `docs/DECISIONS.md`
- `docs/ROADMAP.md` for the current phase and its scope
- The relevant sections of `docs/PRD.md` and `docs/SRS.md`
- `docs/SDD.md` for architecture and module boundaries
- `docs/DATABASE_DESIGN.md` for any persistence change
- `docs/TEST_PLAN.md` for required verification

The documentation is the project source of truth. If implementation and documentation disagree, do not guess: identify the discrepancy and propose the smallest consistent correction. Product-owner-confirmed decisions take precedence over recommendations.

`docs/DOCUMENTATION_REVIEW.md` records the pre-Phase 1 review, the findings, and the Phase 1 entry checklist.

## Phases

Development follows the seven confirmed phases in `docs/ROADMAP.md` (decision O-015):

0. Technical validation and proofs of concept
1. Project foundation and infrastructure
2. Collections and categories
3. Entries and Quick Capture Inbox
4. Dashboard, search, and reminders
5. Security, encryption, and backups
6. Testing, polish, and store release

Work on one phase at a time. Do not start a phase until the previous one has been evaluated and its blocking issues are resolved; Phase 0 is concluded; its results and the validation gates it carries into later phases are in `docs/PHASE_0_REPORT.md` §7. Experiment code lives only under `experiments/` (Phase 0: `experiments/phase-0/`), is never promoted into the app as-is, and no experiment files may be created elsewhere. Do not create mapped drives or other system-level workarounds for experiments.

## Decision management

`docs/DECISIONS.md` is the central decision register. Decisions use exactly four statuses:

- **Confirmed:** explicitly agreed by the product owner (or mandated by this file). Implement it.
- **Proposed:** recommended, awaiting approval. Do not treat as approved; flag any dependency on it.
- **Open:** needs a decision. Do not implement behavior that depends on it; ask the product owner.
- **Superseded:** replaced by a newer decision; kept for history.

Whenever a product or architecture decision is made or changes:

1. Update `docs/DECISIONS.md` first: add or update the ID, status, date, and source.
2. Update every affected document in the same change (PRD, SRS, SDD, DATABASE_DESIGN, USE_CASES, TEST_PLAN, RELEASE_CHECKLIST, diagrams, README, and this file), and remove or correct outdated statements.
3. Mark replaced decisions **Superseded** and point to the replacement; never delete decision history.
4. Never silently promote a Proposed or Open item to Confirmed. Only the product owner confirms decisions.
5. Implementation follows the latest Confirmed decision. Before starting a slice, check its "Needed by" items in `DECISIONS.md`; if a blocking item is still Open or Proposed, stop and ask.

## Product invariants

- Product name: **Memento**. Working tagline: **Remember the little things.**
- Memento is a general-purpose life organizer, not a relationship-only tracker.
- V1 supports people, spaces, projects, events, general, and user-defined collection types.
- V1 supports built-in and user-defined categories. A category uses one of the supported entry templates; do not build an arbitrary form builder.
- Entries normally belong to one collection and one category. Unsorted Quick Capture Inbox entries are the deliberate exception.
- V1 is single-user and local-first: no account, backend, cloud sync, collaboration, ads, subscriptions, or third-party analytics.
- V1 supports Android and iOS, English and Turkish, and System/Light/Dark appearance.
- Use the approved five-color palette and semantic design tokens; do not scatter raw color literals through components.
- Photos and other attachments are local data and must be included in backup/restore behavior.
- Do not send user-created content to remote services. Do not log entry titles, descriptions, links, location details, or image paths.

## Architecture rules

- Use React Native with Expo and TypeScript. Use Expo Router for navigation; routes live in `src/app/`. V1 is mobile only: do not add web dependencies, web config, or `.web.tsx` files.
- Colors come only from `src/design-system/tokens.ts` semantic tokens; keep the token contrast tests passing.
- Checks before declaring work done: `npm run typecheck`, `npm run lint`, `npm test`.
- Keep routes thin. Screens orchestrate feature components and application actions; they should not contain SQL statements.
- Keep persistence behind repository interfaces. UI components must not access SQLite directly.
- Data access is plain, parameterized SQL through `expo-sqlite` inside repositories; no ORM in V1 (O-016). Migrations are numbered SQL files tracked with `PRAGMA user_version`. Never build SQL by concatenating user input.
- Use `withTransactionAsync()` on the keyed, configured connection. `withExclusiveTransactionAsync()` opens a separate connection that does not inherit `PRAGMA key` or `PRAGMA foreign_keys`; do not use it unless that connection is keyed and configured first.
- Table-rebuild migrations must follow the FK-safe procedure in `docs/DATABASE_DESIGN.md` §8; a naive rebuild cascade-deletes child rows.
- Built-in collection types and categories use permanent IDs from the reserved built-in namespace (O-020; format O-038). User-created rows use random v4 UUIDs and must never use an ID in the reserved namespace.
- The permanent application identifier is `com.aubreyzip.memento` on Android and iOS (O-001). Spike and experimental builds must use a different identifier.
- Keep business rules in feature/application services and domain types, not in presentation components.
- Use versioned database migrations. Never change an already-released migration in place; add a new migration.
- Use stable UUID identifiers for persisted entities.
- Keep collection types and categories data-driven. Built-in entries are seeded system data; custom entries are regular user data.
- Use category templates (`NOTE`, `TASK`, `WISHLIST`, `EVENT`, `PREFERENCE`) to determine applicable fields and status behavior.
- Preserve the Inbox rule: an entry is either unsorted (no collection and no category) or assigned (both collection and category). Never leave half-assigned records.
- Store attachment files in app-private storage and metadata in SQLite. Make file operations resilient to missing files and interrupted writes.
- Notifications are local OS notifications only. Treat the database as the source of truth and reconcile scheduled notifications from it.
- Use `npx expo install` for Expo native modules so package versions match the installed Expo SDK.

## Security and privacy rules

- SQLCipher is a required V1 security target, but verify that the actual native build includes it before claiming that the database is encrypted. `PRAGMA cipher_version` must be checked on startup; fail closed if encryption is required but unavailable.
- Never hardcode, commit, print, or expose database encryption keys or backup passphrases.
- Do not use Expo Go as evidence that SQLCipher works; use a custom development/preview build.
- SQLCipher does not encrypt attachment files. The attachment-protection design is pending decision O-008 in `docs/DECISIONS.md`; do not implement attachment storage until it is decided and reflected in `docs/SDD.md` §9.
- Never automatically delete, overwrite, or recreate an existing database file because its key is missing or wrong. Follow confirmed decision O-019: quarantine the file and its sidecars, then offer "Restore from a Memento backup" or "Start fresh" (SDD §8.1.1).
- The encrypted database foundation (SQLCipher, fail-closed `cipher_version` check, key storage, O-019 recovery, O-018 exclusion) is built in Phase 1, not deferred to Phase 5 (O-036). Before any build stores real data, verify it on a physical Android device and a physical iPhone (G-003 gates in `docs/PHASE_0_REPORT.md` §7).
- Key the database with a random 256-bit raw key stored in SecureStore with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (O-019).
- Do not store data-encryption keys in SecureStore with `requireAuthentication: true`; such values become unreadable when the user's biometrics change.
- Memento's private data is excluded from OS device backups and device-to-device transfer (confirmed O-018). On Android, `allowBackup="false"` alone is not enough: also ship `dataExtractionRules` that exclude every domain for cloud backup and device transfer (SDD §12.4). On iOS, use the confirmed O-039 mechanism: a small local Expo module that sets `isExcludedFromBackup` on the data directory. Exclusion is best effort, so the O-019 recovery path is still required.
- Do not invent cryptography. Use vetted libraries and a reviewed, versioned backup encryption format.
- Ask for confirmation before destructive restore, collection deletion, or full data deletion.
- Do not add permissions, network calls, telemetry, crash-reporting services, or SDKs unless a documented requirement justifies them and the privacy disclosures are updated.

## Implementation workflow

1. Inspect the existing repository and current phase (`docs/ROADMAP.md`) before changing files.
2. Implement one bounded feature or phase slice at a time.
3. Add or update tests with the implementation.
4. Run relevant tests, type checks, lint, and platform/build checks available in the repository.
5. For database work, test migration from the previous schema and verify data preservation.
6. For security-sensitive work, test both success and failure paths; do not infer security from configuration alone.
7. Update affected documentation and `docs/DECISIONS.md` when a decision is approved or a documented behavior changes, following the decision-management workflow above.
8. Report files changed, behavior delivered, tests run and their actual outcomes, known limitations, and the next logical step.

## Scope control

Do not implement cloud synchronization, user accounts, shared collections, a web client, AI features, social features, monetization, or arbitrary custom form fields in V1. Record useful ideas in a future-work section rather than expanding the current task.

Do not add broad architecture, dependencies, abstractions, or generic boilerplate without a concrete requirement. Prefer the simplest design that preserves the boundaries described in `docs/SDD.md`.
