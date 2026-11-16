import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { IV_LENGTH, TAG_LENGTH, type AesGcm } from '../media-cipher';

/**
 * AES-256-GCM from Node's OpenSSL, for tests and for computing the known-answer vector the
 * on-device check compares `expo-crypto` against (G8 interoperability).
 */
export const nodeAesGcm: AesGcm = {
  async encrypt(key, plaintext, aad, iv = new Uint8Array(randomBytes(IV_LENGTH))) {
    const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH });
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return { iv, sealed: new Uint8Array(Buffer.concat([ciphertext, cipher.getAuthTag()])) };
  },
  async decrypt(key, iv, sealed, aad) {
    const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAAD(aad);
    decipher.setAuthTag(sealed.subarray(sealed.length - TAG_LENGTH));
    const body = sealed.subarray(0, sealed.length - TAG_LENGTH);
    return new Uint8Array(Buffer.concat([decipher.update(body), decipher.final()]));
  },
};
