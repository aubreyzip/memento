/** Combining marks left after NFKD decomposition (Unicode combining-mark blocks). */
const COMBINING_MARKS = /[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]/g;

/**
 * Search folding (O-026): NFKD, strip marks, fold the Turkish `İ I ı i` to `i`, lowercase. The
 * same fold applies to stored text, queries, and tag names, so "Şule", "sule", and "ŞULE" match.
 */
export function foldForSearch(text: string): string {
  return text.normalize('NFKD').replace(COMBINING_MARKS, '').replace(/[Iı]/g, 'i').toLowerCase();
}

/** The stored search column for an entry: its folded text fields, one per line. */
export function entrySearchText(fields: readonly (string | null | undefined)[]): string {
  return foldForSearch(fields.filter((field) => field).join('\n'));
}
