// O-018 (Android): exclude all Memento app data from OS cloud backup AND device-to-device
// transfer. `allowBackup="false"` alone does not stop device transfer on some devices
// (Android docs), so explicit data extraction rules are required (SDD §12.4).
// Prototype: experiments/phase-0/native-probe/plugins/withNoOsBackup.js.
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const EXTRACTION_RULES = 'memento_data_extraction_rules';
const FULL_BACKUP_RULES = 'memento_full_backup_content';

/** Every domain Android defines for data extraction rules (Android 12+). */
const DOMAINS = [
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
/** Domains valid in the legacy full-backup-content format (Android 11 and lower). */
const LEGACY_DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external'];

const excludeAll = (domains, indent) =>
  domains.map((domain) => `${indent}<exclude domain="${domain}" path="." />`).join('\n');

function dataExtractionRulesXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
${excludeAll(DOMAINS, '    ')}
  </cloud-backup>
  <device-transfer>
${excludeAll(DOMAINS, '    ')}
  </device-transfer>
</data-extraction-rules>
`;
}

function fullBackupContentXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
${excludeAll(LEGACY_DOMAINS, '  ')}
</full-backup-content>
`;
}

function withNoOsBackup(config) {
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${EXTRACTION_RULES}.xml`), dataExtractionRulesXml());
      fs.writeFileSync(path.join(dir, `${FULL_BACKUP_RULES}.xml`), fullBackupContentXml());
      return cfg;
    },
  ]);
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:allowBackup'] = 'false';
    app.$['android:dataExtractionRules'] = `@xml/${EXTRACTION_RULES}`;
    app.$['android:fullBackupContent'] = `@xml/${FULL_BACKUP_RULES}`;
    return cfg;
  });
}

module.exports = withNoOsBackup;
module.exports.dataExtractionRulesXml = dataExtractionRulesXml;
module.exports.fullBackupContentXml = fullBackupContentXml;
module.exports.DOMAINS = DOMAINS;
module.exports.LEGACY_DOMAINS = LEGACY_DOMAINS;
