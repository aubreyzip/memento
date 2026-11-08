// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require('../with-no-os-backup');

const ALL_DOMAINS = [
  'root',
  'file',
  'database',
  'sharedpref',
  'external',
  'device_root',
  'device_file',
  'device_database',
  'device_sharedpref',
];

function excludedDomains(xml: string, section: string): string[] {
  const body = new RegExp(`<${section}>([\\s\\S]*?)</${section}>`).exec(xml)?.[1] ?? '';
  return [...body.matchAll(/<exclude domain="([a-z_]+)" path="\." \/>/g)].map((m) => m[1]);
}

describe('Android backup exclusion rules (O-018, SDD §12.4)', () => {
  it('lists every Android data domain', () => {
    expect(plugin.DOMAINS).toEqual(ALL_DOMAINS);
  });

  it.each(['cloud-backup', 'device-transfer'])(
    'excludes every domain from %s (allowBackup=false alone does not stop device transfer)',
    (section) => {
      expect(excludedDomains(plugin.dataExtractionRulesXml(), section)).toEqual(ALL_DOMAINS);
    },
  );

  it('contains no include rules', () => {
    expect(plugin.dataExtractionRulesXml()).not.toMatch(/<include/);
    expect(plugin.fullBackupContentXml()).not.toMatch(/<include/);
  });

  it('excludes every legacy domain for Android 11 and lower', () => {
    expect(excludedDomains(plugin.fullBackupContentXml(), 'full-backup-content')).toEqual([
      'root',
      'file',
      'database',
      'sharedpref',
      'external',
    ]);
  });
});
