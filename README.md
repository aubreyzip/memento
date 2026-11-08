# Memento

> **Remember the little things.**

Memento is a private, offline-first personal information organizer for remembering, organizing, and acting on the details that matter in everyday life. It supports information about people, spaces, projects, events, and other user-defined subjects through flexible collections, categories, and entries.

## Project status

- **Documentation baseline:** `0.1` — 8 November 2026
- **Implementation status:** Not started / planning
- **Platforms:** Android and iOS
- **Primary stack:** React Native, Expo, TypeScript, SQLite
- **V1 model:** Single-user, local-first, no application backend, no account system, no cloud sync

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

## Documentation authority

The documents intentionally distinguish **user-confirmed decisions** from **recommended implementation baselines** and **open decisions**. Do not silently promote an open decision into a product requirement. When an approved decision changes, update `docs/DECISIONS.md` first and then update affected specifications in the same change.

## Working principles

- Make capturing information easier than organizing it.
- Keep the experience warm, minimal, accessible, and calm.
- Keep V1 genuinely offline and private by default.
- Avoid unnecessary infrastructure, accounts, analytics, ads, and permissions.
- Keep data portable through a documented, versioned backup format.
- Design for extension without implementing speculative V2 features.
