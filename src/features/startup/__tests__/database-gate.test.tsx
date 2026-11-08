import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Text } from 'react-native';

import type { DatabaseStartResult } from '@/database/bootstrap/open-encrypted-database';
import type { ClosableSqlDatabase } from '@/database/connection/sql-database';

import { DatabaseGate } from '../database-gate';

// Startup screens render before settings are available: System language (O-044). Device: English.
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

const readyDb = { close: jest.fn() } as unknown as ClosableSqlDatabase;
const ready: DatabaseStartResult = { status: 'ready', db: readyDb, firstRun: false };

async function renderGate(...results: DatabaseStartResult[]) {
  const start = jest.fn<Promise<DatabaseStartResult>, []>();
  results.forEach((result) => start.mockResolvedValueOnce(result));
  const utils = await render(
    <DatabaseGate start={start}>{() => <Text>App content</Text>}</DatabaseGate>,
  );
  return { start, utils };
}

describe('DatabaseGate', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders the app once the database is ready', async () => {
    await renderGate(ready);
    expect(await screen.findByText('App content')).toBeOnTheScreen();
  });

  it('shows the recovery screen; Start fresh asks for confirmation before re-running startup', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { start } = await renderGate(
      { status: 'recovery', reason: 'key-missing', quarantined: ['memento.db.quarantine-x'] },
      ready,
    );

    expect(
      await screen.findByText("Your saved data can't be opened on this device"),
    ).toBeOnTheScreen();
    expect(screen.getByText(/has been kept, not deleted/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Start fresh' }));

    // Nothing happens until the user confirms.
    expect(start).toHaveBeenCalledTimes(1);
    const [title, , buttons] = alert.mock.calls[0];
    expect(title).toBe('Start fresh?');
    expect(buttons?.map((button) => button.text)).toEqual(['Cancel', 'Start fresh']);

    buttons?.[1].onPress?.();
    expect(await screen.findByText('App content')).toBeOnTheScreen();
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('cancelling the confirmation keeps the recovery screen', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { start } = await renderGate({
      status: 'recovery',
      reason: 'key-mismatch',
      quarantined: [],
    });

    await fireEvent.press(await screen.findByRole('button', { name: 'Start fresh' }));
    alert.mock.calls[0][2]?.[0].onPress?.();

    expect(start).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Start fresh' })).toBeOnTheScreen();
  });

  it.each([
    ['cipher-unavailable', /cannot encrypt your data/],
    ['key-store-unavailable', /Unlock your device/],
    ['newer-than-app', /newer version of Memento/],
  ] as const)('shows the %s error and retries on request', async (reason, message) => {
    const { start } = await renderGate({ status: 'error', reason }, ready);

    expect(await screen.findByText(message)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('App content')).toBeOnTheScreen();
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('treats an unexpected startup exception as an error, not as a crash', async () => {
    const start = jest.fn().mockRejectedValue(new Error('boom'));
    await render(<DatabaseGate start={start}>{() => <Text>App content</Text>}</DatabaseGate>);
    expect(await screen.findByText(/could not open its data/)).toBeOnTheScreen();
  });
});
