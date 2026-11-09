# Phase 0 Report — Technical Validation

> **Frozen record (9 November 2026, G-004).** Do not edit, except the §7 gate list and gate-status tables, which remain the tracker for the carried-forward gates.

**Date:** 8 November 2026  
**Phase:** 0 — Technical validation and proofs of concept (ROADMAP, decision O-015)  
**Outcome:** **Concluded with validation carried forward** (decision G-003)  
**Experiment code:** [`experiments/phase-0/`](../experiments/phase-0/)

## 1. Summary

Phase 0 was stopped by the product owner before the first native build finished, and then concluded by product-owner decision. What it established:

- **Tested:** the confirmed data-access approach (plain SQL migrations with `PRAGMA user_version`) runs unchanged in Node. The test harness reproduced the table-rebuild cascade data-loss hazard and proved that the FK-safe procedure prevents it. The Inbox `CHECK` and the reserved built-in ID namespace work. SQLite's built-in case folding does not handle Turkish letters. 8 of 8 tests pass.
- **Verified from configuration:** the Android backup-exclusion config plugin writes `allowBackup="false"`, `dataExtractionRules`, and `fullBackupContent` into the prebuild manifest.
- **Verified from current official documentation:** several facts that changed the design:
  - on some Android devices, `allowBackup="false"` alone does not stop device-to-device transfer;
  - Apple's backup-exclusion flag is guidance, not a guarantee;
  - Expo FileSystem has no backup-exclusion API;
  - `expo-crypto` 58 has AES-GCM with AAD and explicit nonces;
  - `react-native-quick-crypto` ships Argon2id.
- **Not tested:** nothing ran on any Android or iOS device or emulator. SQLCipher, SecureStore behavior, key-state recovery, AES-GCM, KDFs, file moves, and notification limits on real devices are **unverified**. They are carried forward as gates (§7).

No production code was written. No product decisions were changed.

## 2. What was investigated and what happened

| Step | Result |
|---|---|
| Current Expo SDK and package versions | Expo SDK 58 (`expo` 58.0.23) is current; versions recorded in §3. |
| Official documentation review (Expo SQLite, SecureStore, FileSystem, Crypto, Notifications, app config; Android Auto Backup; Apple iCloud backup; react-native-quick-crypto) | Done. Findings in §4. |
| Node harness for plain-SQL migrations | Built and run: 8/8 pass (§4.1). |
| Native probe app (Expo SDK 58, 17 automated probes) | Written and type-checked (`tsc --noEmit`, no errors). `expo prebuild` for Android succeeded. |
| Android release build (x86_64) for the Pixel 8 emulator (Android 16, API 36) | **Stopped before compilation.** Gradle was still downloading build tools, including an automatic install of NDK 27.1.12297006. |
| Install and run probes on Android | Not done. |
| iOS build and run | Not attempted. This machine runs Windows; iOS builds need macOS or EAS Build, plus an Apple developer account. |
| Cleanup after stopping | The build, emulator, Gradle/Kotlin daemons, adb server, and temporary mapped drive were stopped or removed. The partial NDK download and temporary build folder were deleted. Experiment files were moved to `experiments/phase-0/`. |

## 3. Environment, dependencies, and versions

| Item | Version |
|---|---|
| Host | Windows 11 Home (10.0.26200), Node 20.18.0, npm 11.12.1 |
| JDK used for the Android build | Temurin 21.0.4 |
| Android SDK | platforms 36 and 36.1, build-tools 36/37, NDK 28.2 installed; the build requested NDK 27.1.12297006 |
| Emulator | Pixel_8 AVD, Android 16 (API 36), x86_64. Booted only; no probe installed |
| Expo / React Native / React | `expo` 58.0.23, `react-native` 0.88.1, `react` 19.3.0, TypeScript 6.0.3 |
| Expo modules | `expo-sqlite` 58.0.15, `expo-secure-store` 58.0.2, `expo-crypto` 58.0.7, `expo-file-system` 58.0.13, `expo-notifications` 58.1.8, `expo-local-authentication` 58.0.2 |
| KDF candidate | `react-native-quick-crypto` 1.1.9 with `react-native-nitro-modules` 0.37.2 (experiment only; not an approved dependency) |
| Node harness | `sql.js` 1.15.2 (SQLite 3.54.0), `hash-wasm` 4.13.0, Node built-in test runner |

## 4. Results by area

Status legend: **Tested** (ran and observed), **Config-verified** (inspected generated output), **Docs-verified** (current official docs or installed package source), **Not tested**.

### 4.1 Plain SQL, migrations, and the Node test path (O-016, O-017)

**Tested** in Node; platform-independent.

| Test | Result |
|---|---|
| Migration runner reaches the latest `user_version`; re-run is a no-op | Pass |
| A failing migration rolls back and leaves `user_version` unchanged | Pass |
| Inbox `CHECK` rejects half-assigned entries | Pass |
| **Naive table rebuild with `foreign_keys = ON` silently deletes child rows** (R-34 hazard) | Reproduced |
| FK-safe rebuild (foreign keys off outside the transaction, `foreign_key_check`, re-enable) preserves child rows | Pass |
| `PRAGMA foreign_keys` inside a transaction has no effect | Confirmed |
| Built-in IDs use the reserved v8 namespace; 10,000 random v4 UUIDs never fall inside it (O-038) | Pass |
| SQLite `lower()` and `LIKE` do not fold `İ`, `Ş`; the app-level fold (NFKD, strip marks, `İ I ı → i`) works (O-026 evidence) | Confirmed |

Tooling finding: `better-sqlite3` 13.0.3 requires Node ≥ 22 and crashed (segmentation fault) on Node 20.18. `sql.js` works on Node 20. Fidelity limit: `sql.js` is plain SQLite 3.54.0, not SQLCipher. Driver-level behavior on the device must be covered by the on-device suite (O-017 part 3).

### 4.2 SQLCipher with `expo-sqlite` (B-013, O-019)

| Claim | Android | iOS |
|---|---|---|
| `useSQLCipher` config option exists; SQLCipher supported on Android and iOS; not in Expo Go | Docs-verified | Docs-verified |
| Without SQLCipher in the binary, `PRAGMA key` is silently ignored; `PRAGMA cipher_version` returns a row only with SQLCipher | Docs-verified | Docs-verified |
| `withExclusiveTransactionAsync()` uses a new connection that does not inherit `PRAGMA foreign_keys` | Docs-verified | Docs-verified |
| `cipher_version` returns a version in a release build | Not tested | Not tested |
| Raw-key `PRAGMA key = "x'…'"` accepted; file header is not plaintext | Not tested | Not tested |
| Open without key or with wrong key fails with a detectable error | Not tested | Not tested |
| Whether the exclusive-transaction connection is keyed (expected: no) | Not tested | Not tested |

The probe app contains automated checks for every untested row (`experiments/phase-0/native-probe/App.tsx`).

### 4.3 SecureStore key lifecycle, biometrics, and recovery (O-019)

| Claim | Android | iOS |
|---|---|---|
| Values stored with `requireAuthentication` become unreadable after biometric changes; the confirmed design never uses it for data keys | Docs-verified | Docs-verified |
| `*_THIS_DEVICE_ONLY` classes do not migrate to a new device in backups | n/a | Docs-verified |
| SecureStore data is excluded from Android Auto Backup only through the plugin's default configuration; with custom rules, `configureAndroidBackup` must be `false` and the rules must exclude it | Docs-verified | n/a |
| Key round-trip without authentication | Not tested | Not tested |
| Recovery state machine (create, open, missing key → quarantine, new key, wrong key → quarantine; bytes unchanged) | Not tested (probe written) | Not tested |
| Biometric capability reporting (`hasHardware`, `isEnrolled`) | Not tested | Not tested |

The recovery design is documented in SDD §8.1.1, UC-01, and `diagrams/startup-key-recovery.mmd`.

### 4.4 Portable backup: password KDF and encryption (O-007)

| Claim | Status |
|---|---|
| `expo-crypto` has no password KDF | Docs-verified |
| `react-native-quick-crypto` 1.1.9 ships `argon2` (argon2d/i/id with secret and associated data, RFC 9106 bounds checks) and `scrypt`/`scryptSync` | Verified in installed package source |
| It needs `react-native-nitro-modules` and a config plugin and does not run in Expo Go | Docs-verified |
| Its documentation page shows a different `argon2` parameter shape (`pass`, `salt`, `memoryCost`, `timeCost`) from the shipped code (`message`, `nonce`, `memory`, `passes`) | Observed; treat the docs as unreliable for this API |
| Argon2id correct against the RFC 9106 test vector, timing at 64 MiB / t=3 on devices, agreement with an independent implementation | Not tested. The probe embeds the vector and the Node cross-check script exists. The expected value was transcribed from RFC 9106 §5.3 and must be re-checked against the RFC when run |

### 4.5 Attachment storage and encryption (O-008)

| Claim | Status |
|---|---|
| `expo-crypto` 58 AES-GCM API: `AESEncryptionKey.generate/import`, `aesEncryptAsync` with `nonce`, `tagLength`, `additionalData`; `aesDecryptAsync`; sealed data exposes IV, ciphertext, tag, combined form | Verified in installed type definitions |
| One-shot (whole-buffer) API: fine for size-capped images, not for large archives | Verified in API shape |
| `expo-file-system` 58 `File.move`/`rename`/`copy`, `File.info({ md5 })`, `Paths.document`; no backup-exclusion API | Verified in installed type definitions |
| 5 MB round trip, AAD tamper rejection, interoperability with standard AES-GCM, timing on devices | Not tested |
| Atomic replace by move with overwrite | Not tested |

### 4.6 Exclusion from OS device backups (O-018, O-039)

| Claim | Android | iOS |
|---|---|---|
| For apps targeting Android 12+, `allowBackup="false"` disables cloud backup but, on some manufacturers' devices, does not disable device-to-device transfer; a missing `<device-transfer>` section means transfer is fully enabled | Docs-verified | n/a |
| The config plugin writes `allowBackup="false"`, `dataExtractionRules` (all domains excluded for cloud backup and device transfer), and `fullBackupContent` | **Config-verified** (prebuild manifest) | n/a |
| Excluded in practice (`bmgr backupnow`, device-to-device transfer) | Not tested | n/a |
| Expo FileSystem has no exclusion API; Apple's `isExcludedFromBackup` works on directories, is "not a mechanism to guarantee" exclusion, and can be reset by some file operations | n/a | Docs-verified |
| O-039 local module sets the flag and survives writes | n/a | Not tested; module not written |

### 4.7 Local notifications (B-012)

| Claim | Android | iOS |
|---|---|---|
| Exact timing on Android 12+ needs `SCHEDULE_EXACT_ALARM`; denied by default on Android 14+ for new installs; `getExactAlarmPermissionsAsync`/`requestExactAlarmPermissionsAsync` exist; Play restricts `USE_EXACT_ALARM` to alarm, timer, and calendar apps | Docs-verified | n/a |
| Default delivery `bestEffort` may be deferred by some manufacturers | Docs-verified | n/a |
| Pending local notification cap of 64 | n/a | Verified in the earlier review (Apple Developer Forums) |
| Scheduling 100 notifications and counting pending ones; permission states | Not tested | Not tested |

### 4.8 Other findings

- The default Expo template manifest includes permissions Memento does not need (`SYSTEM_ALERT_WINDOW`, legacy `READ/WRITE_EXTERNAL_STORAGE`, `VIBRATE`, `USE_FINGERPRINT`, `INTERNET`). Phase 1 must audit and block unneeded permissions (NFR-035) and record any that stay.
- The React Native 0.88 Android build requests NDK 27.1.12297006 and installs it automatically into the shared Android SDK. Expect a large first-build download.
- Unverified risk: Windows native builds may fail with this repository's non-ASCII path (`Masaüstü`); Windows long paths are disabled on this machine. Resolve at the start of Phase 1 without drive mapping: move the repository to an ASCII path, enable long paths, or use EAS Build.

## 5. Risks and limitations

1. **The core security mechanism is unverified on devices.** That covers SQLCipher, keying, recovery, and backup exclusion. Highest risk; Phase 1 gate.
2. **iOS has had no hands-on validation.** It needs macOS or EAS Build, an Apple developer account, and a physical iPhone.
3. **iOS backup exclusion is best effort by Apple's own statement.** O-019 recovery is the real safety net.
4. **KDF dependency** (`react-native-quick-crypto` plus Nitro Modules) is unproven on SDK 58 and the New Architecture, and its docs disagree with its code.
5. **Node harness fidelity:** `sql.js` is not SQLCipher. The on-device suite is required.
6. **Build environment:** a possible non-ASCII path problem on Windows, and an automatic NDK download.

## 6. Recommended implementation choices

- `expo-sqlite` with `useSQLCipher: true`; check `cipher_version` first and fail closed; raw 256-bit key; use only `withTransactionAsync()` on the keyed connection (O-016, O-019).
- Migration runner: numbered `.sql` files, one transaction each, `PRAGMA user_version` set inside the transaction; FK-safe rebuild procedure for any table rebuild (as in the harness).
- Persistence tests: `sql.js` on the current Node version, or `better-sqlite3` if CI pins Node ≥ 22. Keep migration SQL portable; add a small on-device suite (O-017).
- Built-in IDs: `4d454d30-0000-8000-8TTT-…` (O-038).
- Android backup exclusion: the `withNoOsBackup` config plugin plus SecureStore `configureAndroidBackup: false` (SDD §12.4).
- iOS backup exclusion: a local Expo module setting `isExcludedFromBackup` on a single data directory (O-039).
- Attachments: `expo-crypto` AES-256-GCM, random 12-byte nonce, attachment ID as AAD (O-008 recommendation, still Open).
- Backup KDF: Argon2id via `react-native-quick-crypto`, if it passes the Phase 5 gate (O-007, still Open).

## 7. Validation carried forward (G-003)

Each gate must pass before the phase that depends on it is accepted. Evidence is recorded in that phase's report.

| # | Gate | Platforms | Must pass in |
|---|---|---|---|
| G1 | `cipher_version` returns a version; raw key accepted; file header not plaintext; open without key and with wrong key both fail detectably; correct key reopens | Physical Android device and physical iPhone, release-style build | Phase 1, before any build stores real data |
| G2 | Separate-connection behavior: the exclusive-transaction connection is not keyed (or the API is not used); foreign keys enforced in `withTransactionAsync()` | Both | Phase 1 |
| G3 | O-019 states A–E on device, including quarantine with byte-identical files (with a leftover WAL: content intact and openable with the original key, O-051 option c) and the recovery screen | Both | Phase 1 |
| G4 | SecureStore key with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` round-trips without authentication; data stays readable after a biometric enrolment change | Both | Phase 1 |
| G5 | Android backup exclusion in practice: merged release manifest, `bmgr backupnow`, device-to-device transfer | Android | Phase 1 |
| G6 | iOS exclusion module: flag set and persistent after writes; behavior after an encrypted device backup/restore or Quick Start transfer ends in an empty app or the recovery screen | iPhone | Phase 1, before iOS builds store real data |
| G7 | Permission audit of the release manifest and the iOS usage strings | Both | Phase 1 |
| G8 | AES-GCM 5 MB round trip, AAD tamper rejection, interoperability vector checked in Node | Both | Phase 3 (photos) |
| G9 | Notification scheduling counts, exact-alarm permission flow, iOS 64-pending behavior | Both | Phase 4 |
| G10 | Argon2id RFC 9106 vector, 64 MiB timing on a mid-range device, cross-check with an independent implementation; dependency approval | Both | Phase 5 |

The native probe in `experiments/phase-0/native-probe/` already automates G1–G4, G8, G9, and G10. G5–G7 need manual steps. Since 9 Nov 2026 the app's own on-device suite (`src/features/device-checks/`, TEST_PLAN §7) automates G1–G3 and the G4 key round trip against the production code paths; the product owner chose to skip the probe for the Phase 1 run. The G4 biometric-change step stays manual. Running either needs an Android build, which currently fails at the repository path (D-017 finding, O-050).

### 7.1 Android emulator run (9 November 2026)

First pass on an Android Studio emulator (API 36 / Android 16, Google APIs x86_64, software-backed keystore), debug build of `com.aubreyzip.memento` built locally per O-050. Synthetic data only; the app, virtual device, system image, and build copy were removed afterwards. A physical Android device is still required for the gates themselves.

| Gate | Result | Evidence |
|---|---|---|
| G1 | Pass (emulator) | On-device suite: SQLCipher 4.17.0 community; file has no SQLite header and a synthetic marker is not readable in the file or WAL; reads without a key and with a wrong key fail with "file is not a database". Real app: `memento.db` starts with random bytes; neither the file nor the WAL contains `SQLite format` or table names. |
| G2 | Pass (emulator) | Suite: `foreign_keys=1` and WAL on the keyed connection; migrations (`user_version=1`) and seeds; transaction rollback and commit; foreign-key and Inbox constraints enforced. `withExclusiveTransactionAsync()` is not used. |
| G3 | **Partial: finding O-051** | Suite: states A–E and "Start fresh" pass; quarantined bytes identical; quarantined file opens with the original key. Real app: A, B (Dark and Türkçe kept after restart), C (recovery screen in System appearance and language; database, WAL, and SHM quarantined with identical MD5), "Start fresh" (Cancel keeps the screen; confirm opens Home with defaults; quarantined files unchanged), and E pass. State D shows the recovery screen, but with a leftover WAL the main file is changed and the sidecars removed before quarantine (data preserved; O-051). |
| G4 | First pass only | Suite: key stored and read back without authentication. Real app: opens with saved settings after a fingerprint was enrolled and again after it was removed (emulated sensor, software keystore). The final check needs a physical device. |
| G5 | Pass except device transfer | Release merged manifest: `allowBackup="false"`, `dataExtractionRules` and `fullBackupContent` with the Memento rules. Installed package has no `ALLOW_BACKUP` flag; `bmgr backupnow` reports "Backup is not allowed". A device-to-device transfer needs two devices. |
| G6 | Not run | Needs an iPhone and a Mac or EAS. |
| G7 | **Partial: finding O-052** | Release manifest: `INTERNET` (O-049), `USE_BIOMETRIC` and `USE_FINGERPRINT` (from `androidx.biometric`, O-052), and the app's own `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`. `SYSTEM_ALERT_WINDOW` and `ACCESS_LOCAL_NETWORK` appear only in debug builds (React Native debug manifest). iOS usage strings not checked here. |
| G8–G10 | Not run | Deferred to the real-device session by the product owner. |

Other observation: on the startup screens (loading, recovery, error) the status-bar icons follow the default style, which is white on the light background; the style is set only inside the main app.

**Follow-up (9 Nov 2026, not yet re-run on a device).** O-051 option (a) and O-052 were confirmed and implemented: startup snapshots a leftover WAL before the key check and quarantines the snapshot on a mismatch (new on-device check `state-d-wal-preserved`); `USE_BIOMETRIC` and `USE_FINGERPRINT` are blocked (config introspection shows `tools:node="remove"`); the startup screens set the status-bar style to `auto`. G3 and G7 stay **Partial** until the device run confirms them.

**Change (9 Nov 2026, process cuts).** O-051 changed to option (c): the pre-open snapshot was removed, and the on-device check is now `state-d-wal-recoverable`. It checks that the quarantined files open with the original key and keep the WAL-only change, not byte-identity. G3 stays **Partial** until the device run.

## 8. Remaining open decisions

> **Update (8 November 2026, later):** O-009 (Expo SDK 58, Node 24, Android 7.0 / iOS 16.4) and O-034 (language selection) have since been confirmed; see `DECISIONS.md`. The text below is the record at Phase 0 closure.

- **Needed before Phase 1:** O-009 (Expo SDK and minimum OS versions; Phase 0 used SDK 58) and O-034 (language source of truth).
- **Needed later:**
  - Phase 2: O-005, O-006, O-014 (Proposed), O-025, O-027.
  - Phase 3: O-008, O-010, O-011, O-012, O-021–O-024, O-026, O-031.
  - Phase 4: O-030, O-032.
  - Phase 5: O-007, O-013, O-028, O-029, O-033.
  - Before beta or release: O-002–O-004, O-035.
- Full list and status: [`DECISIONS.md`](./DECISIONS.md) §4.

## 9. Verdict

**Phase 0 is concluded, not passed.** The approved approach is technically supported by the evidence gathered; nothing found contradicts O-016, O-018, or O-019. However, no native behavior was validated. Phase 1 may start, by product-owner decision (G-003), on two conditions:

1. the start-of-Phase 1 decisions above are settled;
2. no build stores real data until gates G1–G7 pass on a physical Android device and a physical iPhone.

## 10. Sources

- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) — SQLCipher section, `withExclusiveTransactionAsync()` note
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) — Android Auto Backup, `requireAuthentication`, accessibility classes
- [Expo app config — `android.allowBackup`](https://docs.expo.dev/versions/latest/config/app/)
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) — exact alarms, delivery modes
- [Android: Back up user data with Auto Backup](https://developer.android.com/identity/data/autobackup)
- [Android: Backup best practices](https://developer.android.com/privacy-and-security/risks/backup-best-practices)
- [Apple: Optimizing your app's data for iCloud Backup](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup)
- [Apple: `isExcludedFromBackupKey`](https://developer.apple.com/documentation/foundation/urlresourcekey/isexcludedfrombackupkey)
- [react-native-quick-crypto: Argon2](https://crypto.margelo.com/docs/api/argon2) and [setup](https://crypto.margelo.com/docs/introduction/quick-start)
- npm registry metadata for package versions and `better-sqlite3` engine requirements (8 Nov 2026)
