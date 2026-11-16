import { getRandomBytes } from 'expo-crypto';

import { createMediaCipher } from '@/features/photos/media-cipher';
import type { MediaPorts } from '@/features/photos/ports';
import { createMediaKeyProvider, MEDIA_KEY_NAME } from '@/services/security/media-key';
import { createSecureStoreKeyStore } from '@/services/security/secure-store-key-store';

import { expoAesGcm } from './expo-aes-gcm';
import { expoImageIntake } from './expo-image-intake';
import { expoMediaStore } from './expo-media-store';

/** Device wiring for photos: native AES-GCM with the SecureStore media key, files, picker. */
export function createDeviceMediaPorts(): MediaPorts {
  const key = createMediaKeyProvider(createSecureStoreKeyStore(MEDIA_KEY_NAME), getRandomBytes);
  return {
    cipher: createMediaCipher(expoAesGcm, key),
    store: expoMediaStore,
    intake: expoImageIntake,
  };
}
