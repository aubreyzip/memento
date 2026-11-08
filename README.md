# Memento

> **Remember the little things.**

Memento is a private, offline-first personal information organizer for remembering, organizing, and acting on the details that matter in everyday life. It supports information about people, spaces, projects, events, and other user-defined subjects through flexible collections, categories, and entries.

## Project status

- **Documentation baseline:** `0.3` — 8 November 2026 (see `docs/DECISIONS.md`)
- **Implementation status:** Phase 0 concluded; Phase 1 (project foundation) is next. Product implementation not started. See [`docs/ROADMAP.md`](./docs/ROADMAP.md).
- **Application identifier:** `com.aubreyzip.memento` (Android and iOS)
- **Platforms:** Android and iOS
- **Primary stack:** React Native 0.88, Expo SDK 58, Expo Router, TypeScript (strict), SQLite (planned). Mobile only, no web target.
- **V1 model:** Single-user, local-first, no application backend, no account system, no cloud sync

## Development

Prerequisites: Node.js **24** (24.3 or newer; pinned in `.nvmrc` and `engines`, enforced by `.npmrc` `engine-strict`), npm, and for native builds the Android SDK or Xcode. Targets: Android 7.0 (API 24)+ and iOS 16.4+. Install with `npm install`.

| Command | Purpose |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` / `npm run ios` | Start the dev server and open Android or iOS |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run lint` | ESLint via `expo lint` |
| `npm run format` / `npm run format:check` | Prettier: format, or check without writing (code and config only; Markdown is excluded) |
| `npm test` | Jest unit tests |

CI (`.github/workflows/ci.yml`, GitHub Actions on Node 24) runs install, typecheck, lint, format check, tests, the Expo SDK dependency check, and config validation on every push to `main` and every pull request. `.gitattributes` keeps LF line endings on all platforms.

Once SQLCipher and other native modules are added in Phase 1, Expo Go no longer works; use a development build (`npx expo run:android` / `npx expo run:ios`, or EAS Build).

## Read before implementing

1. [`CLAUDE.md`](./CLAUDE.md) — project-specific instructions for AI coding agents.
2. [`docs/DECISIONS.md`](./docs/DECISIONS.md) — confirmed product choices, adopted design baselines, and unresolved decisions.
3. [`docs/PRD.md`](./docs/PRD.md) — product goals, audience, scope, and user experience.
4. [`docs/SRS.md`](./docs/SRS.md) — functional and non-functional requirements.
5. [`docs/SDD.md`](./docs/SDD.md) — proposed software architecture and implementation boundaries.
6. [`docs/DATABASE_DESIGN.md`](./docs/DATABASE_DESIGN.md) — persistence model, relationships, and migration rules.
7. [`docs/USE_CASES.md`](./docs/USE_CASES.md) — actors, use cases, and primary flows.
8. [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) — quality strategy and acceptance tests.
9. [`docs/RELEASE_CHECKLIST.md`](./docs/RELEASE_CHECKLIST.md) — beta, store, privacy, and release tasks.
10. [`docs/DOCUMENTATION_REVIEW.md`](./docs/DOCUMENTATION_REVIEW.md) — pre-Phase 1 review findings, open blockers, and the Phase 1 entry checklist.
11. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — the confirmed seven-phase plan and the current phase.
12. [`docs/PHASE_0_REPORT.md`](./docs/PHASE_0_REPORT.md) — Phase 0 results, limitations, and the validation gates carried into later phases.

Phase 0 experiment code lives in [`experiments/phase-0/`](./experiments/phase-0/). It is throwaway validation code, not part of the app.

## Documentation authority

`docs/DECISIONS.md` is the central decision register. Every decision is **Confirmed**, **Proposed**, **Open**, or **Superseded**. Do not silently promote a Proposed or Open decision into a requirement. When a decision is made or changes, update `docs/DECISIONS.md` first, then update every affected document in the same change, and mark replaced decisions as Superseded rather than deleting them.

## Working principles

- Make capturing information easier than organizing it.
- Keep the experience warm, minimal, accessible, and calm.
- Keep V1 genuinely offline and private by default.
- Avoid unnecessary infrastructure, accounts, analytics, ads, and permissions.
- Keep data portable through a documented, versioned backup format.
- Design for extension without implementing speculative V2 features.
