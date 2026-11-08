# Memento — Claude Code Project Guide

## Start here

Before making a change, read:

- `docs/DECISIONS.md`
- The relevant sections of `docs/PRD.md` and `docs/SRS.md`
- `docs/SDD.md` for architecture and module boundaries
- `docs/DATABASE_DESIGN.md` for any persistence change
- `docs/TEST_PLAN.md` for required verification

The documentation is the project source of truth. If implementation and documentation disagree, do not guess: identify the discrepancy and propose the smallest consistent correction. Product-owner-confirmed decisions take precedence over recommendations.

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

- Use React Native with Expo and TypeScript. Use Expo Router for navigation.
- Keep routes thin. Screens orchestrate feature components and application actions; they should not contain SQL statements.
- Keep persistence behind repository interfaces. UI components must not access SQLite directly.
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
- SQLCipher does not encrypt attachment files. Follow the attachment-protection design and tests in `docs/SDD.md`.
- Do not invent cryptography. Use vetted libraries and a reviewed, versioned backup encryption format.
- Ask for confirmation before destructive restore, collection deletion, or full data deletion.
- Do not add permissions, network calls, telemetry, crash-reporting services, or SDKs unless a documented requirement justifies them and the privacy disclosures are updated.

## Implementation workflow

1. Inspect the existing repository and current phase before changing files.
2. Implement one bounded feature or phase slice at a time.
3. Add or update tests with the implementation.
4. Run relevant tests, type checks, lint, and platform/build checks available in the repository.
5. For database work, test migration from the previous schema and verify data preservation.
6. For security-sensitive work, test both success and failure paths; do not infer security from configuration alone.
7. Update affected documentation and `docs/DECISIONS.md` when a decision is approved or a documented behavior changes.
8. Report files changed, behavior delivered, tests run and their actual outcomes, known limitations, and the next logical step.

## Scope control

Do not implement cloud synchronization, user accounts, shared collections, a web client, AI features, social features, monetization, or arbitrary custom form fields in V1. Record useful ideas in a future-work section rather than expanding the current task.

Do not add broad architecture, dependencies, abstractions, or generic boilerplate without a concrete requirement. Prefer the simplest design that preserves the boundaries described in `docs/SDD.md`.
