import { Directory, File, Paths } from 'expo-file-system';

import { MEDIA_DIRECTORY } from '@/domain/attachments';
import type { MediaStore } from '@/features/photos/ports';

const TEMP_SUFFIX = '.tmp';

/** Where the picker and the re-encoder leave plaintext copies (their own cache folders). */
const PLAINTEXT_CACHE_FOLDERS = ['ImagePicker', 'ImageManipulator'];

const mediaDirectory = () => new Directory(Paths.document, MEDIA_DIRECTORY);

/** Accepts only generated `media/<name>` paths, so no other file can be reached. */
function mediaFileName(relativePath: string): string {
  const match = /^media\/([0-9a-z.-]+)$/.exec(relativePath);
  if (!match || match[1].includes('..')) throw new Error('Not a media path');
  return match[1];
}

/**
 * Encrypted photo files in the app's private documents directory, which Android backup and
 * device transfer exclude (O-018). Writes go to `<name>.tmp` first, then a rename.
 */
export const expoMediaStore: MediaStore = {
  async write(relativePath, bytes) {
    const name = mediaFileName(relativePath);
    const dir = mediaDirectory();
    dir.create({ intermediates: true, idempotent: true });
    const temp = new File(dir, `${name}${TEMP_SUFFIX}`);
    if (temp.exists) temp.delete();
    await temp.write(bytes);
    const target = new File(dir, name);
    if (target.exists) target.delete();
    await temp.move(target);
  },

  async read(relativePath) {
    const file = new File(mediaDirectory(), mediaFileName(relativePath));
    return file.exists ? file.bytes() : null;
  },

  async remove(relativePath) {
    const file = new File(mediaDirectory(), mediaFileName(relativePath));
    if (file.exists) file.delete();
  },

  async purgeTemporary() {
    const dir = mediaDirectory();
    if (dir.exists) {
      for (const item of dir.list()) {
        if (item instanceof File && item.name.endsWith(TEMP_SUFFIX)) item.delete();
      }
    }
    for (const folder of PLAINTEXT_CACHE_FOLDERS) {
      const cache = new Directory(Paths.cache, folder);
      if (cache.exists) cache.delete();
    }
  },
};
