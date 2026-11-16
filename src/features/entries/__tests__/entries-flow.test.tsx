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

/** Presses the button with `label` in the most recent Alert. */
function confirmAlert(label: string) {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
  const button = buttons.find((b) => b.text === label);
  if (!button?.onPress) throw new Error(`No "${label}" button in the alert`);
  button.onPress();
}

const radio = (name: string) => screen.getByRole('radio', { name });

/** Opens a new collection and its "New entry" form. */
async function openNewEntryForm(collection = 'Synthetic Home') {
  await renderRouter('./src/app', { initialUrl: '/collections' });
  await fireEvent.press(await screen.findByRole('button', { name: 'New collection' }));
  await fireEvent.changeText(await screen.findByLabelText('Name'), collection);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await screen.findByRole('header', { name: collection });
  await fireEvent.press(screen.getByRole('button', { name: 'New entry' }));
  await screen.findByLabelText('Title');
}

/** Creates an entry in the first category (Wishlist) and opens it. */
async function createEntry(title: string) {
  await openNewEntryForm();
  await fireEvent.changeText(screen.getByLabelText('Title'), title);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await screen.findByRole('header', { name: title });
}

describe('entries (FR-040 to FR-047, O-021, O-022)', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('offers the fields of the chosen template and resets the status on a template change', async () => {
    await openNewEntryForm();

    expect(radio('Saved')).toBeSelected();
    await fireEvent.press(radio('Tasks & Repairs'));
    expect(radio('To do')).toBeSelected();
    expect(screen.queryByRole('radio', { name: 'Saved' })).toBeNull();

    await fireEvent.press(radio('General Notes'));
    expect(screen.queryByRole('radiogroup', { name: 'Status' })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Priority' })).toBeNull();
  });

  it('creates an entry and lists it in its collection', async () => {
    await openNewEntryForm();
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Synthetic tap');
    await fireEvent.press(radio('Tasks & Repairs'));
    await fireEvent.press(radio('High'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('header', { name: 'Synthetic tap' })).toBeOnTheScreen();
    expect(screen.getByText('Synthetic Home · Tasks & Repairs')).toBeOnTheScreen();
    expect(radio('To do')).toBeSelected();
    expect(screen.getByText('Priority: High')).toBeOnTheScreen();

    await act(() => router.back());
    expect(
      await screen.findByRole('button', { name: 'Synthetic tap, Tasks & Repairs, To do, High' }),
    ).toBeOnTheScreen();
  });

  it('shows a validation message instead of saving an empty title', async () => {
    await openNewEntryForm();

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a title.')).toBeOnTheScreen();
    expect(screen).toHavePathname('/entry/new');
  });

  it('changes the status and pins from the entry screen', async () => {
    await createEntry('Synthetic lamp');

    await fireEvent.press(radio('Purchased'));
    await waitFor(() => expect(radio('Purchased')).toBeSelected());

    await fireEvent.press(screen.getByRole('button', { name: 'Pin' }));
    expect(await screen.findByRole('button', { name: 'Unpin' })).toBeOnTheScreen();
    expect(screen.getByText('Pinned')).toBeOnTheScreen();
  });

  it('edits an entry', async () => {
    await createEntry('Synthetic lamp');

    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    await fireEvent.changeText(await screen.findByLabelText('Title'), 'Synthetic desk lamp');
    await fireEvent.press(radio('Low'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('header', { name: 'Synthetic desk lamp' })).toBeOnTheScreen();
    expect(screen.getByText('Priority: Low')).toBeOnTheScreen();
  });

  it('archives an entry out of the list and shows it among archived entries (O-025)', async () => {
    await createEntry('Synthetic lamp');

    await fireEvent.press(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('This entry is archived.')).toBeOnTheScreen();

    await act(() => router.back());
    expect(await screen.findByText('No entries yet.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Show archived entries' }));
    expect(
      screen.getByRole('button', { name: 'Synthetic lamp, Wishlist, Saved' }),
    ).toBeOnTheScreen();
  });

  it('asks before deleting an entry', async () => {
    await createEntry('Synthetic lamp');

    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(jest.mocked(Alert.alert).mock.calls.at(-1)?.[1]).toContain('"Synthetic lamp"');

    confirmAlert('Delete');
    expect(await screen.findByText('No entries yet.')).toBeOnTheScreen();
  });

  it('offers no new entries in an archived collection (O-025)', async () => {
    await openNewEntryForm('Synthetic Archive');
    await act(() => router.back());

    await fireEvent.press(await screen.findByRole('button', { name: 'Archive' }));

    expect(await screen.findByText(/This collection is archived/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'New entry' })).toBeNull();
  });
});
