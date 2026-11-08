// Memento Phase 0 native probe. NOT production code: a throwaway harness that runs
// automated checks on a real native build and prints one JSON line per probe to the
// JS log (prefix "P0"). It uses only synthetic data and never prints generated keys.
import { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { File, Directory, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import { argon2, scrypt, Buffer } from 'react-native-quick-crypto';

type R = { id: string; ok: boolean; detail: unknown };
const results: R[] = [];
const DB = 'p0-probe.db';
const KEY_ID = 'p0_db_key';
const KEY_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const fill = (n: number, v: number) => new Uint8Array(n).fill(v);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function record(id: string, ok: boolean, detail: unknown) {
  const r = { id, ok, detail };
  results.push(r);
  console.log('P0 ' + JSON.stringify(r));
}

async function probe(id: string, fn: () => Promise<{ ok: boolean; detail: unknown }>) {
  try {
    const { ok, detail } = await fn();
    record(id, ok, detail);
  } catch (e) {
    record(id, false, { threw: errMsg(e) });
  }
}

const newRawKey = () => hex(Crypto.getRandomBytes(32));
async function openKeyed(keyHex: string | null) {
  const db = await SQLite.openDatabaseAsync(DB);
  if (keyHex) await db.execAsync(`PRAGMA key = "x'${keyHex}'"`); // raw 256-bit key: skips SQLCipher's passphrase KDF
  return db;
}
const sqliteDir = () => new Directory(Paths.document, 'SQLite');
const dbFile = () => new File(sqliteDir(), DB);

// Minimal O-019 bootstrap state machine (spike only).
async function bootstrap(): Promise<'opened' | 'created' | 'quarantined'> {
  const key = await SecureStore.getItemAsync(KEY_ID, KEY_OPTS);
  if (!dbFile().exists) {
    const k = key ?? newRawKey();
    if (!key) await SecureStore.setItemAsync(KEY_ID, k, KEY_OPTS);
    const db = await openKeyed(k);
    await db.execAsync('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, v TEXT)');
    await db.closeAsync();
    return 'created';
  }
  if (key) {
    const db = await openKeyed(key);
    try {
      await db.getFirstAsync('SELECT count(*) AS n FROM sqlite_master');
      await db.closeAsync();
      return 'opened';
    } catch {
      await db.closeAsync();
    }
  }
  // Key missing or wrong: never delete. Move the file and any sidecars aside.
  const stamp = Date.now();
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const f = new File(sqliteDir(), DB + suffix);
    if (f.exists) f.move(new File(sqliteDir(), `${DB}${suffix}.quarantine-${stamp}`));
  }
  return 'quarantined';
}

async function runAll() {
  try { await SQLite.deleteDatabaseAsync(DB); } catch {}
  await SecureStore.deleteItemAsync(KEY_ID, KEY_OPTS);
  for (const f of sqliteDir().exists ? sqliteDir().list() : []) if (f.name.includes('.quarantine-')) f.delete();

  await probe('env', async () => ({
    ok: true,
    detail: { documentDir: Paths.document.uri, sqliteDefaultDir: SQLite.defaultDatabaseDirectory },
  }));

  const key = newRawKey();
  await probe('sqlcipher.cipher_version', async () => {
    const db = await SQLite.openDatabaseAsync(DB);
    const v = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    const s = await db.getFirstAsync<{ v: string }>('SELECT sqlite_version() AS v');
    await db.closeAsync();
    return { ok: v != null, detail: { cipher_version: v?.cipher_version ?? null, sqlite_version: s?.v } };
  });
  try { await SQLite.deleteDatabaseAsync(DB); } catch {}

  await probe('sqlcipher.raw_key_create', async () => {
    const db = await openKeyed(key);
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await db.execAsync(`CREATE TABLE parent (id TEXT PRIMARY KEY);
      CREATE TABLE child (id TEXT PRIMARY KEY, parent_id TEXT NOT NULL REFERENCES parent(id) ON DELETE CASCADE);
      INSERT INTO parent VALUES ('p1'); INSERT INTO child VALUES ('c1','p1');`);
    const provider = await db.getFirstAsync<Record<string, string>>('PRAGMA cipher_provider');
    const n = await db.getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM child');
    await db.closeAsync();
    const sidecars = ['-wal', '-shm'].filter((s) => new File(sqliteDir(), DB + s).exists);
    return { ok: n?.n === 1, detail: { cipher_provider: provider, childRows: n?.n, sidecarsAfterClose: sidecars } };
  });

  await probe('sqlcipher.file_header_not_plaintext', async () => {
    const bytes = await dbFile().bytes();
    const header = String.fromCharCode(...bytes.slice(0, 15));
    return { ok: header !== 'SQLite format 3', detail: { first16hex: hex(bytes.slice(0, 16)), size: bytes.length } };
  });

  for (const [id, k] of [['sqlcipher.open_without_key_fails', null], ['sqlcipher.wrong_key_fails', newRawKey()]] as const) {
    await probe(id, async () => {
      const db = await openKeyed(k);
      try {
        await db.getFirstAsync('SELECT count(*) AS n FROM sqlite_master');
        await db.closeAsync();
        return { ok: false, detail: 'read succeeded' };
      } catch (e) {
        await db.closeAsync();
        return { ok: true, detail: { error: errMsg(e) } };
      }
    });
  }

  await probe('sqlcipher.correct_key_reopens', async () => {
    const db = await openKeyed(key);
    const n = await db.getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM child');
    await db.closeAsync();
    return { ok: n?.n === 1, detail: { childRows: n?.n } };
  });

  await probe('sqlite.withTransactionAsync_fk_enforced', async () => {
    const db = await openKeyed(key);
    await db.execAsync('PRAGMA foreign_keys = ON');
    let fkRejected = false;
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync("INSERT INTO child VALUES ('c2','missing-parent')");
      });
    } catch { fkRejected = true; }
    await db.closeAsync();
    return { ok: fkRejected, detail: { fkRejected } };
  });

  await probe('sqlite.withExclusiveTransactionAsync_new_connection', async () => {
    const db = await openKeyed(key);
    let outcome: unknown;
    try {
      await db.withExclusiveTransactionAsync(async (txn) => {
        const n = await txn.getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM child');
        const fk = await txn.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
        outcome = { readOk: true, childRows: n?.n, foreign_keys: fk?.foreign_keys };
      });
    } catch (e) {
      outcome = { readOk: false, error: errMsg(e) };
    }
    await db.closeAsync();
    return { ok: true, detail: outcome }; // observation only; interpreted in the report
  });

  await probe('o019.bootstrap_states', async () => {
    try { await SQLite.deleteDatabaseAsync(DB); } catch {}
    await SecureStore.deleteItemAsync(KEY_ID, KEY_OPTS);
    const s1 = await bootstrap(); // no key, no db -> created
    const s2 = await bootstrap(); // key + db -> opened
    const before = dbFile().info({ md5: true }).md5;
    await SecureStore.deleteItemAsync(KEY_ID, KEY_OPTS);
    const s3 = await bootstrap(); // db, no key -> quarantined
    const s4 = await bootstrap(); // new key, no db -> created
    await SecureStore.setItemAsync(KEY_ID, newRawKey(), KEY_OPTS);
    const s5 = await bootstrap(); // db + wrong key -> quarantined
    const names = sqliteDir().list().map((x) => x.name).filter((n) => n.startsWith(DB));
    const q = names.filter((n) => /^p0-probe\.db\.quarantine-/.test(n)).sort();
    const firstQMd5 = q[0] ? new File(sqliteDir(), q[0]).info({ md5: true }).md5 : null;
    const ok = s1 === 'created' && s2 === 'opened' && s3 === 'quarantined' && s4 === 'created' && s5 === 'quarantined' && q.length === 2;
    return { ok, detail: { s1, s2, s3, s4, s5, files: names, quarantinedBytesUnchanged: before != null && before === firstQMd5 } };
  });

  await probe('securestore.key_roundtrip_no_auth', async () => {
    const k = newRawKey();
    await SecureStore.setItemAsync('p0_tmp', k, KEY_OPTS);
    const back = await SecureStore.getItemAsync('p0_tmp', KEY_OPTS);
    await SecureStore.deleteItemAsync('p0_tmp', KEY_OPTS);
    return { ok: back === k, detail: { lengthHexChars: back?.length, canUseBiometricAuthentication: SecureStore.canUseBiometricAuthentication() } };
  });

  await probe('crypto.aes_gcm_5mb_roundtrip_and_tamper', async () => {
    const aesKey = await Crypto.AESEncryptionKey.generate(Crypto.AESKeySize.AES256);
    const plain = Crypto.getRandomBytes(5 * 1024 * 1024);
    const aad = new TextEncoder().encode('attachment:00000000-0000-4000-8000-000000000001');
    const t0 = Date.now();
    const sealed = await Crypto.aesEncryptAsync(plain, aesKey, { additionalData: aad });
    const t1 = Date.now();
    const back = await Crypto.aesDecryptAsync(sealed, aesKey, { additionalData: aad });
    const t2 = Date.now();
    let same = back.length === plain.length;
    for (let i = 0; same && i < plain.length; i++) same = back[i] === plain[i];
    let tamperRejected = false;
    try {
      await Crypto.aesDecryptAsync(sealed, aesKey, { additionalData: new TextEncoder().encode('attachment:other') });
    } catch { tamperRejected = true; }
    return { ok: same && tamperRejected, detail: { encryptMs: t1 - t0, decryptMs: t2 - t1, ivSize: sealed.ivSize, tagSize: sealed.tagSize, tamperRejected } };
  });

  await probe('crypto.aes_gcm_interop_vector', async () => {
    // Fixed TEST vector (not a secret): key 00..1f, iv 00..0b, aad "memento-p0", plaintext "hello memento".
    const k = await Crypto.AESEncryptionKey.import(Uint8Array.from({ length: 32 }, (_, i) => i));
    const sealed = await Crypto.aesEncryptAsync(new TextEncoder().encode('hello memento'), k, {
      nonce: { bytes: Uint8Array.from({ length: 12 }, (_, i) => i) },
      additionalData: new TextEncoder().encode('memento-p0'),
    });
    return { ok: true, detail: { combinedHex: hex(await sealed.combined()) } };
  });

  await probe('kdf.argon2id_rfc9106_vector', async () => {
    const tag = await new Promise<Buffer>((res, rej) =>
      argon2('argon2id', {
        message: Buffer.from(fill(32, 1)), nonce: Buffer.from(fill(16, 2)),
        secret: Buffer.from(fill(8, 3)), associatedData: Buffer.from(fill(12, 4)),
        parallelism: 4, tagLength: 32, memory: 32, passes: 3,
      }, (e, r) => (e ? rej(e) : res(r))));
    const expected = '0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659';
    return { ok: tag.toString('hex') === expected, detail: { got: tag.toString('hex'), expected } };
  });

  await probe('kdf.argon2id_64MiB_t3_p1_timing', async () => {
    const t0 = Date.now();
    const tag = await new Promise<Buffer>((res, rej) =>
      argon2('argon2id', {
        message: Buffer.from('correct horse battery staple'), nonce: Buffer.from(fill(16, 7)),
        parallelism: 1, tagLength: 32, memory: 65536, passes: 3,
      }, (e, r) => (e ? rej(e) : res(r))));
    return { ok: tag.length === 32, detail: { ms: Date.now() - t0, tagHex: tag.toString('hex') } };
  });

  await probe('kdf.scrypt_N32768_timing', async () => {
    const t0 = Date.now();
    const out = await new Promise<Buffer>((res, rej) =>
      scrypt('correct horse battery staple', Buffer.from(fill(16, 7)), 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
        (e: Error | null, r?: Buffer) => (e ? rej(e) : res(r as Buffer))));
    return { ok: out.length === 32, detail: { ms: Date.now() - t0, keyHex: out.toString('hex') } };
  });

  await probe('fs.atomic_replace_by_move', async () => {
    const target = new File(Paths.document, 'p0-target.bin');
    if (target.exists) target.delete();
    target.write('old');
    const tmp = new File(Paths.document, 'p0-target.bin.tmp');
    if (tmp.exists) tmp.delete();
    tmp.write('new');
    tmp.move(new File(Paths.document, 'p0-target.bin'), { overwrite: true });
    const txt = await new File(Paths.document, 'p0-target.bin').text();
    new File(Paths.document, 'p0-target.bin').delete();
    return { ok: txt === 'new', detail: { contentAfterMove: txt } };
  });

  await probe('notifications.schedule_and_count', async () => {
    const perm = await Notifications.getPermissionsAsync();
    let exact: unknown = null;
    try { exact = await Notifications.getExactAlarmPermissionsAsync(); } catch (e) { exact = { threw: errMsg(e) }; }
    await Notifications.cancelAllScheduledNotificationsAsync();
    const base = Date.now() + 60 * 60 * 1000;
    let scheduled = 0; let firstError: string | null = null;
    for (let i = 0; i < 100; i++) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Reminder', body: 'Synthetic probe' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: base + i * 60000 },
        });
        scheduled++;
      } catch (e) { firstError ??= errMsg(e); }
    }
    const pending = (await Notifications.getAllScheduledNotificationsAsync()).length;
    await Notifications.cancelAllScheduledNotificationsAsync();
    return { ok: true, detail: { permission: perm.status, exactAlarm: exact, scheduled, pending, firstError } };
  });

  await probe('localauth.capabilities', async () => ({
    ok: true,
    detail: {
      hasHardware: await LocalAuthentication.hasHardwareAsync(),
      isEnrolled: await LocalAuthentication.isEnrolledAsync(),
      types: await LocalAuthentication.supportedAuthenticationTypesAsync(),
      enrolledLevel: await LocalAuthentication.getEnrolledLevelAsync(),
    },
  }));

  console.log('P0 DONE ' + JSON.stringify({ total: results.length, failed: results.filter((r) => !r.ok).map((r) => r.id) }));
}

export default function App() {
  const [lines, setLines] = useState<string[]>(['Running Phase 0 probes…']);
  useEffect(() => {
    runAll().finally(() => setLines(results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${r.id}`)));
  }, []);
  return (
    <ScrollView contentContainerStyle={styles.c}>
      {lines.map((l) => <Text key={l} style={styles.t}>{l}</Text>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ c: { padding: 24, paddingTop: 64 }, t: { fontFamily: 'monospace', fontSize: 12 } });
