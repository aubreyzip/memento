import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

// Device primary language: English.
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// The real layout runs the encrypted startup; tests use the fake device storage instead.
jest.mock('../../database/bootstrap/start-database', () => {
  const { FakeEncryptedStorage } = jest.requireActual(
    '../../database/testing/fake-encrypted-storage',
  );
  const { openEncryptedDatabase } = jest.requireActual(
    '../../database/bootstrap/open-encrypted-database',
  );
  return { startDatabase: () => openEncryptedDatabase(new FakeEncryptedStorage().dependencies()) };
});

/** Renders the real route tree in src/app. */
async function renderApp(initialUrl = '/') {
  const result = await renderRouter('./src/app', { initialUrl });
  // Wait for the database startup and settings load before the app shell appears.
  await screen.findByLabelText('Home');
  return result;
}

const TAB_LABELS = ['Home', 'Collections', 'Search', 'Settings'];

describe('navigation shell (B-008)', () => {
  it('opens on Home with the four primary areas', async () => {
    await renderApp();

    expect(screen).toHavePathname('/');
    for (const label of TAB_LABELS) {
      expect(screen.getByLabelText(label)).toBeOnTheScreen();
    }
    expect(screen.getByText('Remember the little things.')).toBeOnTheScreen();
  });

  it.each([
    ['Collections', '/collections'],
    ['Search', '/search'],
    ['Settings', '/settings'],
    ['Home', '/'],
  ])('the %s tab navigates to %s', async (label, path) => {
    await renderApp(label === 'Home' ? '/settings' : '/');

    await fireEvent.press(screen.getByLabelText(label));

    expect(screen).toHavePathname(path);
    expect(screen.getByLabelText(label)).toBeSelected();
  });

  it('Settings contains the appearance and language settings', async () => {
    await renderApp('/settings');

    expect(screen.getByLabelText('Appearance')).toBeOnTheScreen();
    expect(screen.getByLabelText('Language')).toBeOnTheScreen();
  });

  it.each(['/', '/collections', '/search', '/settings'])(
    'Quick Add on %s opens the capture modal, and Close returns',
    async (path) => {
      await renderApp(path);

      await fireEvent.press(screen.getByRole('button', { name: 'Quick Add' }));
      expect(screen).toHavePathname('/capture');
      // The native stack renders the modal title natively, so it is not text in tests.
      expect(screen.getByRole('button', { name: 'Close' })).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
      expect(screen).toHavePathname(path);
    },
  );

  it('switching to Türkçe relabels the navigation immediately (O-034)', async () => {
    await renderApp('/settings');

    await fireEvent.press(screen.getByRole('radio', { name: 'Türkçe' }));

    for (const label of ['Ana Sayfa', 'Koleksiyonlar', 'Ara', 'Ayarlar']) {
      expect(screen.getByLabelText(label)).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'Hızlı Ekle' })).toBeOnTheScreen();
  });
});
