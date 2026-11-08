import * as SecureStore from 'expo-secure-store';

import type { DatabaseKeyStore } from '@/database/bootstrap/ports';

const KEY_NAME = 'memento.database-key.v1';

/**
 * O-019: this-device-only, available after first unlock, and never `requireAuthentication`
 * (biometric changes would make the key, and therefore all data, unreadable).
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  requireAuthentication: false,
};

export const secureStoreKeyStore: DatabaseKeyStore = {
  get: () => SecureStore.getItemAsync(KEY_NAME, OPTIONS),
  set: (key) => SecureStore.setItemAsync(KEY_NAME, key, OPTIONS),
};
