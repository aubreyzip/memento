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

/** The name parameter exists for the on-device checks, which use their own entry (O-017). */
export function createSecureStoreKeyStore(name: string): DatabaseKeyStore & {
  remove(): Promise<void>;
} {
  return {
    get: () => SecureStore.getItemAsync(name, OPTIONS),
    set: (key) => SecureStore.setItemAsync(name, key, OPTIONS),
    remove: () => SecureStore.deleteItemAsync(name, OPTIONS),
  };
}

export const secureStoreKeyStore: DatabaseKeyStore = createSecureStoreKeyStore(KEY_NAME);
