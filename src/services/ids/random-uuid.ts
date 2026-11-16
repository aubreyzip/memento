import { randomUUID as expoRandomUUID } from 'expo-crypto';

/** Random v4 UUID for user-created rows (O-020), from the platform's secure generator. */
export function randomUUID(): string {
  return expoRandomUUID().toLowerCase();
}
