# Use Cases — Memento

**Version:** 0.1  
**Date:** 8 November 2026

## 1. Actors

### Primary actor

- **App User:** Owns the local Memento installation and all information stored in it.

### Supporting actors / external systems

- **Operating System:** Provides secure storage, biometrics/device authentication, local notifications, file access, and sharing.
- **Photo Picker:** Lets the user explicitly select images.
- **File Provider / Share Sheet:** Lets the user export or import backup files through the OS.

There are no remote users, administrators, backend services, or collaborators in V1.

## 2. Use-case overview

See [`diagrams/use-case-overview.mmd`](./diagrams/use-case-overview.mmd).

## 3. Use-case catalogue

| ID | Use case | Primary actor | Related requirements |
|---|---|---|---|
| UC-01 | Complete first-run setup | App User | FR-001–006 |
| UC-02 | Manage collections | App User | FR-010–016 |
| UC-03 | Manage collection types | App User | FR-011–015 |
| UC-04 | Manage categories | App User | FR-020–026 |
| UC-05 | Capture an unsorted entry | App User | FR-030–035 |
| UC-06 | Create or edit an entry | App User | FR-040–056, FR-060–064 |
| UC-07 | Add links and photos | App User, OS Photo Picker | FR-048–050 |
| UC-08 | Organize entries with tags and filters | App User | FR-054, FR-072–075 |
| UC-09 | Change status, priority, pin, or archive | App User | FR-044–047 |
| UC-10 | Schedule a reminder | App User, Operating System | FR-080–084 |
| UC-11 | Search saved information | App User | FR-072–075 |
| UC-12 | Change language or appearance | App User | FR-002–006 |
| UC-13 | Lock and unlock the app | App User, Operating System | FR-090–094 |
| UC-14 | Export a full backup or collection | App User, File Provider | FR-100–103 |
| UC-15 | Import/restore a backup | App User, File Provider | FR-104–108 |
| UC-16 | Delete local information | App User | FR-016, FR-056, FR-107 |

## 4. Detailed use cases

### UC-01 — Complete first-run setup

**Goal:** Prepare Memento for first use without requiring account creation.

**Preconditions:** App is installed and opened for the first time.

**Main flow:**
1. App displays a short introduction and explains local-first storage.
2. App proposes a language based on device locale where supported.
3. User confirms or selects English/Turkish.
4. User selects System, Light, or Dark appearance, or keeps the default.
5. App initializes the database, built-in collection types, and built-in categories.
6. App opens Home.

**Alternatives / exceptions:**
- If the device locale is unsupported, default to English and allow a change in Settings.
- If database initialization or required encryption verification fails, do not silently create an unencrypted database; show a recoverable error.
- If a database file exists but its key is missing or does not open it (for example, after an OS-level device restore or a device transfer), do not delete or recreate the database automatically (O-019, SDD §8.1.1):
  1. App moves the unreadable database aside to a quarantine name.
  2. App explains that the existing data cannot be opened on this device.
  3. User chooses **Restore from a Memento backup** (continues with UC-15) or **Start fresh** (creates a new empty database).
  4. The quarantined file is kept unless the user separately confirms its deletion.

**Postconditions:** Local settings and seeded system data exist; no account is created.

### UC-02 — Manage collections

**Goal:** Create and organize a container for a person, space, project, event, or other subject.

**Preconditions:** App is initialized.

**Main flow:**
1. User opens Collections and chooses Add Collection.
2. User enters a name and selects a built-in or custom collection type.
3. User optionally enters a description, icon, and accent color.
4. User saves.
5. The collection appears in the collection list.

**Alternatives:**
- If a custom type is needed, user creates it with a name, icon, and color, then selects it.
- If the collection is archived, it is hidden from normal lists but remains recoverable.
- If the user deletes a collection with entries, the app explains that its entries will also be deleted or offers archive instead. Destructive deletion requires confirmation.

**Postconditions:** Collection metadata is persisted locally.

### UC-03 — Manage collection types

**Goal:** Add a reusable custom type for collections.

**Main flow:**
1. User opens collection type management (from collection creation or Settings).
2. User enters a type name, selects an icon and optional accent color.
3. User saves the type.
4. The type becomes available when creating or editing collections.

**Rules:** Built-in types cannot be deleted. A custom type in use cannot be deleted; it may be archived/deactivated. Existing collections retain their type label even if the type is archived.

### UC-04 — Manage categories

**Goal:** Organize entries using built-in or custom categories.

**Main flow:**
1. User opens category management.
2. User selects a built-in category or creates a custom category.
3. For a custom category, user chooses a name, icon, optional color, and one template: Note, Task, Wishlist, Event, or Preference.
4. User saves.
5. The category is available across collections.

**Rules:** A category is global/reusable in V1. System categories cannot be deleted. Custom categories with existing entries must be archived or have entries reassigned before deletion.

### UC-05 — Capture an unsorted entry

**Goal:** Save a thought quickly without classifying it first.

**Preconditions:** App is open and initialized.

**Main flow:**
1. User taps Quick Add.
2. App opens a minimal capture form.
3. User enters a title and optional short description.
4. User saves.
5. App stores an Inbox entry and confirms capture.

**Alternatives:** User may choose a collection/category immediately, but this is optional. If neither is chosen, both remain unset.

**Postconditions:** Entry is visible in the Quick Capture Inbox and global search.

### UC-06 — Create or edit an entry

**Goal:** Store structured information in a collection/category.

**Main flow:**
1. User opens a collection and selects a category, or chooses Quick Add.
2. User enters a required title and optional description.
3. The app displays fields appropriate to the category template.
4. User optionally adds priority, dates, price, location, links, photos, and tags where applicable.
5. User saves.
6. App validates the entry and persists all related information in a transaction where possible.

**Rules:** Note and Preference templates do not show status controls. Task, Wishlist, and Event templates use their defined status sets. An assigned entry has exactly one collection and category. An Inbox entry has neither.

### UC-07 — Add links and photos

**Goal:** Attach useful references to an entry.

**Main flow:**
1. User opens entry create/edit.
2. User adds one or more URLs and/or selects images using the OS photo picker.
3. App validates supported URL schemes.
4. App copies image bytes into app-managed private storage and creates metadata records.
5. App displays thumbnails and links in entry details.

**Alternatives:** User cancels the picker; no attachment is added. If file copying fails, the database must not retain a broken attachment record.

### UC-08 — Organize entries with tags and filters

**Goal:** Add cross-cutting labels and retrieve related information.

**Main flow:**
1. User creates or selects tags while editing an entry.
2. App normalizes tag identity and preserves the user's display label.
3. User searches or filters by tag, collection, category, status, priority, and archive state.

**Postconditions:** Tags and associations remain local and searchable.

### UC-09 — Change status, priority, pin, or archive

**Goal:** Track the state and importance of an actionable entry.

**Main flow:**
1. User opens an entry or uses a contextual action.
2. User changes a template-appropriate status, priority, or pin state.
3. User may archive the entry.
4. App saves the update and refreshes relevant dashboard/search views.

**Rules:** Status must belong to the category's template. Archived entries remain available through an archive filter and in backups.

### UC-10 — Schedule a reminder

**Goal:** Receive a local notification related to an entry.

**Main flow:**
1. User selects Add Reminder on an entry.
2. App requests notification permission if required.
3. User selects a local date/time.
4. App stores the reminder and schedules a local OS notification.
5. When triggered, OS displays the notification; tapping it opens the related entry if it still exists.

**Alternatives:** If permission is denied, the reminder remains visible in the app as an unscheduled reminder or the app explains that notification delivery is disabled. No remote push service is used.

### UC-11 — Search saved information

**Goal:** Find an entry across collections and Inbox.

**Main flow:**
1. User opens Search and enters a query.
2. App searches titles and descriptions, and tags where implemented.
3. User applies filters or sorting.
4. User opens a result and can edit or act on it.

### UC-12 — Change language or appearance

**Goal:** Personalize the interface.

**Main flow:**
1. User opens Settings.
2. User selects English/Turkish and System/Light/Dark.
3. App applies and persists the setting.
4. User-created content remains unchanged.

### UC-13 — Lock and unlock the app

**Goal:** Add a local access barrier.

**Main flow:**
1. User enables app lock in Settings.
2. App explains device capability and configures biometric/device-credential authentication.
3. App locks on manual request or configured lifecycle timeout.
4. User authenticates to unlock.

**Exceptions:** If biometrics become unavailable or are invalidated, follow the documented device-credential fallback. Do not lock the user out of their data without a recovery path.

### UC-14 — Export a full backup or collection

**Goal:** Make user data portable.

**Main flow:**
1. User opens Settings → Backup & Restore.
2. User chooses Full Backup or Export Collection.
3. App prepares a consistent snapshot of the selected data and attachments.
4. User sets/enters a backup passphrase. SRS NFR-033 requires encrypted backups; whether an unencrypted export is ever allowed, and the passphrase rules, are pending decision O-028.
5. App creates a versioned encrypted archive and opens the OS share/save interface.
6. App reports success only after the file has been written successfully.

### UC-15 — Import or restore a backup

**Goal:** Restore data from a Memento backup.

**Main flow:**
1. User selects Import Backup and chooses a file.
2. App checks the archive format/version and integrity.
3. User enters the passphrase.
4. App decrypts to a temporary staging area and validates manifest, records, and media.
5. App shows an import summary.
6. User confirms the operation.
7. App applies the import transactionally or using a recoverable replacement strategy.
8. App reconciles reminders and reports the outcome.

**Exceptions:** Wrong password, corrupted archive, unsupported version, missing media, insufficient storage, or failed migration must not partially overwrite live data.

### UC-16 — Delete local information

**Goal:** Permanently remove data the user no longer wants stored.

**Main flow:**
1. User opens Settings → Data Management.
2. User selects permanent deletion of all local data, or deletes a specific collection/entry.
3. App clearly explains consequences and asks for confirmation.
4. App removes database records, related media, and scheduled notifications.
5. App returns to a clean initialized state or the relevant parent screen.

## 5. Main interaction flows

### Quick Capture

See [`diagrams/quick-capture-flow.mmd`](./diagrams/quick-capture-flow.mmd).

### Backup and restore

See [`diagrams/backup-restore-flow.mmd`](./diagrams/backup-restore-flow.mmd).

## 6. Use-case scope boundary

The OS may provide file sharing, photo selection, notifications, and biometrics. Memento does not provide a network account, remote sync, user-to-user sharing, or cloud backup in V1.
