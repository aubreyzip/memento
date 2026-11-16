import { DomainError } from './errors';
import { codePoints, LIMITS } from './limits';
import { foldForSearch } from './search';

export type EntryLink = { id: string; url: string; title: string | null };
export type Tag = { id: string; name: string; normalizedName: string };

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const WEB_URL = /^https?:\/\/[^\s/?#]+[^\s]*$/i;

/**
 * Checks a link (DATABASE_DESIGN §3.6, O-027): web addresses only (`http`, `https`). An address
 * typed without a scheme ("example.com/page") gets `https://`.
 */
export function validateUrl(input: string): string {
  const trimmed = input.trim();
  const url = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!WEB_URL.test(url)) throw new DomainError('invalid-url');
  const normalized = url.replace(/^https?/i, (scheme) => scheme.toLowerCase());
  if (normalized.length > LIMITS.url) throw new DomainError('url-too-long', { max: LIMITS.url });
  return normalized;
}

/** Checks an entry's links: each valid, no duplicates, at most the per-entry limit. */
export function validateLinks(urls: readonly string[]): string[] {
  const unique = [...new Set(urls.map(validateUrl))];
  if (unique.length > LIMITS.linksPerEntry) {
    throw new DomainError('too-many-links', { max: LIMITS.linksPerEntry });
  }
  return unique;
}

/** A tag's display name: trimmed, inner whitespace collapsed, within the limit (O-027). */
export function validateTagName(input: string): string {
  const name = input.trim().replace(/\s+/g, ' ');
  if (name.length === 0) throw new DomainError('tag-required');
  if (codePoints(name) > LIMITS.tag) throw new DomainError('tag-too-long', { max: LIMITS.tag });
  return name;
}

/** The unique key of a tag: its search-folded name (O-026), so "Şule" and "sule" are one tag. */
export const normalizeTagName = (name: string) => foldForSearch(validateTagName(name));

/** Valid tag names with duplicates (by folded name) removed, first spelling kept. */
export function validateTagNames(names: readonly string[]): string[] {
  const byKey = new Map<string, string>();
  for (const raw of names) {
    const name = validateTagName(raw);
    const key = foldForSearch(name);
    if (!byKey.has(key)) byKey.set(key, name);
  }
  return [...byKey.values()];
}

/** Splits typed tag text on commas, ignoring empty pieces. */
export const splitTagInput = (text: string) =>
  text
    .split(',')
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);
