# Roadmap — Memento V1

**Version:** 0.1  
**Date:** 8 November 2026  
**Status:** Phase structure Confirmed (decision O-015, product owner, 8 November 2026). Phase contents are a planning baseline; items that depend on an Open or Proposed decision are marked.

## 1. Rules

- Work proceeds one phase at a time. A phase starts only after the previous phase has been evaluated against its exit criteria and its blocking issues are resolved.
- Within a phase, work is delivered in bounded slices with tests, following root `CLAUDE.md`.
- Before starting a phase, check the "Needed by" column in [`DECISIONS.md`](./DECISIONS.md). Any Open or Proposed item needed by that phase must be settled first.
- No phase may expand V1 scope beyond [`PRD.md`](./PRD.md) and the V1 exclusions in `DECISIONS.md` §5.

## 2. Phases

| Phase | Name | Purpose |
|---|---|---|
| 0 | Technical validation and proofs of concept | Validate native and security risks with isolated experiments. No product features. |
| 1 | Project foundation and infrastructure | The app skeleton every later phase builds on. |
| 2 | Collections and categories | Organizing structures. |
| 3 | Entries and Quick Capture Inbox | The core information model and capture flow. |
| 4 | Dashboard, search, and reminders | Finding and resurfacing information. |
| 5 | Security, encryption, and backups | Protection and portability. |
| 6 | Testing, polish, and store release | Release quality and store submission. |

### Phase 0 — Technical validation and proofs of concept

**Scope:** isolated experiments under `experiments/phase-0/` only, never production code.

**Outcome:** concluded 8 November 2026 by product-owner decision (G-003), before any native build completed. Node and documentation validation done; native items carried forward as gates (`PHASE_0_REPORT.md` §7).

- `expo-sqlite` with plain SQL and the repository approach (O-016); Node-side execution of the same migration SQL (O-017).
- SQLCipher in real native Android and iOS builds: `cipher_version`, raw key, open without key, wrong key, separate connections.
- SecureStore key lifecycle, biometric availability, and recovery when the key is missing or wrong (O-019).
- Exclusion of app data from OS backups and device transfer on both platforms (O-018, O-039).
- Attachment storage and encryption primitives (O-008).
- Password-based key derivation and authenticated encryption for portable backups (O-007).
- Local notification scheduling and platform limits.

**Exit criteria:** [`PHASE_0_REPORT.md`](./PHASE_0_REPORT.md) records results per platform, and its blocking issues are resolved or explicitly carried forward by the product owner. Met by carrying them forward (G-003).

### Phase 1 — Project foundation and infrastructure

- Expo project initialized with the selected SDK recorded (O-009) and the permanent identifier `com.aubreyzip.memento` (O-001).
- TypeScript strict mode, lint (ESLint), formatting (Prettier), CI on GitHub Actions (typecheck, lint, format check, unit and repository tests).
- Expo Router shell: four primary areas and the quick-capture entry point as placeholders (B-008 Confirmed). Slice 4 done; tabs are text-only until O-046.
- Semantic design tokens: light final, dark provisional (O-004); System/Light/Dark setting.
- i18n scaffolding for English and Turkish, plus the System / English / Türkçe setting with immediate switching, foreground recheck, persistence, and English fallback (Confirmed O-034). Slice 3 done; persistence arrives with slice 5.
- Settings persistence: `SettingsRepository` interface with an interim in-memory implementation (slice 2, done), SQLite implementation on `app_settings` in slice 5 (O-044).
- Database infrastructure: connection bootstrap, migration runner (`PRAGMA user_version`, O-016), initial core schema per O-043 (`app_settings`, `collection_types`, `categories`, `collections`, core `entries` columns), repository interfaces, idempotent seeds with reserved built-in IDs (O-020, O-038).
- Encrypted database foundation: SQLCipher, fail-closed `cipher_version` check, raw-key keying, key storage, O-019 quarantine and recovery screen, O-018 exclusion on Android (config plugin) and iOS (O-039 local module) (Confirmed O-036).
- **Phase 0 carry-forward gates (G-003)**, before any build stores real data: verify the items in `PHASE_0_REPORT.md` §7 for Phase 1 on a physical Android device and a physical iPhone.
- Permission audit: strip template permissions Memento does not need (Phase 0 found `SYSTEM_ALERT_WINDOW`, legacy storage permissions and others in the generated manifest), per NFR-035.
- Domain types and invariants: Inbox rule, templates, status sets.
- Test infrastructure per O-017 (Confirmed): Node-side repository and migration tests, plus an on-device integration suite.

**Decisions:** all Phase 1 decisions are Confirmed, including O-009 (SDK 58, Node 24, Android 7.0 / iOS 16.4) and O-034 (language selection). **Also needed:** access to a physical Android device, a physical iPhone, and a macOS machine or EAS account for iOS builds, for the carried-forward gates. 

### Phase 2 — Collections and categories

- Collection CRUD and archive; built-in and custom collection types.
- Built-in and custom categories using the five templates; category management.
- **Needed before start:** O-005, O-006, O-014 (Proposed), O-025, O-027 (names).

### Phase 3 — Entries and Quick Capture Inbox

- Entries with template-driven fields: title, description, status, priority, dates, price, location, links, tags, pin, archive.
- Photos with their final protection (Confirmed O-037); requires O-008, O-031, O-012. Gate: on-device AES-GCM verification (G-003).
- Quick Capture, Inbox, atomic assignment, move back to Inbox.
- **Needed before start:** O-008, O-010, O-011, O-012, O-021, O-022, O-023, O-024, O-026 (schema), O-027, O-031.

### Phase 4 — Dashboard, search, and reminders

- Home dashboard (pinned, upcoming, recent, pending, Inbox).
- Search and filters with Turkish/English folding (O-026).
- Reminders and notification reconciliation.
- **Needed before start:** O-030, O-032. Gate: notification limits verified on devices (G-003).

### Phase 5 — Security, encryption, and backups

- App lock and app-switcher protection (O-013).
- Attachment protection review and hardening (O-008).
- Full backup, collection export/import, restore (O-007, O-028, O-029).
- Delete all data (O-033).
- Gate: KDF library verified on devices (RFC 9106 vector, timing) before backup crypto is accepted (O-007, G-003).

### Phase 6 — Testing, polish, and store release

- Accessibility, performance on the reference device (O-035), Turkish layout review.
- Store name, branding, and assets (O-002, O-003); privacy policy and store disclosures.
- Closed testing (Google Play 12-tester, 14-day rule for new personal accounts), TestFlight, release checklist.

## 3. Current status

| Phase | Status |
|---|---|
| 0 | **Concluded** 8 Nov 2026 (G-003). Node harness and documentation validation done; no native build completed; native validation carried forward as gates. See `PHASE_0_REPORT.md`. |
| 1 | Next. Not started. Scaffold finalized (8 Nov 2026): identifiers set, demo and web content removed, design tokens with O-042 rules, TypeScript/ESLint/Jest, Node 24 pinning, CI workflow, minimum OS versions pinned. |
| 2–6 | Not started. |
