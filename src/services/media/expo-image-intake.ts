import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import type { ImageIntake } from '@/features/photos/ports';
import { bytesToHex } from '@/features/photos/media-cipher';

/** Deletes a file only inside the app's cache, where the picker and re-encoder write copies. */
function deleteCachedCopy(uri: string) {
  if (!uri.startsWith(Paths.cache.uri)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

/**
 * The system photo picker (library only: no camera, no media permission, O-031) and
 * re-encoding with `expo-image-manipulator` (O-059): decoded within the long edge and saved as
 * JPEG, which writes no EXIF or GPS metadata. The re-encoded file is read into memory and
 * deleted at once; only encrypted bytes reach permanent storage.
 */
export const expoImageIntake: ImageIntake = {
  async pick(limit) {
    const result = await launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: limit > 1,
      selectionLimit: limit,
      quality: 1,
      exif: false,
    });
    if (result.canceled) return [];
    return result.assets.map((asset) => ({
      uri: asset.uri,
      byteSize: asset.fileSize ?? new File(asset.uri).size ?? 0,
    }));
  },

  async prepare(image, longEdge, quality) {
    const context = ImageManipulator.manipulate(image.uri, {
      maxWidth: longEdge,
      maxHeight: longEdge,
    });
    try {
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });
      try {
        const bytes = await new File(saved.uri).bytes();
        const hash = await digest(CryptoDigestAlgorithm.SHA256, bytes);
        return {
          bytes,
          width: saved.width,
          height: saved.height,
          sha256: bytesToHex(new Uint8Array(hash)),
        };
      } finally {
        deleteCachedCopy(saved.uri);
        rendered.release();
      }
    } finally {
      context.release();
    }
  },

  async discard(image) {
    deleteCachedCopy(image.uri);
  },
};
