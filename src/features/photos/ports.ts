import type { MediaCipher } from './media-cipher';

/** A photo chosen in the system picker, still in the picker's temporary copy. */
export type PickedImage = { uri: string; byteSize: number };

/** A re-encoded image (JPEG, metadata dropped, long edge capped), held in memory only. */
export type PreparedImage = {
  bytes: Uint8Array;
  width: number;
  height: number;
  /** SHA-256 of `bytes`, lowercase hex. */
  sha256: string;
};

/** The system photo picker and re-encoding (O-031, O-059); library only, no camera. */
export interface ImageIntake {
  /** Opens the picker for up to `limit` photos; an empty list when cancelled. */
  pick(limit: number): Promise<PickedImage[]>;
  /** Re-encodes to JPEG within `longEdge`, removing any temporary file it wrote. */
  prepare(image: PickedImage, longEdge: number, quality: number): Promise<PreparedImage>;
  /** Removes the picker's temporary copy of the image, if the app owns it. */
  discard(image: PickedImage): Promise<void>;
}

/** Encrypted files in app-private storage, by path relative to the documents directory. */
export interface MediaStore {
  /** Writes through a temporary file and a rename, so a file is complete or absent. */
  write(relativePath: string, bytes: Uint8Array): Promise<void>;
  /** The file's bytes, or null when it is missing. */
  read(relativePath: string): Promise<Uint8Array | null>;
  /** Deletes the file if it exists. */
  remove(relativePath: string): Promise<void>;
  /**
   * Deletes interrupted writes and the plaintext temporary files of the picker and the image
   * re-encoder (SDD §9). Never deletes complete encrypted files.
   */
  purgeTemporary(): Promise<void>;
}

export type MediaPorts = { cipher: MediaCipher; store: MediaStore; intake: ImageIntake };
