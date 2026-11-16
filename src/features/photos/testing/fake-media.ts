import { createHash, randomBytes } from 'node:crypto';

import { ascii, createMediaCipher } from '../media-cipher';
import type { ImageIntake, MediaPorts, MediaStore, PickedImage } from '../ports';

import { nodeAesGcm } from './node-aes-gcm';

/** Synthetic image content; tests look for it to prove files on disk are not plaintext. */
export const fakeImageBytes = (uri: string, longEdge: number) =>
  ascii(`SYNTHETIC-JPEG|${uri}|${longEdge}|${'x'.repeat(64)}`);

export class MemoryMediaStore implements MediaStore {
  readonly files = new Map<string, Uint8Array>();
  failWrites = false;
  purges = 0;

  async write(relativePath: string, bytes: Uint8Array) {
    if (this.failWrites) throw new Error('disk full');
    this.files.set(relativePath, bytes.slice());
  }
  async read(relativePath: string) {
    return this.files.get(relativePath) ?? null;
  }
  async remove(relativePath: string) {
    this.files.delete(relativePath);
  }
  async purgeTemporary() {
    this.purges++;
  }
}

/** The picker returns what tests queue with `queue`; prepare yields synthetic JPEG bytes. */
export class FakeImageIntake implements ImageIntake {
  private next: PickedImage[] = [];
  readonly discarded: string[] = [];
  readonly failing = new Set<string>();
  lastLimit: number | null = null;

  queue(...images: PickedImage[]) {
    this.next = images;
  }
  async pick(limit: number) {
    this.lastLimit = limit;
    const picked = this.next;
    this.next = [];
    return picked;
  }
  async prepare(image: PickedImage, longEdge: number) {
    if (this.failing.has(image.uri)) throw new Error('cannot decode');
    const bytes = fakeImageBytes(image.uri, longEdge);
    return {
      bytes,
      width: longEdge,
      height: Math.round(longEdge * 0.75),
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }
  async discard(image: PickedImage) {
    this.discarded.push(image.uri);
  }
}

/** Real AES-GCM (Node) with an in-memory store and a scripted picker. */
export function createFakeMediaPorts(key: Uint8Array = new Uint8Array(randomBytes(32))) {
  const store = new MemoryMediaStore();
  const intake = new FakeImageIntake();
  const ports: MediaPorts = {
    cipher: createMediaCipher(nodeAesGcm, async () => key),
    store,
    intake,
  };
  return { ports, store, intake, key };
}
