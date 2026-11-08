# Phase 0 experiments

Throwaway validation code for Phase 0. Not part of the Memento app; never copy it into production source as-is. Results are in [`docs/PHASE_0_REPORT.md`](../../docs/PHASE_0_REPORT.md).

| Folder | What it is | Status |
|---|---|---|
| `node-harness/` | Plain-SQL migration runner and tests on `sql.js` (SQLite compiled to WebAssembly) under Node's built-in test runner. Also contains `verify-device-vectors.mjs`, a cross-check for values the native probe would print. | Runs: `npm ci && npm test` (8/8 pass on Node 20.18.0). |
| `native-probe/` | Expo SDK 58 app that runs automated on-device probes (SQLCipher, key states, SecureStore, AES-GCM, Argon2id/scrypt, file move, notifications, biometrics) and a config plugin (`plugins/withNoOsBackup.js`) for Android backup exclusion. | Type-checks and prebuilds; **never built, installed, or run** (Phase 0 was stopped). |

Rules (root `CLAUDE.md`): experiment files stay under `experiments/`; generated folders (`node_modules/`, `android/`, `ios/`) are git-ignored; no mapped drives or other system-level workarounds.

To finish the native probe later (Phase 1 gates, `PHASE_0_REPORT.md` §7): `npm ci`, `npx expo prebuild`, then a release build on a physical device. The probe uses the identifier `com.aubreyzip.memento.p0probe`, never the real app identifier. It prints one `P0 {json}` line per probe to the JS log. Save those lines as JSONL and run `node ../node-harness/verify-device-vectors.mjs <file>`.

Windows note (unverified risk): native Android toolchains (CMake/NDK) on Windows are commonly reported to fail with non-ASCII project paths (this repository's path includes `Masaüstü`) or paths over 260 characters, and Windows long paths are disabled on this machine. Phase 0 sidestepped this with a mapped drive, which is no longer allowed. Check it at the start of Phase 1. The options are enabling long paths, moving the repository to an ASCII-only path, or EAS Build.
