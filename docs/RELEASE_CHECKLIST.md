# Release Checklist — Memento

**Version:** 0.1  
**Date:** 8 November 2026  
**Status:** Planning checklist; re-verify platform rules at submission time.

## 1. Product and release readiness

- [ ] V1 scope matches `PRD.md` and exclusions are respected.
- [ ] All Must requirements in `SRS.md` are implemented or formally deferred.
- [ ] No blocker/high-severity data-loss, privacy, or security defects remain.
- [ ] English and Turkish UI have been reviewed; the Turkish resource is no longer marked draft and its known-missing list is empty (Turkish tagline: O-045).
- [ ] Light, Dark, and System appearance have been reviewed.
- [ ] Accessibility review is complete.
- [ ] Onboarding accurately explains local-first behavior and backup responsibility.
- [ ] App name, public store title, icon, and logo are finalized.
- [ ] Store name and trademark availability have been checked.
- [x] Android application ID and iOS bundle identifier are selected: `com.aubreyzip.memento` (O-001, 8 Nov 2026).
- [ ] The identifier is registered in the Apple Developer account and claimed by the first Google Play upload; release builds use it and no spike build does.
- [ ] Versioning and release notes are prepared.

## 2. Security and data integrity

- [ ] SQLCipher is enabled in Android release build.
- [ ] SQLCipher is enabled in iOS release build.
- [ ] `PRAGMA cipher_version` is verified at runtime on both platforms.
- [ ] Database key generation/storage/retrieval is tested.
- [ ] Database cannot be opened without the required key.
- [ ] All connection/transaction paths apply the key correctly.
- [ ] Attachment storage protection is verified independently of SQLCipher.
- [ ] Backup archive uses a reviewed, vetted authenticated encryption implementation.
- [ ] Backup passphrases/keys are not logged or stored in plaintext.
- [ ] Backup corruption/wrong-password/unsupported-version tests pass.
- [ ] Interrupted restore leaves existing data recoverable.
- [ ] Full backup and restore preserve all records and media.
- [ ] Collection export/import behaves as documented.
- [ ] Permanent deletion removes local database data and associated files/notifications.
- [ ] Logs and diagnostics do not contain user content or secrets.
- [ ] OS backup and device-transfer exclusion is present in the release binaries and verified on both platforms (O-018, SDD §12.4).
- [ ] Unreadable-database recovery (quarantine and recovery screen) is verified for the missing-key and wrong-key states (O-019).

## 3. Functional and platform QA

- [ ] Fresh install tested on Android.
- [ ] Fresh install tested on iOS.
- [ ] Release binaries declare Android minSdk 24 and iOS deployment target 16.4, and the app was tested on those minimum versions (O-009).
- [ ] Upgrade/migration tested from prior supported schema.
- [ ] Core functionality tested in airplane mode.
- [ ] Quick Capture Inbox tested.
- [ ] Collections, custom types, categories, templates, and entries tested.
- [ ] Photos, links, dates, price, priority, location, and tags tested.
- [ ] Search and filters tested with representative data.
- [ ] Local notifications tested with permission granted and denied.
- [ ] Biometrics/app lock tested on supported physical devices.
- [ ] Backup/restore tested through real OS file/share interactions.
- [ ] App lifecycle, low storage, interrupted operation, and app restart tested.
- [ ] Text scaling, screen readers, and contrast tested.
- [ ] No unnecessary permission prompts are present.

## 4. Privacy policy and store disclosures

- [ ] Public privacy policy URL is available and linked from the app/store listing.
- [ ] Privacy policy describes actual local storage, encryption, attachments, backups, notifications, and any device/OS behavior accurately.
- [ ] Google Play Data safety form reflects the actual released binary and SDKs.
- [ ] Apple App Privacy details reflect the actual released binary and SDKs.
- [ ] Any third-party SDKs/dependencies have been checked for data collection and privacy impact.
- [ ] App permissions are minimized and explained.
- [ ] Data deletion and backup behavior are explained.
- [ ] Support contact is active.

Do not claim “no data collected” or “fully encrypted” without checking the actual build, SDK behavior, platform backup behavior, and disclosures.

## 5. Google Play preparation

- [ ] Google Play Console developer account is active.
- [ ] Store listing name, short description, full description, icon, screenshots, and graphics are ready.
- [ ] App category, content rating, target audience, and declarations are complete.
- [ ] Android App Bundle is signed and tested.
- [ ] Privacy policy URL is entered.
- [ ] Data safety declaration is complete and accurate.
- [ ] App access instructions are supplied if review requires them; do not invent login credentials for an app with no account.
- [ ] Internal testing completed.
- [ ] Closed testing completed where required.
- [ ] Production access requirements verified for this developer account.
- [ ] Store review notes explain local-only operation and any non-obvious behavior.

**Important account-specific note:** Google Play currently states that personal developer accounts created after 13 November 2023 must run a closed test with at least 12 testers continuously opted in for at least 14 days before applying for production access. Verify the current rule and whether it applies to the actual account before planning launch. Official reference: [Google Play — App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465).

## 6. Apple App Store preparation

- [ ] Apple Developer Program membership is active.
- [ ] App Store Connect app record is configured.
- [ ] App name, subtitle, description, keywords, category, age rating, and screenshots are ready.
- [ ] App icon and required metadata are ready.
- [ ] Privacy policy URL is entered.
- [ ] App Privacy details are complete and accurate.
- [ ] Export compliance/encryption questions are answered accurately; check current Apple guidance for SQLCipher and backup encryption.
- [ ] iOS archive is signed and validated.
- [ ] TestFlight beta has been tested.
- [ ] App Review notes describe local storage, no account requirement, and relevant access controls.
- [ ] Review device/account instructions are provided only if genuinely needed.

## 7. Store assets and content

- [ ] Final app icon in all required sizes.
- [ ] Android screenshots for supported listing requirements.
- [ ] iPhone screenshots for supported display sizes.
- [ ] Optional preview video, if useful.
- [ ] English store listing.
- [ ] Turkish store listing.
- [ ] Support URL/contact.
- [ ] Privacy policy URL.
- [ ] Release notes in supported languages.
- [ ] Screenshots use synthetic/sample information only.

## 8. Build and delivery

- [ ] Expo SDK and native dependencies are on supported versions.
- [ ] `npx expo-doctor` or the current equivalent has been run and issues reviewed.
- [ ] Typecheck, lint, tests, and production build pass.
- [ ] Android and iOS build profiles are reviewed.
- [ ] App identifiers, version numbers, icons, splash screen, and permissions are correct.
- [ ] Production database encryption configuration matches the verified preview build.
- [ ] EAS credentials/signing are secured.
- [ ] Release artifacts are archived securely.
- [ ] Rollback/hotfix process is documented.

## 9. Post-release

- [ ] Monitor store review outcomes and user feedback.
- [ ] Triage bugs, especially data-loss, import/export, and security issues.
- [ ] Keep a tested backup before schema-changing updates where feasible.
- [ ] Maintain migration compatibility with released data.
- [ ] Review privacy and platform policy changes before each release.
- [ ] Do not introduce cloud sync, analytics, or new data collection without a new product/privacy decision.
