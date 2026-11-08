import { contrastRatio } from '../contrast';
import { colors, palette } from '../tokens';

describe('palette', () => {
  it('matches the confirmed five-color palette (D-004)', () => {
    expect(Object.values(palette)).toEqual(['#5D2A42', '#FB6376', '#FCB1A6', '#FFDCCC', '#FFF9EC']);
  });

  it('light theme uses only palette colors, except the documented derived textSecondary', () => {
    const allowed = new Set<string>([...Object.values(palette), '#7D5364']);
    for (const value of Object.values(colors.light)) {
      expect(allowed.has(value)).toBe(true);
    }
  });
});

describe.each(['light', 'dark'] as const)('%s theme text contrast (WCAG 4.5:1)', (scheme) => {
  const c = colors[scheme];
  it.each([
    ['textPrimary on background', c.textPrimary, c.background],
    ['textPrimary on surface', c.textPrimary, c.surface],
    ['textSecondary on background', c.textSecondary, c.background],
    ['textSecondary on surface', c.textSecondary, c.surface],
    ['onPrimary on primary', c.onPrimary, c.primary],
  ])('%s', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white and 1 for identical colors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#5D2A42', '#5D2A42')).toBe(1);
  });

  it('rejects non-hex input', () => {
    expect(() => contrastRatio('red', '#FFFFFF')).toThrow();
  });
});
