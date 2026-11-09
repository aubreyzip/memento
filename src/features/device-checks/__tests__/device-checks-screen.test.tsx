import { render, screen } from '@testing-library/react-native';

import { DeviceChecksScreen, LOG_PREFIX } from '../device-checks-screen';
import type { DeviceCheckEnv, DeviceCheckResult } from '../run-device-checks';

jest.mock('../run-device-checks', () => ({
  ...jest.requireActual('../run-device-checks'),
  runDeviceChecks: jest.fn(),
}));
const { runDeviceChecks } = jest.requireMock('../run-device-checks');

const results: DeviceCheckResult[] = [
  { id: 'cipher-version', gate: 'G1', ok: true, detail: 'SQLCipher 4.x' },
  { id: 'encrypted-at-rest', gate: 'G1', ok: false, detail: 'plaintext found' },
];

describe('DeviceChecksScreen', () => {
  it('shows each result in words and logs it with the collection prefix', async () => {
    runDeviceChecks.mockResolvedValue(results);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const createEnv = jest.fn(() => ({}) as DeviceCheckEnv);

    await render(<DeviceChecksScreen createEnv={createEnv} />);

    expect(await screen.findByText('Some checks failed')).toBeOnTheScreen();
    expect(screen.getByText('PASS')).toBeOnTheScreen();
    expect(screen.getByText('FAIL')).toBeOnTheScreen();
    expect(log).toHaveBeenCalledWith(`${LOG_PREFIX} ${JSON.stringify(results[0])}`);
    expect(log).toHaveBeenCalledWith(`${LOG_PREFIX} ${JSON.stringify({ summary: 'FAIL' })}`);
    log.mockRestore();
  });
});
