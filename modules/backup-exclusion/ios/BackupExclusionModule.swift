import ExpoModulesCore
import Foundation

// O-039: marks a file or directory as excluded from iCloud and device backups.
// Apple: a directory's flag covers its contents; the flag is guidance, not a guarantee, and some
// file operations reset it, so the app re-applies it at every startup. Not yet run on a device
// (gate G6).
public class BackupExclusionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackupExclusion")

    // Sets isExcludedFromBackup on `path` (a plain file-system path, no file:// prefix) and
    // returns the value read back afterwards.
    AsyncFunction("excludeFromBackupAsync") { (path: String) -> Bool in
      var url = URL(fileURLWithPath: path)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try url.setResourceValues(values)
      return try url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup ?? false
    }
  }
}
