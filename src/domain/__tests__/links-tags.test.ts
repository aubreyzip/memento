import { LIMITS } from '../limits';
import {
  normalizeTagName,
  splitTagInput,
  validateLinks,
  validateTagNames,
  validateUrl,
} from '../links-tags';

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
};

describe('links (DATABASE_DESIGN §3.6, O-027)', () => {
  it('accepts web addresses and adds https:// when no scheme is typed', () => {
    expect(validateUrl(' https://example.com/a?b=1 ')).toBe('https://example.com/a?b=1');
    expect(validateUrl('HTTP://example.com')).toBe('http://example.com');
    expect(validateUrl('example.com/page')).toBe('https://example.com/page');
  });

  it.each(['ftp://example.com', 'javascript://alert(1)', 'file:///etc/hosts', 'https://', 'a b'])(
    'rejects %s',
    (url) => {
      expect(code(() => validateUrl(url))).toBe('invalid-url');
    },
  );

  it('enforces the URL length and per-entry limits', () => {
    const long = `https://example.com/${'a'.repeat(LIMITS.url)}`;
    expect(code(() => validateUrl(long))).toBe('url-too-long');

    const many = Array.from({ length: LIMITS.linksPerEntry + 1 }, (_, i) => `example.com/${i}`);
    expect(code(() => validateLinks(many))).toBe('too-many-links');
    expect(validateLinks(['example.com', 'https://example.com'])).toEqual(['https://example.com']);
  });
});

describe('tags (O-026, O-027)', () => {
  it('merges names that fold to the same key, keeping the first spelling', () => {
    expect(validateTagNames(['Şule', 'sule', ' ŞULE ', 'İzmir', 'izmir'])).toEqual([
      'Şule',
      'İzmir',
    ]);
    expect(normalizeTagName('  Yaz   Tatili ')).toBe('yaz tatili');
  });

  it('rejects empty and over-long tags', () => {
    expect(code(() => validateTagNames(['  ']))).toBe('tag-required');
    expect(code(() => validateTagNames(['x'.repeat(LIMITS.tag + 1)]))).toBe('tag-too-long');
  });

  it('splits typed text on commas', () => {
    expect(splitTagInput('gift, birthday ,, ')).toEqual(['gift', 'birthday']);
  });
});
