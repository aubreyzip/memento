type AppStateSource = {
  addEventListener: (type: 'change', listener: (state: string) => void) => { remove: () => void };
};

/**
 * The device's primary language as an external store for `useSyncExternalStore`.
 * Android can change the language without restarting the app, so the value is re-read every time
 * the app returns to the foreground (O-034; Expo Localization docs). One AppState subscription is
 * shared by all subscribers and is removed when the last one unsubscribes.
 */
export function createDeviceLanguageStore(
  readLanguageCode: () => string | null,
  appState: AppStateSource,
) {
  let current = readLanguageCode();
  const listeners = new Set<() => void>();
  let subscription: { remove: () => void } | null = null;

  return {
    getSnapshot: (): string | null => current,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      subscription ??= appState.addEventListener('change', (state) => {
        if (state !== 'active') return;
        const next = readLanguageCode();
        if (next !== current) {
          current = next;
          listeners.forEach((notify) => notify());
        }
      });
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          subscription?.remove();
          subscription = null;
        }
      };
    },
  };
}
