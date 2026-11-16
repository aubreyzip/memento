import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// The real layout runs the encrypted startup; tests use the fake device storage instead.
jest.mock('../../../database/bootstrap/start-database', () => {
  const { FakeEncryptedStorage } = jest.requireActual(
    '../../../database/testing/fake-encrypted-storage',
  );
  const { openEncryptedDatabase } = jest.requireActual(
    '../../../database/bootstrap/open-encrypted-database',
  );
  return { startDatabase: () => openEncryptedDatabase(new FakeEncryptedStorage().dependencies()) };
});

jest.mock('../../../services/ids/random-uuid', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));

const radio = (name: string) => screen.getByRole('radio', { name });

async function renderApp(initialUrl = '/') {
  await renderRouter('./src/app', { initialUrl });
  await screen.findByLabelText('Home');
}

/** Opens Quick Capture, types a title, and saves with the current destination. */
async function capture(title: string, choose?: () => Promise<void>) {
  await fireEvent.press(screen.getByRole('button', { name: 'Quick Add' }));
  await fireEvent.changeText(await screen.findByLabelText('Title'), title);
  await choose?.();
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
}

/** Creates a collection from the Collections tab and returns to the list. */
async function createCollection(name: string) {
  await fireEvent.press(screen.getByLabelText('Collections'));
  await fireEvent.press(await screen.findByRole('button', { name: 'New collection' }));
  await fireEvent.changeText(await screen.findByLabelText('Name'), name);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await screen.findByRole('header', { name });
  await act(() => router.back());
}

describe('Quick Capture and the Inbox (UC-05, FR-030 to FR-035)', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('captures to the Inbox, confirms, and lists the entry there', async () => {
    await renderApp();

    await capture('Synthetic thought');

    expect(await screen.findByText('Saved to the Inbox.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen).toHavePathname('/');

    await fireEvent.press(await screen.findByRole('button', { name: 'Inbox (1)' }));
    expect(await screen.findByRole('button', { name: 'Synthetic thought' })).toBeOnTheScreen();
  });

  it('captures another entry from the confirmation', async () => {
    await renderApp();
    await capture('First thought');
    await fireEvent.press(await screen.findByRole('button', { name: 'Capture another' }));

    expect(screen.getByLabelText('Title')).toHaveDisplayValue('');
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Second thought');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved to the Inbox.')).toBeOnTheScreen();
  });

  it('asks for a title', async () => {
    await renderApp();
    await capture('   ');
    expect(await screen.findByText('Enter a title.')).toBeOnTheScreen();
  });

  it('can capture straight into a collection and category', async () => {
    await renderApp();
    await createCollection('Synthetic Home');

    await capture('Synthetic leak', async () => {
      await fireEvent.press(radio('Synthetic Home'));
      await fireEvent.press(radio('Tasks & Repairs'));
    });

    expect(await screen.findByText('Saved to Synthetic Home.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByRole('button', { name: 'Inbox, Entries: 0' })).toBeOnTheScreen();
  });

  it('assigns an Inbox entry, then moves it back (FR-032, FR-033, O-021)', async () => {
    await renderApp();
    await createCollection('Synthetic Home');
    await capture('Synthetic lamp');
    await fireEvent.press(await screen.findByRole('button', { name: 'Done' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Inbox, Entries: 1' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Synthetic lamp' }));
    expect(await screen.findByText('Inbox')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Assign' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Wishlist' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Synthetic Home · Wishlist')).toBeOnTheScreen();
    expect(radio('Saved')).toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: 'Move to Inbox' }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
    buttons.find((button) => button.text === 'Move to Inbox')?.onPress?.();

    expect(await screen.findByRole('button', { name: 'Assign' })).toBeOnTheScreen();
    expect(screen.queryByRole('radiogroup', { name: 'Status' })).toBeNull();
  });

  it('asks for a collection before assigning when there is none', async () => {
    await renderApp();
    await capture('Synthetic idea');
    await fireEvent.press(await screen.findByRole('button', { name: 'Done' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Inbox (1)' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Synthetic idea' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Assign' }));

    expect(await screen.findByText('Create a collection first.')).toBeOnTheScreen();
  });
});

describe('default currency setting (O-010)', () => {
  it('prefills new prices with the chosen currency', async () => {
    await renderApp('/settings');
    expect(radio('Device region (none)')).toBeSelected();

    await fireEvent.press(radio('USD'));
    await waitFor(() => expect(radio('USD')).toBeSelected());

    await createCollection('Synthetic Home');
    await fireEvent.press(await screen.findByRole('button', { name: /^Synthetic Home/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'New entry' }));
    expect(await screen.findByLabelText('Currency')).toHaveDisplayValue('USD');
  });

  it('accepts any other currency code', async () => {
    await renderApp('/settings');

    await fireEvent.press(radio('Other'));
    await fireEvent.changeText(await screen.findByLabelText('Currency code'), 'chf');
    await fireEvent.press(screen.getByRole('button', { name: 'Save currency code' }));
    expect(screen.getByLabelText('Currency code')).toHaveDisplayValue('CHF');

    await fireEvent.changeText(screen.getByLabelText('Currency code'), 'C1');
    await fireEvent.press(screen.getByRole('button', { name: 'Save currency code' }));
    expect(await screen.findByText(/three-letter currency code/)).toBeOnTheScreen();
  });
});
