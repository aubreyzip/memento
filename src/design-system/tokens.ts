/**
 * Memento design tokens.
 *
 * Components must use the semantic tokens (`colors.light` / `colors.dark`), never raw hex values.
 * Source: PRD §10.2 (confirmed palette, decision D-004) and SDD §7.2 (semantic token names).
 *
 * Contrast is enforced by `__tests__/tokens.test.ts` (WCAG 2.x, 4.5:1 for text).
 */

/** The five confirmed palette colors (D-004). Do not add colors here without a decision. */
export const palette = {
  burgundy: '#5D2A42',
  coral: '#FB6376',
  softCoral: '#FCB1A6',
  peach: '#FFDCCC',
  cream: '#FFF9EC',
} as const;

export type ColorSchemeName = 'light' | 'dark';

export type SemanticColors = {
  /** App background. */
  background: string;
  /** Cards and secondary surfaces. */
  surface: string;
  /** Subtle highlights and supporting surfaces. Not a background for secondary text. */
  highlight: string;
  textPrimary: string;
  /** Secondary text; meets 4.5:1 on `background` and `surface`. */
  textSecondary: string;
  /** Primary buttons and strong icons. */
  primary: string;
  /** Text and icons placed on `primary`. */
  onPrimary: string;
  /**
   * Accent for emphasis and selected details. In the light theme it is below 3:1 on `background`,
   * so it must never be the only indicator of state and must not be used for text.
   */
  accent: string;
  border: string;
};

/** Light theme: confirmed palette; `textSecondary` is burgundy blended 80% over cream. */
const light: SemanticColors = {
  background: palette.cream,
  surface: palette.peach,
  highlight: palette.softCoral,
  textPrimary: palette.burgundy,
  textSecondary: '#7D5364',
  primary: palette.burgundy,
  onPrimary: palette.cream,
  accent: palette.coral,
  border: palette.softCoral,
};

/**
 * Dark theme: PROVISIONAL. Exact dark values are open decision O-004 and must be designed and
 * validated before dark-theme acceptance. Background and surface are burgundy-tinted near-blacks;
 * foregrounds reuse palette colors.
 */
const dark: SemanticColors = {
  background: '#1F1218',
  surface: '#2D1B23',
  highlight: palette.burgundy,
  textPrimary: palette.cream,
  textSecondary: '#BCB4AC',
  primary: palette.softCoral,
  onPrimary: '#1F1218',
  accent: palette.coral,
  border: palette.burgundy,
};

export const colors: Record<ColorSchemeName, SemanticColors> = { light, dark };

/** Spacing scale in density-independent pixels. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
