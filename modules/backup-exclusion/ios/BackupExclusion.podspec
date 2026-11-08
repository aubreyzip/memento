# Local Expo module (O-039). Generated from expo-module-template 58.0.9 (local variant).
Pod::Spec.new do |s|
  s.name           = 'BackupExclusion'
  s.version        = '1.0.0'
  s.summary        = 'Excludes Memento data directories from iOS backups'
  s.description    = 'Sets URLResourceValues.isExcludedFromBackup on app data directories (decision O-039).'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
