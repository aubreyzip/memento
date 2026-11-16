import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import type { createFakeMediaPorts } from '../testing/fake-media';

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

// Photos use real AES-GCM (Node) with an in-memory store and a scripted picker.
let mockMedia: ReturnType<typeof createFakeMediaPorts>;
jest.mock('../../../services/media/device-media', () => ({
  createDeviceMediaPorts: () => {
    const { createFakeMediaPorts } = jest.requireActual('../testing/fake-media');
    mockMedia = createFakeMediaPorts();
    return mockMedia.ports;
  },
}));

const MB = 1024 * 1024;

/** Opens a fresh Inbox entry through Quick Capture and the Inbox. */
async function openEntry(title = 'Synthetic gift') {
  await renderRouter('./src/app', { initialUrl: '/' });
  await fireEvent.press(await screen.findByRole('button', { name: 'Quick Add' }));
  await fireEvent.changeText(await screen.findByLabelText('Title'), title);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Done' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Inbox (1)' }));
  await fireEvent.press(await screen.findByRole('button', { name: title }));
  await screen.findByRole('header', { name: title });
}

describe('photos on entries (FR-049, FR-050)', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('purges temporary photo files when the app starts (SDD §9)', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByLabelText('Home');
    expect(mockMedia.store.purges).toBe(1);
  });

  it('adds photos from the library and shows their thumbnails', async () => {
    await openEntry();
    expect(screen.getByRole('header', { name: 'Photos (0 of 10)' })).toBeOnTheScreen();

    mockMedia.intake.queue({ uri: 'a.jpg', byteSize: 1000 }, { uri: 'b.jpg', byteSize: 1000 });
    await fireEvent.press(screen.getByRole('button', { name: 'Add photos' }));

    expect(await screen.findByRole('header', { name: 'Photos (2 of 10)' })).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Photo 1 of 2' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Photo 2 of 2' })).toBeOnTheScreen();
    expect(mockMedia.intake.lastLimit).toBe(10);
  });

  it('says which photos were too large', async () => {
    await openEntry();
    mockMedia.intake.queue({ uri: 'huge.jpg', byteSize: 25 * MB });

    await fireEvent.press(screen.getByRole('button', { name: 'Add photos' }));

    expect(
      await screen.findByText('Photos larger than 20 MB were not added (skipped: 1).'),
    ).toBeOnTheScreen();
  });

  it('opens a photo and deletes it after confirmation', async () => {
    await openEntry();
    mockMedia.intake.queue({ uri: 'a.jpg', byteSize: 1000 });
    await fireEvent.press(screen.getByRole('button', { name: 'Add photos' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Photo 1 of 1' }));

    expect(await screen.findByLabelText('Photo')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete photo' }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
    await act(async () => {
      await buttons.find((button) => button.text === 'Delete')?.onPress?.();
    });

    expect(await screen.findByRole('header', { name: 'Photos (0 of 10)' })).toBeOnTheScreen();
    expect(mockMedia.store.files.size).toBe(0);
  });

  it('removes photo files when the entry is deleted', async () => {
    await openEntry();
    mockMedia.intake.queue({ uri: 'a.jpg', byteSize: 1000 });
    await fireEvent.press(screen.getByRole('button', { name: 'Add photos' }));
    await screen.findByRole('button', { name: 'Photo 1 of 1' });
    expect(mockMedia.store.files.size).toBe(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
    await act(async () => {
      await buttons.find((button) => button.text === 'Delete')?.onPress?.();
    });

    await waitFor(() => expect(mockMedia.store.files.size).toBe(0));
  });

  it('shows a placeholder for a photo that cannot be opened', async () => {
    await openEntry();
    mockMedia.intake.queue({ uri: 'a.jpg', byteSize: 1000 });
    await fireEvent.press(screen.getByRole('button', { name: 'Add photos' }));
    await screen.findByRole('button', { name: 'Photo 1 of 1' });
    for (const path of mockMedia.store.files.keys()) mockMedia.store.files.delete(path);

    await fireEvent.press(screen.getByRole('button', { name: 'Photo 1 of 1' }));

    expect(await screen.findByText("This photo can't be opened on this device.")).toBeOnTheScreen();
  });
});
