# Product Requirements Document — Memento

**Document:** PRD  
**Version:** 0.1  
**Date:** 8 November 2026  
**Status:** Planning baseline  
**Product name:** Memento  
**Tagline:** Remember the little things.

## 1. Executive summary

Memento is a private, offline-first mobile application that helps a person remember, organize, and act on information that matters in everyday life. Users create collections for people, spaces, projects, events, or other subjects. Within each collection, they save entries under predefined or custom categories.

Examples include remembering a partner's favorite flowers, keeping a list of books a friend wants to read, planning places to visit, tracking repairs around the home, recording important dates, or collecting project ideas.

Memento is not limited to romantic relationships and is not intended to be a surveillance, social-network, or multi-user collaboration product. In V1, the data belongs to the individual app user and stays on the device unless the user explicitly exports it.

## 2. Vision and product promise

**Vision:** Make it effortless to preserve the small details that are easy to forget and useful to remember.

**Product promise:** Memento gives users one calm, organized place to capture information, find it later, and turn selected ideas into actions.

**Experience principle:** Remembering should be easier than organizing. Users must be able to capture a thought quickly and classify it later.

## 3. Problem statement

People collect useful information across conversations, messages, browser tabs, notes, screenshots, and memory. This information becomes fragmented or forgotten. Generic notes apps can store it, but they do not naturally connect a person or space to relevant categories, statuses, dates, tags, and reminders.

Memento addresses this by providing:

- A flexible way to group information by subject (collections).
- Reusable ways to classify information (categories and templates).
- A consistent entry model with optional structured fields.
- A quick-capture path for information that has not yet been organized.
- Offline storage and portable manual backups.

## 4. Target users

### 4.1 Primary audience

People who want to remember and organize details about their lives, including information about other people, their household, activities, events, and projects.

### 4.2 Example personas

**The thoughtful partner**
- Saves gift ideas, favorite things, preferences, places to visit, and dates.
- Needs fast capture and later retrieval.

**The household organizer**
- Tracks repairs, purchases, improvements, warranties/links, and household plans.
- Needs statuses, priorities, dates, and photos.

**The memory keeper**
- Keeps useful details about friends and family.
- Needs flexible categories and search rather than task-management features everywhere.

**The personal project planner**
- Collects ideas, tasks, events, links, and reference images for projects.
- Needs reusable collections and tags.

### 4.3 User assumptions

- A user may create zero, one, or many collections.
- A user may create collections for multiple purposes.
- A user may not want to create an account.
- A user may use the app without an internet connection.
- User-created content may refer to other people; the app should encourage respectful, relevant note-taking and avoid asking for sensitive information unnecessarily.

## 5. Product principles

1. **Warm minimalism:** Use the chosen palette with generous spacing, clear hierarchy, and restrained decoration.
2. **Capture first:** Quick Capture must not require a user to choose a collection and category before saving.
3. **Flexible, not complicated:** Custom categories use supported templates; no arbitrary form builder in V1.
4. **Right fields for the right entry:** Display optional fields contextually rather than showing every field every time.
5. **Private by default:** No account, hosted personal data, ads, or analytics in V1.
6. **Offline by design:** Primary functionality must work without a network connection.
7. **Portable ownership:** Users can export and restore their information, including attachments.
8. **Accessible and localized:** Support English and Turkish, screen readers, text scaling, and readable color contrast.

## 6. Product structure

### 6.1 Collections

A collection is the top-level container for a subject. Built-in collection types:

- Person
- Space
- Project
- Event
- General

Users may also create custom collection types with a name, icon, and accent color. Collection instances have a name, optional description, type, icon/accent overrides, and timestamps.

V1 collections are not nested. Entries are assigned to one collection only, except for unsorted Inbox entries.

### 6.2 Categories

A category describes what kind of information an entry represents. Built-in categories:

- Wishlist
- Experiences
- Preferences
- Home & Improvements
- Tasks & Repairs
- Important Dates
- General Notes

Users may create custom categories. Categories are reusable across collections in the V1 baseline. Each category is associated with one supported template:

| Template | Use | Status behavior |
|---|---|---|
| Note | General information | No status |
| Task | Something to do or fix | To do, In progress, Completed |
| Wishlist | Something to obtain | Saved, Planned, Purchased |
| Event | An event or experience | Idea, Planned, Completed, Cancelled |
| Preference | A fact or preference to remember | No status |

A custom category selects one template. It does not define arbitrary custom fields.

### 6.3 Entries

An entry is the primary unit of saved information. It has a required title and may have a description, status, priority, date, price, location, links, attachments, and tags.

Entries are assigned to exactly one collection and one category after organization. Inbox entries are unsorted and have neither collection nor category until the user assigns them.

### 6.4 Quick Capture Inbox

The Inbox is a built-in, system-managed destination for unsorted entries. The user can save a title and optional description quickly, then organize it later. Inbox entries are searchable and included in backups. Inbox is not a user-created collection and cannot be deleted.

## 7. Core user journeys

### Journey A — Remember something about a person

1. Open Memento.
2. Tap Quick Add.
3. Enter a short note, e.g. “Would love a dark green handbag”.
4. Save to Inbox.
5. Later move it to the relevant person's collection and Wishlist category.
6. Optionally add a link, price, photo, tag, or priority.

### Journey B — Track a home repair

1. Open the “Our Home” collection.
2. Open Tasks & Repairs.
3. Add “Fix the kitchen cabinet”.
4. Add a description/photo and set priority.
5. Optionally set a due date and reminder.
6. Update status as work progresses and mark it completed.

### Journey C — Save an experience

1. Open a person's collection or a project collection.
2. Add an entry under Experiences.
3. Save the place, link, location, date, and notes.
4. Set status to Planned when a date is chosen.
5. Mark it Completed afterwards.

### Journey D — Restore personal data on a new device

1. On the old device, create a password-protected full backup.
2. Transfer the backup file using the operating system's file/share mechanism.
3. On the new device, choose Import Backup.
4. Enter the backup password and review the import summary.
5. Confirm restoration and verify restored collections and media.

## 8. Functional scope for V1

### 8.1 Included

- First-run onboarding and privacy explanation.
- English and Turkish interface localization.
- System, Light, and Dark appearance modes.
- Create, view, edit, archive, and delete collections.
- Built-in and custom collection types.
- Built-in and custom categories using supported templates.
- Quick Capture Inbox.
- Create, view, edit, move, archive, and delete entries.
- Template-appropriate statuses and priority levels.
- Optional photos, multiple links, dates, price/currency, location text, and tags.
- Dashboard with upcoming items, pending work, pinned entries, recent entries, and quick capture.
- Global search and filters.
- Pinned entries and archive.
- Optional local reminders.
- Optional biometric app lock.
- Manual full backup and collection export/import, including attachments.
- Permanent local data deletion.
- Offline operation for all core features.

### 8.2 Excluded

- User registration, server authentication, or user profiles hosted remotely.
- Hosted backend or remote database.
- Cloud synchronization or automatic cloud backup.
- Shared collections, invitations, permissions, or real-time collaboration.
- Web client.
- AI assistant or remote AI processing.
- Social features.
- Ads, subscriptions, purchases, or payment processing.
- Arbitrary custom field/form builder.
- Contact-book access or background location tracking.

## 9. Navigation and screen inventory

Primary navigation has four areas:

1. **Home:** Upcoming dates/reminders, tasks needing attention, pinned entries, recently added entries, Quick Add.
2. **Collections:** Collection list, collection creation, collection details and categories.
3. **Search:** Global search with category, collection, status, priority, tag, and archive filters as applicable.
4. **Settings:** Theme, language, app lock, notifications, backup/restore, data deletion, privacy, and app information.

Quick Add should be available from the primary app shell and major content screens. Entry details and edit forms are pushed/modal routes, not additional bottom tabs.

## 10. Brand and visual direction

### 10.1 Brand

- Name: **Memento** (working name; public store/trademark clearance is still required).
- Tagline: **Remember the little things.**
- Personality: warm, minimal, personal, modern, calm, and welcoming.
- Avoid: corporate task-manager styling, excessive hearts/romantic decoration, clutter, or a childish aesthetic.

### 10.2 Confirmed color palette

| Token intent | Hex | Primary use |
|---|---|---|
| Burgundy | `#5D2A42` | Primary text, primary buttons, strong icons |
| Coral | `#FB6376` | Accent, emphasis, selected/active details |
| Soft coral | `#FCB1A6` | Supporting surfaces, subtle highlights |
| Peach | `#FFDCCC` | Secondary surfaces and cards |
| Cream | `#FFF9EC` | Light-theme app background |

Use semantic design tokens rather than hardcoding color values throughout components. Confirm contrast for each text/background pairing. Dark-theme hex values are not yet finalized; they must be designed and tested rather than mechanically inverting the light theme.

### 10.3 Visual behavior

- Calm hierarchy, readable typography, sufficient spacing.
- Use icons consistently and avoid emoji as the only representation of meaning.
- Motion should be subtle and purposeful.
- Provide meaningful empty states with a clear next action.
- Support system text scaling and screen readers.

## 11. Privacy and trust posture

Memento stores personal notes about people and places. The product must:

- Explain that information is stored locally in V1.
- Avoid requesting contacts, location, microphone, or camera permissions unless a specific user-initiated feature needs them. Photo selection should use the system picker.
- Avoid advertising and third-party analytics SDKs in V1.
- Never transmit user-created entry content to a service.
- Provide full data export and permanent deletion.
- Explain the consequences of losing an unbacked-up device.
- Explain that Memento's data is deliberately excluded from automatic phone backups and phone-to-phone transfers, so moving to a new phone requires a Memento backup (O-018). Users may keep exported backup files wherever they like, including cloud storage.
- Encourage users not to save passwords, financial credentials, or highly sensitive personal data, and to record information respectfully.

Local storage does not remove the user's privacy responsibilities or guarantee that a device backup is encrypted. The privacy policy and store disclosures must accurately describe actual implementation and platform behavior.

## 12. Success criteria

V1 is successful when:

- A new user can create their first collection and entry without guidance.
- A user can save an unsorted thought in a few interactions without first choosing its destination.
- A user can organize that entry later.
- Core CRUD, search, filters, status changes, and reminders work offline.
- Data remains after app restarts and app updates.
- Full backup and restore preserve all supported user data and attachments.
- Security controls are verified in real custom builds on Android and iOS.
- English and Turkish interfaces are complete and do not truncate common labels at supported text sizes.
- The application passes the release acceptance criteria in `TEST_PLAN.md` and `RELEASE_CHECKLIST.md`.

## 13. Future opportunities (not V1 commitments)

- Optional encrypted cloud synchronization.
- Multi-device transfer/sync.
- User-approved shared collections.
- Widgets and shortcuts.
- Optional AI-assisted organization, only with explicit consent and clear data handling.
- Additional localization.
- Advanced custom fields if user research demonstrates the need.

## 14. Dependencies and risks

| Risk | Impact | Mitigation |
|---|---|---|
| SQLCipher native configuration differs by platform/build | Data may not actually be encrypted | Prove and verify on custom Android and iOS builds before production. |
| Secure key loss or app reinstall | User may lose access to encrypted data | Define backup/recovery carefully; explain local-only behavior. |
| Attachment files and database can become inconsistent | Missing or orphaned images | Use staged file operations, reconciliation, and backup validation. |
| Feature scope expands | Hobby project becomes hard to finish | Keep V1 exclusions explicit and implement phase-by-phase. |
| Brand/store-name conflict | Release listing or trademark issue | Verify availability before store submission. |
| Platform permission/policy changes | Release delays | Re-check current store requirements at submission time. |

## 15. Related documents

- Requirements: [`SRS.md`](./SRS.md)
- Use cases: [`USE_CASES.md`](./USE_CASES.md)
- Architecture: [`SDD.md`](./SDD.md)
- Database: [`DATABASE_DESIGN.md`](./DATABASE_DESIGN.md)
- Tests: [`TEST_PLAN.md`](./TEST_PLAN.md)
- Release: [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md)
- Decisions: [`DECISIONS.md`](./DECISIONS.md)
