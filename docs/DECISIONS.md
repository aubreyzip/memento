# Memento — Product and Technical Decisions Register

**Baseline:** 0.1  
**Recorded:** 8 November 2026  
**Status:** Planning baseline; implementation has not started.

This register records decisions made during product planning. It separates what the product owner explicitly selected from design recommendations adopted as the working specification. An implementation agent must not silently treat an unresolved item as approved.

## 1. Product-owner-confirmed decisions

| ID | Area | Decision | Status |
|---|---|---|---|
| D-001 | Name | The app is named **Memento**. | Confirmed |
| D-002 | Audience | Memento is life-oriented: it can organize information about people and everyday life, not only romantic relationships. | Confirmed |
| D-003 | Visual personality | Warm, minimal, and modern. | Confirmed |
| D-004 | Color palette | `#5D2A42`, `#FB6376`, `#FCB1A6`, `#FFDCCC`, `#FFF9EC`. | Confirmed |
| D-005 | Themes | Support both light and dark themes. | Confirmed |
| D-006 | Collection model | Support flexible collection types. | Confirmed |
| D-007 | Categories | Provide predefined categories and allow custom categories. | Confirmed |
| D-008 | Entry information | Support photos, links, dates, price, priority, location, and tags. | Confirmed |
| D-009 | Storage | Offline/local-device storage. | Confirmed |
| D-010 | Portability | Users must be able to export and import their information. | Confirmed |
| D-011 | Backup style | Manual backup rather than automatic cloud backup. | Confirmed |
| D-012 | V1 ambition | Build a complete, useful first release rather than an extremely limited proof of concept. | Confirmed; scope must remain controlled |
| D-013 | Localization | English and Turkish. | Confirmed |
| D-014 | Platforms | Android and iOS, distributed through Google Play and Apple App Store. | Confirmed in the project brief |
| D-015 | Framework | React Native. | Confirmed in the project brief |

## 2. Adopted product-design baselines

These were recommended during planning and are incorporated into the current specifications so implementation can proceed. Revisit them if the product owner disagrees.

| ID | Area | Working baseline | Rationale |
|---|---|---|---|
| B-001 | Product definition | Private, offline-first personal information organizer for people, spaces, projects, events, and other meaningful subjects. | Reflects the life-oriented audience. |
| B-002 | Tagline | “Remember the little things.” | Working brand expression. |
| B-003 | Collections | Built-in types: Person, Space, Project, Event, General; plus user-defined types. | Flexible without arbitrary schemas. |
| B-004 | Categories | Built-in categories plus custom categories. Categories are reusable across collections in V1. | Avoid duplicating categories per collection. |
| B-005 | Category templates | Custom categories choose one of Note, Task, Wishlist, Event, or Preference templates. | Avoid a general form builder. |
| B-006 | Entry ownership | An assigned entry belongs to exactly one collection and one category. | Simple ownership and predictable filtering. |
| B-007 | Inbox | Include a Quick Capture Inbox for unsorted entries. | Capture should not require classification first. |
| B-008 | Navigation | Four primary areas: Home, Collections, Search, Settings; quick-add is globally accessible. | Simple information architecture. |
| B-009 | Sharing | No live sharing or collaboration in V1. | Keeps the app single-user and offline. |
| B-010 | Backend | No app backend, account system, or cloud sync in V1. | Supports privacy and a manageable hobby-project scope. |
| B-011 | Monetization | Free initially; no advertisements or subscriptions in V1. | Keeps the product focused and avoids unnecessary tracking SDKs. |
| B-012 | Reminders | Include optional local-device reminders in V1. | Useful without a backend. |
| B-013 | Security | SQLCipher-protected SQLite is the target; attachment and backup encryption must be designed separately and verified. | Local content can still be sensitive. |
| B-014 | Backup | Manual full backup and collection export/import are desired; use a versioned, password-protected archive if a vetted implementation is validated. | Portability without cloud storage. |
| B-015 | Themes | System / Light / Dark settings. | Supports user preference and OS appearance. |

## 3. Technology baseline

| Area | Working choice | Status / caveat |
|---|---|---|
| Runtime/framework | React Native + Expo | Baseline |
| Language | TypeScript | Baseline |
| Navigation | Expo Router | Baseline; follow the installed Expo SDK's current instructions. |
| Local database | `expo-sqlite` | Baseline |
| Database encryption | SQLCipher through Expo SQLite config plugin | Mandatory proof of concept before production data is stored. |
| Data access | Repository pattern | Baseline |
| ORM | Drizzle ORM | **Not yet locked.** Validate current Expo SDK compatibility and migration workflow before adoption; direct parameterized Expo SQLite repositories are an acceptable fallback. |
| Validation | Zod | Proposed baseline |
| Forms | React Hook Form | Proposed baseline |
| Secure key storage | Expo SecureStore | Proposed baseline; validate lifecycle and backup/recovery behavior. |
| Biometrics | Expo Local Authentication | Proposed baseline |
| Image selection | Expo ImagePicker | Proposed baseline |
| Local files | Expo FileSystem | Proposed baseline |
| Local notifications | Expo Notifications | Proposed baseline |
| Localization | i18next + an Expo-compatible localization integration | Proposed baseline; implementation library may be refined. |
| Testing | Jest, React Native Testing Library, Maestro | Proposed baseline |
| CI | GitHub Actions | Proposed baseline |
| Builds/submission | EAS Build / EAS Submit | Proposed baseline |

## 4. Open decisions — do not guess silently

| ID | Question | Current direction |
|---|---|---|
| O-001 | Final app identifier / bundle ID | Choose after checking availability; e.g. reverse-domain identifier owned by the developer. |
| O-002 | Public store name and trademark clearance | “Memento” is the working name. Check store-name conflicts, domain availability if needed, and trademark databases before release. |
| O-003 | Final logo, icon, typography, and illustration style | Palette and warm-minimal direction are set; visual assets remain to be designed. |
| O-004 | Exact dark-theme token values | Use a burgundy-tinted dark palette; validate contrast and readability during design. |
| O-005 | Custom category reuse | Current baseline: categories are global/reusable across collections. Revisit if users need collection-specific categories. |
| O-006 | Whether categories can be deleted | Recommended behavior: system categories cannot be deleted; custom categories may be archived, and deletion must be blocked or require reassignment if entries use them. |
| O-007 | Backup cryptographic format and dependency | Must be selected after a security/compatibility spike. Never write custom cryptography. |
| O-008 | Attachment encryption at rest | Decide and verify a vetted approach before claiming attachments are encrypted. App-private storage alone is not equivalent to file-level encryption. |
| O-009 | Supported minimum Android/iOS versions | Set at project initialization based on current Expo SDK and target audience; document before release. |
| O-010 | Price currency behavior | Store ISO 4217 currency code per price; decide default currency from device locale or user setting. Do not assume all users use TRY. |
| O-011 | Whether location supports coordinates/maps | V1 baseline is user-entered text/address; no location permission or map SDK. |
| O-012 | Whether entry photos can be shared/exported independently | V1 backup includes attachments; standalone share/export can be considered separately. |
| O-013 | Data retention / app-lock timeout options | Define UX defaults during implementation, with immediate manual lock available. |
| O-014 | Custom collection type deletion behavior | Prevent deletion while in use; allow archive/deactivation. |

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

## 6. Change-control rule

When a decision changes:

1. Add or update the relevant ID in this file.
2. Mark its status (`Confirmed`, `Proposed`, `Superseded`, or `Deferred`).
3. Update all affected requirements, diagrams, and database design in the same change.
4. Add a migration and compatibility plan if stored data is affected.
5. Record any impact on backups, privacy disclosures, tests, and store declarations.
