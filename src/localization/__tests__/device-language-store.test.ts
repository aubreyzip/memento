import { createDeviceLanguageStore } from '../device-language-store';

function fakeAppState() {
  const handlers = new Set<(state: string) => void>();
  return {
    addEventListener: jest.fn((_type: 'change', handler: (state: string) => void) => {
      handlers.add(handler);
      return { remove: () => handlers.delete(handler) };
    }),
    emit: (state: string) => handlers.forEach((handler) => handler(state)),
    get listenerCount() {
      return handlers.size;
    },
  };
}

describe('device language store (O-034 foreground recheck)', () => {
  it('reads the language at creation', () => {
    const store = createDeviceLanguageStore(() => 'tr', fakeAppState());
    expect(store.getSnapshot()).toBe('tr');
  });

  it('re-reads on foreground and notifies every subscriber', () => {
    let device: string | null = 'en';
    const appState = fakeAppState();
    const store = createDeviceLanguageStore(() => device, appState);
    const first = jest.fn();
    const second = jest.fn();
    store.subscribe(first);
    store.subscribe(second);

    device = 'tr';
    appState.emit('active');

    expect(store.getSnapshot()).toBe('tr');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('ignores background/inactive transitions and unchanged languages', () => {
    let device: string | null = 'en';
    const appState = fakeAppState();
    const store = createDeviceLanguageStore(() => device, appState);
    const listener = jest.fn();
    store.subscribe(listener);

    device = 'tr';
    appState.emit('background');
    appState.emit('inactive');
    expect(store.getSnapshot()).toBe('en');

    device = 'en';
    appState.emit('active');
    expect(listener).not.toHaveBeenCalled();
  });

  it('shares one AppState subscription and removes it after the last unsubscribe', () => {
    const appState = fakeAppState();
    const store = createDeviceLanguageStore(() => 'en', appState);

    const unsubscribeA = store.subscribe(jest.fn());
    const unsubscribeB = store.subscribe(jest.fn());
    expect(appState.addEventListener).toHaveBeenCalledTimes(1);

    unsubscribeA();
    expect(appState.listenerCount).toBe(1);
    unsubscribeB();
    expect(appState.listenerCount).toBe(0);

    store.subscribe(jest.fn());
    expect(appState.addEventListener).toHaveBeenCalledTimes(2);
  });
});
