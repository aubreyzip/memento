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

async function renderApp(initialUrl: string) {
  await renderRouter('./src/app', { initialUrl });
  await screen.findByLabelText('Home');
}

/** Presses the button with `label` in the most recent Alert. */
function confirmAlert(label: string) {
  const alert = jest.mocked(Alert.alert);
  const buttons = alert.mock.calls.at(-1)?.[2] ?? [];
  const button = buttons.find((b) => b.text === label);
  if (!button?.onPress) throw new Error(`No "${label}" button in the alert`);
  button.onPress();
}

async function openCatalog() {
  await renderApp('/collections');
  await fireEvent.press(await screen.findByRole('button', { name: 'Types & categories' }));
}

async function createCollection(name: string) {
  await fireEvent.press(await screen.findByRole('button', { name: 'New collection' }));
  await fireEvent.changeText(await screen.findByLabelText('Name'), name);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  // Saving opens the new collection.
  await screen.findByRole('header', { name });
}

describe('collections (FR-010, FR-013, FR-016)', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('starts empty and creates a collection with the first active type', async () => {
    await renderApp('/collections');
    expect(await screen.findByText(/No collections yet/)).toBeOnTheScreen();

    await createCollection('Synthetic Person');

    expect(screen.getByText('Person')).toBeOnTheScreen();
    expect(screen).toHavePathname(expect.stringMatching(/^\/collection\/[0-9a-f-]{36}$/));
  });

  it('shows a validation message instead of saving an empty name', async () => {
    await renderApp('/collections');
    await fireEvent.press(await screen.findByRole('button', { name: 'New collection' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a name.')).toBeOnTheScreen();
    expect(screen).toHavePathname('/collection/new');
  });

  it('edits a collection', async () => {
    await renderApp('/collections');
    await createCollection('Synthetic Home');

    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Synthetic Flat');
    await fireEvent.press(screen.getByRole('radio', { name: 'Space' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('header', { name: 'Synthetic Flat' })).toBeOnTheScreen();
    expect(screen.getByText('Space')).toBeOnTheScreen();
  });

  it('archives and restores a collection (O-025)', async () => {
    await renderApp('/collections');
    await createCollection('Synthetic Project');

    await fireEvent.press(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText(/This collection is archived/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(screen.queryByText(/This collection is archived/)).toBeNull());
  });

  it('asks before deleting and reports the entry count', async () => {
    await renderApp('/collections');
    await createCollection('Synthetic Event');

    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const [title, body] = jest.mocked(Alert.alert).mock.calls.at(-1)!;
    expect(title).toBe('Delete this collection?');
    expect(body).toContain('"Synthetic Event"');
    expect(body).toContain('entries: 0');

    confirmAlert('Delete');
    await waitFor(() =>
      expect(screen.queryByRole('header', { name: 'Synthetic Event' })).toBeNull(),
    );
  });
});

describe('types and categories (FR-012, FR-021, FR-027)', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('lists built-ins with their badges', async () => {
    await openCatalog();

    expect(await screen.findByRole('button', { name: 'Person, Built-in' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Wishlist, Wishlist, Built-in' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Move Person up' })).toBeDisabled();
  });

  it('reorders a type with the move buttons', async () => {
    await openCatalog();

    await fireEvent.press(await screen.findByRole('button', { name: 'Move Space up' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move Space up' })).toBeDisabled(),
    );
  });

  it('creates a custom category with a template', async () => {
    await openCatalog();
    await fireEvent.press(await screen.findByRole('button', { name: 'New category' }));

    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Synthetic Books');
    await fireEvent.press(screen.getByRole('radio', { name: 'Task' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Synthetic Books, Task' })).toBeOnTheScreen();
  });

  it('does not offer renaming or deleting a built-in', async () => {
    await openCatalog();
    await fireEvent.press(await screen.findByRole('button', { name: 'Person, Built-in' }));

    expect(await screen.findByText('Built-in names cannot be changed.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeOnTheScreen();
  });

  it('refuses to delete a custom type that is in use', async () => {
    await openCatalog();
    await fireEvent.press(await screen.findByRole('button', { name: 'New type' }));
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Synthetic Pets');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('button', { name: 'Synthetic Pets' });

    // Use the type for a collection.
    await act(() => router.back());
    await fireEvent.press(await screen.findByRole('button', { name: 'New collection' }));
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Synthetic Cat');
    await fireEvent.press(screen.getByRole('radio', { name: 'Synthetic Pets' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('header', { name: 'Synthetic Cat' });

    // Back to the type and try to delete it.
    await act(() => router.back());
    await fireEvent.press(await screen.findByRole('button', { name: 'Types & categories' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Synthetic Pets' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete' }));
    confirmAlert('Delete');

    expect(await screen.findByText(/still in use, so it cannot be deleted/)).toBeOnTheScreen();
  });
});
