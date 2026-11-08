// Cross-checks values printed by the native probe against independent Node implementations.
// Usage: node verify-device-vectors.mjs <p0-results.jsonl>
import { readFileSync } from 'node:fs';
import { createDecipheriv, scryptSync } from 'node:crypto';
import { argon2id } from 'hash-wasm';

const rows = Object.fromEntries(readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => {
  const r = JSON.parse(l); return [r.id, r];
}));
const out = {};

// 1. AES-256-GCM interop: expo-crypto "combined" = iv || ciphertext || tag (checked here).
{
  const buf = Buffer.from(rows['crypto.aes_gcm_interop_vector'].detail.combinedHex, 'hex');
  const iv = buf.subarray(0, 12), tag = buf.subarray(buf.length - 16), ct = buf.subarray(12, buf.length - 16);
  const d = createDecipheriv('aes-256-gcm', Buffer.from([...Array(32).keys()]), iv);
  d.setAAD(Buffer.from('memento-p0')); d.setAuthTag(tag);
  const pt = Buffer.concat([d.update(ct), d.final()]).toString();
  out.aesGcmInterop = { ivMatchesFixed: iv.equals(Buffer.from([...Array(12).keys()])), plaintext: pt, ok: pt === 'hello memento' };
}
// 2. Argon2id 64 MiB / t=3 / p=1 vs hash-wasm.
{
  const ref = await argon2id({ password: 'correct horse battery staple', salt: new Uint8Array(16).fill(7),
    parallelism: 1, iterations: 3, memorySize: 65536, hashLength: 32, outputType: 'hex' });
  const dev = rows['kdf.argon2id_64MiB_t3_p1_timing'].detail.tagHex;
  out.argon2id = { device: dev, node: ref, ok: dev === ref };
}
// 3. scrypt N=32768 r=8 p=1 vs Node crypto.
{
  const ref = scryptSync('correct horse battery staple', Buffer.alloc(16, 7), 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
  const dev = rows['kdf.scrypt_N32768_timing'].detail.keyHex;
  out.scrypt = { device: dev, node: ref, ok: dev === ref };
}
console.log(JSON.stringify(out, null, 2));
