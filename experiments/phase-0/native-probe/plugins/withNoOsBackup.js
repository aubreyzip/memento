// Phase 0 candidate for O-018 (Android). Excludes all app data from cloud backup AND
// device-to-device transfer (Android 12+), plus the legacy rules for Android 11 and lower.
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref'];
const excludes = (indent) => DOMAINS.map((d) => `${indent}<exclude domain="${d}" path="." />`).join('\n');
const DATA_EXTRACTION = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
${excludes('    ')}
  </cloud-backup>
  <device-transfer>
${excludes('    ')}
  </device-transfer>
</data-extraction-rules>
`;
const LEGACY_DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external'];
const FULL_BACKUP = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
${LEGACY_DOMAINS.map((d) => `  <exclude domain="${d}" path="." />`).join('\n')}
</full-backup-content>
`;

module.exports = function withNoOsBackup(config) {
  config = withDangerousMod(config, ['android', (cfg) => {
    const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'memento_data_extraction_rules.xml'), DATA_EXTRACTION);
    fs.writeFileSync(path.join(dir, 'memento_full_backup_content.xml'), FULL_BACKUP);
    return cfg;
  }]);
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:allowBackup'] = 'false';
    app.$['android:dataExtractionRules'] = '@xml/memento_data_extraction_rules';
    app.$['android:fullBackupContent'] = '@xml/memento_full_backup_content';
    return cfg;
  });
};
