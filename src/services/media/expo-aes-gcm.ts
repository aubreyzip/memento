import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';

import { IV_LENGTH, TAG_LENGTH, type AesGcm } from '@/features/photos/media-cipher';

/**
 * AES-256-GCM from `expo-crypto` (O-008), the platform's native implementation. Verified on a
 * device by gate G8: round trip, tamper rejection, and a known-answer vector from Node.
 */
export const expoAesGcm: AesGcm = {
  async encrypt(key, plaintext, aad, iv) {
    const sealed = await aesEncryptAsync(plaintext, await AESEncryptionKey.import(key), {
      nonce: iv ? { bytes: iv } : { length: IV_LENGTH },
      tagLength: TAG_LENGTH,
      additionalData: aad,
    });
    return {
      iv: await sealed.iv(),
      sealed: await sealed.ciphertext({ includeTag: true }),
    };
  },
  async decrypt(key, iv, sealed, aad) {
    return aesDecryptAsync(
      AESSealedData.fromParts(iv, sealed, TAG_LENGTH),
      await AESEncryptionKey.import(key),
      { additionalData: aad },
    );
  },
};
